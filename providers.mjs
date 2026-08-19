// ══════════════════════════════════════════════════════════════════════════════════════════════
// providers.mjs — talking to a model you pay for, with your own key.
//
// The key lives in your browser and is sent to exactly one place: the host that issued it. It never
// reaches this site, because this site has no server to reach.
//
// ⚑ A KEY GOES TO ITS OWN PROVIDER OR IT GOES NOWHERE. This is the whole of the security here and it
// is enforced rather than promised: the host is baked into the provider, the caller cannot pass one
// in, and `callFor` refuses any provider it does not recognise. A bug that let an Anthropic key be
// posted to some other origin would be the single worst thing this client could do, so the URL is
// never assembled from anything a caller controls.
//
// ⚑ AND IT NEVER QUIETLY SWAPS PROVIDER. If the one you asked for fails, that is the answer. Falling
// back to a different model — or a different company — because the first one erred is how somebody
// ends up billed by a service they never signed up to, on a request they never saw.
//
// The pure parts are here: building a call, and reading a reply. The fetch itself is the caller's,
// which keeps everything worth gating gateable.
// ══════════════════════════════════════════════════════════════════════════════════════════════

import { text, num, list, field, isThing } from './safe.mjs';

/** Every provider this client knows, with the ONE host each key may ever be sent to. */
export const PROVIDERS = Object.freeze({
  anthropic: Object.freeze({
    id: 'anthropic', name: 'Claude', host: 'api.anthropic.com',
    model: 'claude-fable-5',   // the frontier rung — Fable, wired into the didy by name
    keyLooksLike: /^sk-ant-/,
    where: 'console.anthropic.com',
  }),
  google: Object.freeze({
    id: 'google', name: 'Gemini', host: 'generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash',
    keyLooksLike: /^AIza/,
    where: 'aistudio.google.com',
  }),
});

export const providerOf = (id) => PROVIDERS[String(id)] || null;


/**
 * Does this look like a key for this provider? A warning, never a gate — providers change their
 * formats and refusing a valid key because it did not match a pattern is worse than a soft note.
 */
export function looksRight(providerId, key) {
  const p = providerOf(providerId);
  const k = text(key).trim();
  if (!p) return { ok: false, why: 'that is not a provider this client knows' };
  if (k.length < 9) return { ok: false, why: 'that is too short to be a key' };
  if (!p.keyLooksLike.test(k)) {
    return { ok: true, warn: `${p.name} keys usually start differently — check you have not pasted the wrong one` };
  }
  return { ok: true };
}

/**
 * Build the call. Returns everything the caller needs to fetch, and nothing it could get wrong:
 * the URL is assembled here from the provider's own baked-in host.
 */
export function buildCall(providerId, key, { system = '', user = '', maxTokens = 700 } = {}) {
  const p = providerOf(providerId);
  if (!p) throw new Error(`no such provider: ${text(providerId)}`);
  const k = text(key).trim();
  if (!k) throw new Error(`no ${p.name} key`);
  const sys = text(system);
  const msg = text(user);

  if (p.id === 'anthropic') {
    return {
      url: `https://${p.host}/v1/messages`,
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': k,
          'anthropic-version': '2023-06-01',
          // Required for a browser to call the API directly. Without it the request is refused by
          // CORS and the failure looks like a network fault rather than a missing header.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: p.model, max_tokens: maxTokens,
          ...(sys ? { system: sys } : {}),
          messages: [{ role: 'user', content: msg }],
        }),
      },
    };
  }

  // Google takes the key in the query string, which is their design, not a choice made here.
  return {
    url: `https://${p.host}/v1beta/models/${p.model}:generateContent?key=${encodeURIComponent(k)}`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: msg }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  };
}

/** Read a reply. Returns the text, or says plainly that there was none — never an empty success. */
export function readReply(providerId, body) {
  const p = providerOf(providerId);
  if (!p) return { ok: false, why: 'no such provider' };
  const b = (body && typeof body === 'object') ? body : {};

  // An error body is an error even when the transport said 200. Reading past it and returning ''
  // would show the visitor a blank answer and no reason for it.
  const err = b.error;
  if (err) {
    // A bare code is not a reason. "401" alone in a chat box tells a person nothing they can act
    // on, so whatever the provider gave us is wrapped in a sentence rather than shown raw.
    const said = text(err && (err.message || err.status || err.code));
    return { ok: false, why: said ? `${p.name} returned an error: ${said}` : `${p.name} returned an error with nothing in it` };
  }

  let out = '';
  if (p.id === 'anthropic') {
    const parts = Array.isArray(b.content) ? b.content : [];
    out = parts.filter(x => x && x.type === 'text').map(x => text(x.text)).join('').trim();
  } else {
    const cand = (Array.isArray(b.candidates) ? b.candidates : [])[0] || {};
    const parts = (cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
    out = parts.map(x => text(x && x.text)).join('').trim();
    // A reply cut off by a safety filter or a token cap is not a reply; saying so beats a fragment.
    if (!out && cand.finishReason) return { ok: false, why: `the model stopped: ${text(cand.finishReason)}` };
  }

  if (!out) return { ok: false, why: 'the provider answered, but with no text in it' };
  return { ok: true, text: out };
}

/**
 * ⚑ THE CHECK THAT MATTERS. Given a built call, confirm it is going to the provider's own host and
 * nowhere else. Cheap to run right before the fetch, and it is the difference between a key that
 * stays where it belongs and one that does not.
 */
export function goingTo(providerId, url) {
  const p = providerOf(providerId);
  if (!p) return { ok: false, why: 'no such provider' };
  let host = null;
  try { host = new URL(text(url)).host; } catch { return { ok: false, why: 'that is not a URL' }; }
  if (host !== p.host) {
    return { ok: false, why: `refusing to send a ${p.name} key to ${host} — it may only go to ${p.host}` };
  }
  return { ok: true, host };
}

/** What a caller should do with a failed HTTP status, in words a person can act on. */
export function explainStatus(providerId, status) {
  const p = providerOf(providerId);
  const name = p ? p.name : 'the provider';
  const s = Number(status);
  if (s === 401 || s === 403) return `${name} did not accept that key. Check it, or make a new one at ${p ? p.where : 'the provider'}.`;
  if (s === 429) return `${name} is rate-limiting you. Wait a moment and try again — nothing was charged for a refused call.`;
  if (s === 400) return `${name} refused the request as malformed. That is this client's fault, not yours.`;
  if (s >= 500) return `${name} is having trouble at their end. Nothing was sent anywhere else.`;
  return `${name} answered ${s}.`;
}
