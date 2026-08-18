// ══════════════════════════════════════════════════════════════════════════════════════════════
// module.mjs — what an addon has to BE before it is allowed to run.
//
// An addon is one file. Inside the box it gets three things and nothing else:
//
//     manifest({ id, name, does, needs })   ·  said once, before it can do anything
//     run(async (host) => { … })            ·  the work, handed a host that honours the grant
//     host.read() / host.write(x) / …       ·  one method per capability, and no others exist
//
// ⚑ IT DECLARES BEFORE IT CAN DO ANYTHING. The box loads in two phases. In the first the addon has
// no host at all — it can only call `manifest`. The host then compares what the code says about
// itself against what the shop showed you, and only if those agree does the second phase begin.
// Nothing it might want has been reachable up to that point, so a mismatch is caught before the
// addon has had a single opportunity to act on it.
//
// ⚑ AND THE CODE MUST MATCH THE LISTING. This is the check no app store performs. The description
// you read and the thing you installed are two separate artefacts everywhere else — the listing is
// marketing, the binary is whatever it is, and nobody compares them. Here a file that asks for more
// than its listing declared is refused and the difference is named, because "it wanted more than it
// told you" is the single most useful thing anybody can know about a program.
//
// Declaring LESS than the listing is fine and is said out loud: a thing that turned out to need
// less than it advertised is good news, and quietly ignoring it would waste the only moment anybody
// would notice.
//
// Pure and total: no clock, no I/O, no randomness.
// ══════════════════════════════════════════════════════════════════════════════════════════════
import { ASKS, NEVER } from './runtime.mjs';
import { text, num, list, field, isThing } from './safe.mjs';

const NAMES = Object.keys(ASKS);
const NEVER_NAMES = Object.keys(NEVER);


/** How long a description has to be before it counts as one. A shrug is not a description. */
export const MIN_DOES = 20;

/**
 * Is this a manifest at all? Checked before anything is compared, because "it asked for too much"
 * is a confusing thing to be told about a file that never said what it was.
 */
export function checkShape(declared) {
  const d = (declared && typeof declared === 'object' && !Array.isArray(declared)) ? declared : null;
  if (!d) return { ok: false, why: 'it never said what it is — an addon has to call manifest() before anything else' };

  const id = text(d.id).trim();
  if (!id) return { ok: false, why: 'its manifest has no id' };
  if (!text(d.name).trim()) return { ok: false, why: `${id} has no name` };

  const does = text(d.does).trim();
  if (does.length < MIN_DOES) {
    return { ok: false, why: `${id} describes itself in ${does.length} characters — that is a label, not a description of what it does` };
  }

  const needs = list(d.needs).map(n => n.trim()).filter(Boolean);
  const forbidden = needs.filter(n => NEVER_NAMES.includes(n));
  if (forbidden.length) {
    return { ok: false, why: `${id} asks to ${forbidden.map(n => NEVER[n]).join(' and ')}, which nothing is ever allowed to do` };
  }
  const invented = needs.filter(n => !NAMES.includes(n));
  if (invented.length) {
    return { ok: false, why: `${id} asks for ${invented.map(n => `"${n}"`).join(', ')}, which is not a thing an addon can ask for` };
  }

  return { ok: true, manifest: Object.freeze({ id, name: text(d.name).trim(), does, needs: Object.freeze([...new Set(needs)].sort()) }) };
}

/**
 * Does the code agree with the listing you were shown? Returns a verdict, and — when it does not —
 * the exact difference, in words, so a person can see what they were about to run.
 */
export function agrees(manifest, listing) {
  const m = (manifest && typeof manifest === 'object') ? manifest : {};
  const l = (listing && typeof listing === 'object') ? listing : {};
  const mid = text(m.id).trim(), lid = text(l.id).trim();

  if (!mid || !lid) return { ok: false, why: 'one of these has no id, so there is nothing to compare' };
  if (mid !== lid) {
    // A file claiming to be something else is the oldest trick there is.
    return { ok: false, why: `you asked to install "${lid}" and this file calls itself "${mid}"`, swapped: true };
  }

  const wants = new Set(list(m.needs));
  const shown = new Set(list(l.reach));
  const more = [...wants].filter(w => !shown.has(w));
  const fewer = [...shown].filter(sn => !wants.has(sn));

  if (more.length) {
    return {
      ok: false,
      more,
      why: `the shop said ${lid} would ${shown.size ? [...shown].map(sn => ASKS[sn] || sn).join(' and ') : 'do none of these things'}, `
        + `but the file also wants to ${more.map(mn => ASKS[mn] || mn).join(' and ')}`,
    };
  }

  return {
    ok: true,
    fewer,
    // Good news is still news. Saying it is the only moment anybody would notice.
    why: fewer.length
      ? `it needs less than the shop said — it never asks to ${fewer.map(fn => ASKS[fn] || fn).join(' or ')}`
      : 'the file asks for exactly what the shop showed you',
  };
}

