// ══════════════════════════════════════════════════════════════════════════════════════════════
// runtime.mjs — the part that makes a grant a wall instead of a label.
//
// Until now an addon's permissions were a list on a card. A list is a promise, and a promise made
// by the thing you are trying to contain is worth nothing. This is the judge that actually sits
// between an addon and everything it might want to touch.
//
// HOW IT IS BOXED, in the page: the addon runs inside a sandboxed frame whose content policy allows
// it no network of its own at all — it cannot fetch, cannot load an image, cannot open a socket. It
// has no DOM here, no storage, no keys. The ONLY thing it can do is ask the host, by message, and
// every ask comes through this file first.
//
// ⚑ AN ASK OUTSIDE THE GRANT IS REFUSED, NOT LOGGED AND ALLOWED. The common shape — warn and
// continue — is not containment, it is a diary of things that already happened.
//
// ⚑ AND EVERY REFUSAL IS KEPT. Every permission system shows you what an addon was ALLOWED. None of
// them shows you what it TRIED. An addon that asks, once, for something outside its grant might be
// a bug; one that asks forty times is telling you exactly what it was built to do, and that is the
// single most useful signal available about a thing you did not write.
//
// ⚑ THE GRANT IS THE ONE FROM INSTALL TIME. An addon cannot widen its own grant by asking, and it
// cannot widen it by updating itself either — a new reach is a new decision, made by the person, at
// the moment they can see it next to everything else already installed.
//
// Pure and total: no clock, no I/O, no randomness.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** What an addon can ask the host to do. One name per real capability, and no others exist. */
export const ASKS = Object.freeze({
  read: 'read your notes and memory',
  write: 'change files on your machine',
  net: 'reach the internet',
  spend: 'spend from your budget',
  publish: 'put things where other people can see them',
  run: 'run other programs',
});
const NAMES = Object.keys(ASKS);

/** Asks that are always refused, whatever the grant says, because no addon has any business here. */
export const NEVER = Object.freeze({
  keys: 'read your API keys',
  grant: 'change its own permissions',
  install: 'install another addon',
});
const NEVER_NAMES = Object.keys(NEVER);

const text = (v) => { try { return String(v ?? ''); } catch { return ''; } };

/**
 * Judge one ask against the grant given at install time. Returns a decision, never a suggestion —
 * the caller is expected to act on `allow` and nothing else.
 */
export function judge(ask, grant) {
  const what = text(ask && typeof ask === 'object' ? ask.what : ask);
  const held = new Set(Array.isArray(grant) ? grant.map(text) : []);

  // ⚑ Checked FIRST, so a grant that somehow contains one of these still cannot buy it. A rule that
  // can be unlocked by widening a list is not a rule.
  if (NEVER_NAMES.includes(what)) {
    return { allow: false, what, why: `no addon may ${NEVER[what]}, whatever its grant says`, never: true };
  }
  if (!NAMES.includes(what)) {
    return { allow: false, what, why: `"${what || 'nothing'}" is not something an addon can ask for`, unknown: true };
  }
  if (!held.has(what)) {
    return { allow: false, what, why: `it did not ask for permission to ${ASKS[what]} when you installed it` };
  }
  return { allow: true, what, why: `you allowed it to ${ASKS[what]}` };
}

/** A fresh record of what one addon has actually tried. */
export function watch(id, grant) {
  return {
    id: text(id),
    grant: Object.freeze((Array.isArray(grant) ? grant : []).map(text).filter(g => NAMES.includes(g))),
    asks: [],
  };
}

/**
 * Put one ask through the judge and remember it. Returns the decision; the caller acts on it.
 * `at` is a caller-supplied ordinal, because this file has no clock.
 */
export function ask(w, request, at) {
  const rec = (w && typeof w === 'object' && Array.isArray(w.asks)) ? w : watch('unknown', []);
  const d = judge(request, rec.grant);
  rec.asks.push({
    what: d.what,
    allowed: d.allow,
    why: d.why,
    at: Number.isFinite(at) ? at : rec.asks.length,
    // Kept so a refusal can be shown with what it was actually after, not just its category.
    // Read through a shield rather than a type-check: a request whose `detail` getter throws must
    // not take the wall down, and the shield makes the check in front of it dead code anyway.
    detail: (() => { try { return text(request.detail); } catch { return ''; } })(),
  });
  return d;
}

/**
 * What this addon has been doing. The refused list is the point: it is the only place you can see
 * what a thing you did not write was built to want.
 */
export function report(w) {
  const rec = (w && typeof w === 'object' && Array.isArray(w.asks)) ? w : watch('unknown', []);
  const refused = rec.asks.filter(a => !a.allowed);
  const byWhat = {};
  for (const a of refused) byWhat[a.what] = (byWhat[a.what] || 0) + 1;
  const worst = Object.entries(byWhat).sort((a, b) => b[1] - a[1])[0] || null;

  // Reaching for something it was never granted, over and over, is not an accident.
  const persistent = Object.entries(byWhat).filter(([, n]) => n >= 3).map(([w2]) => w2);
  const forbidden = refused.filter(a => NEVER_NAMES.includes(a.what)).map(a => a.what);

  return {
    id: rec.id,
    grant: rec.grant,
    tried: rec.asks.length,
    allowed: rec.asks.length - refused.length,
    refused: refused.length,
    byWhat,
    persistent,
    forbidden: [...new Set(forbidden)],
    // ⚑ Nothing tried is not a clean bill of health — it is an addon you have not run yet.
    verdict: !rec.asks.length ? 'This has not asked for anything yet, which is not the same as it being harmless.'
      : forbidden.length ? `It tried to ${forbidden.map(f => NEVER[f]).join(' and ')}. Nothing is ever allowed to do that. Remove it.`
      : persistent.length ? `It has repeatedly tried to ${persistent.map(p => ASKS[p]).join(' and ')} without permission — ${worst[1]} times. That is what it was built to do.`
      : refused.length ? `${refused.length} ask(s) refused, the rest allowed.`
      : `${rec.asks.length} ask(s), all inside what you allowed.`,
  };
}

/**
 * ⚑ AN ADDON MAY NOT WIDEN ITS OWN GRANT. Given what it holds and what it now wants, this returns
 * the difference for a PERSON to decide — it never returns a new grant. Updating itself is not
 * consent, and the moment an addon can talk its way into more reach, the install screen was theatre.
 */
export function wantsMore(w, wanted) {
  const rec = (w && typeof w === 'object') ? w : watch('unknown', []);
  const held = new Set(rec.grant || []);
  const want = (Array.isArray(wanted) ? wanted : []).map(text);
  const extra = want.filter(x => NAMES.includes(x) && !held.has(x));
  const impossible = want.filter(x => NEVER_NAMES.includes(x));
  return {
    extra,
    impossible,
    // Said in the person's words, at the moment they can see it beside everything else installed.
    say: impossible.length
      ? `It is asking to ${impossible.map(i => NEVER[i]).join(' and ')}, which nothing is ever allowed to do.`
      : extra.length === 0 ? 'It is asking for nothing new.'
        : `It now wants to ${extra.map(e => ASKS[e]).join(' and ')}, which you did not allow when you installed it.`,
    // Never granted here. This function's whole job is to hand the decision back.
    granted: false,
  };
}