/** Everything that has to be true before the second phase begins, in one call. */
export function admit(declared, listing) {
  const shape = checkShape(declared);
  if (!shape.ok) return { ok: false, why: shape.why, stage: 'shape' };
  const same = agrees(shape.manifest, listing);
  if (!same.ok) return { ok: false, why: same.why, stage: 'mismatch', more: same.more, swapped: same.swapped };
  return {
    ok: true,
    manifest: shape.manifest,
    // ⚑ THE GRANT IS THE INTERSECTION, never the union. If the two ever disagreed in a way we let
    // through, the smaller of them wins — an addon can only ever end up with less than it was
    // shown asking for, never more.
    grant: Object.freeze(shape.manifest.needs.filter(n => list(listing && listing.reach).includes(n))),
    why: same.why,
    fewer: same.fewer,
  };
}

/**
 * The document the addon runs inside. Built here so the wall is written down in one place and can
 * be read next to the rules it enforces.
 *
 * ⚑ `default-src 'none'` is the wall: no fetch, no image, no font, no socket, nothing. Paired with
 * a sandbox that withholds same-origin, the addon has no way to reach this page, its storage, or
 * anything on the network. The only exit is a message, and every message meets the judge first.
 */
/**
 * ⚑ THE BOX'S OWN CODE IS A REAL FUNCTION, NOT A STRING. It used to live inside a template literal,
 * which meant a mutation gate could break its every branch and no test would notice — the tests
 * could only check the SHAPE of the text, never what it did. Anything that has to ship as a string
 * should be written as a function and serialised, so it can be run and attacked like everything else.
 *
 * `plumbing` is phase one: it installs the two things an addon may call and nothing else. There is
 * deliberately no host here — see `afterAddon`.
 */
export function plumbing() {
  const send = (m) => parent.postMessage(m, '*');
  self.__box = { declared: null, work: null, send };
  self.manifest = (m) => { self.__box.declared = m; };
  self.run = (fn) => { self.__box.work = fn; };
  addEventListener('error', (e) => send({ kind: 'broke', text: String(e && e.message) }));
  addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    send({ kind: 'broke', text: String((r && r.message) || r) });
  });
}

/**
 * Phase two: say what was declared, then wait. The host object is built INSIDE the go handler and
 * nowhere earlier — made at the top it would be a const in the same closure the addon's own code
 * runs in, reachable before anybody had compared the file against its listing. Phase one has to be
 * genuinely powerless, not merely unused.
 */
export function afterAddon() {
  const box = self.__box;
  const send = box.send;
  send({ kind: 'declared', manifest: box.declared });

  const call = (what, detail) => new Promise((done) => {
    const id = String(Math.random()).slice(2) + String(Date.now());
    addEventListener('message', function onr(e) {
      if (!e.data) return;
      if (e.data.id !== id) return;
      removeEventListener('message', onr);
      done(e.data);
    });
    send({ kind: 'ask', id, what, detail: detail === undefined ? '' : String(detail) });
  });

  const may = (what) => async (d) => {
    const r = await call(what, d);
    // ⚑ A refused ask THROWS. Returning nothing lets an addon carry on as though it had been
    // allowed, and everything it does next is built on a permission it never got.
    if (!r.allowed) throw new Error(r.why);
    return r.data;
  };

  addEventListener('message', async (e) => {
    if (!e.data) return;
    if (e.data.kind !== 'go') return;
    if (typeof box.work !== 'function') { send({ kind: 'broke', text: 'it never called run()' }); return; }
    const host = {
      say: (t) => send({ kind: 'say', text: String(t) }),
      read: may('read'), write: may('write'), net: may('net'),
      spend: may('spend'), publish: may('publish'), run: may('run'),
    };
    try { await box.work(host); send({ kind: 'finished' }); }
    catch (err) { send({ kind: 'broke', text: String((err && err.message) || err) }); }
  });
}

/**
 * The document the addon runs inside. Three scripts in order: the plumbing, the addon's own source,
 * then the declaration and the wait. Splitting them is what lets the addon's code run at the top
 * level — where it can see `manifest` and `run` — without ever sharing a closure with the host.
 *
 * ⚑ `default-src 'none'` is the wall: no fetch, no image, no font, no socket, nothing. Note there is
 * no `unsafe-eval` either, which is why the addon's source is inlined rather than passed in as a
 * string to be evaluated — widening the policy to make the plumbing tidier would weaken the only
 * thing here that actually contains anybody.
 */
export function frameFor(source) {
  // A closing script tag in the source would end our element early and drop the rest into the
  // document as markup, outside the part the policy was wrapped around.
  const safe = text(source).split('</script').join('<\\/script');
  const tag = (body) => '<scr' + 'ipt>' + body + '</scr' + 'ipt>';
  return '<!doctype html>\n'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'">\n'
    + tag('(' + plumbing.toString() + ')();') + '\n'
    + tag(safe) + '\n'
    + tag('(' + afterAddon.toString() + ')();') + '\n';
}
