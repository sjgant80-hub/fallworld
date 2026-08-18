// Tests for the shape an addon has to be.
//
// The check that matters here does not exist in any app store: does the code agree with the
// listing? Everywhere else the description and the binary are separate artefacts and nobody
// compares them. Most of what follows is about refusing the ones that disagree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_DOES, checkShape, agrees, admit, frameFor, plumbing, afterAddon } from './module.mjs';

const good = (over = {}) => ({
  id: 'word-count', name: 'Word count', needs: ['read'],
  does: 'counts the words in the note you are working on', ...over,
});
const listed = (over = {}) => ({ id: 'word-count', name: 'Word count', reach: ['read'], ...over });

// ─────────────────────────── is it a manifest at all ───────────────────────────

test('a file that never says what it is cannot run', () => {
  for (const nothing of [null, undefined, 7, 'manifest', [], true]) {
    const r = checkShape(nothing);
    assert.equal(r.ok, false);
    assert.match(r.why, /never said what it is|no id/);
  }
});

test('a manifest with no id or no name is refused', () => {
  assert.equal(checkShape(good({ id: '' })).ok, false);
  assert.equal(checkShape(good({ id: '   ' })).ok, false);
  assert.equal(checkShape(good({ name: '' })).ok, false);
});

test('a description has to be a description, not a label', () => {
  const short = checkShape(good({ does: 'counts words' }));
  assert.equal(short.ok, false);
  assert.match(short.why, /that is a label/);
  assert.equal(checkShape(good({ does: 'x'.repeat(MIN_DOES) })).ok, true, 'exactly the minimum was refused');
  assert.equal(checkShape(good({ does: 'x'.repeat(MIN_DOES - 1) })).ok, false, 'one under the minimum was let through');
});

test('AN ADDON MAY NOT EVEN ASK FOR SOMETHING NOTHING IS ALLOWED TO DO', () => {
  const r = checkShape(good({ needs: ['read', 'keys'] }));
  assert.equal(r.ok, false, 'a file asking for the API keys was admitted');
  assert.match(r.why, /nothing is ever allowed to do/);
});

test('an invented capability is refused, not quietly dropped', () => {
  // Dropping it would let a file declare something meaningless and still run, and the person would
  // never learn that the thing they installed does not know what it is talking about.
  const r = checkShape(good({ needs: ['read', 'telepathy'] }));
  assert.equal(r.ok, false);
  assert.match(r.why, /"telepathy"/);
});

test('a clean manifest comes back tidied and frozen', () => {
  const r = checkShape(good({ needs: ['write', 'read', 'read'], name: '  Word count  ' }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.manifest.needs, ['read', 'write'], 'needs were not deduplicated and sorted');
  assert.equal(r.manifest.name, 'Word count', 'the name kept its whitespace');
  assert.throws(() => { r.manifest.id = 'other'; }, TypeError);
});

test('an addon that asks for nothing is perfectly valid', () => {
  const r = checkShape(good({ needs: [] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.manifest.needs, []);
});

// ─────────────────────────── does the code match the shop ───────────────────────────

test('THE CODE MUST NOT WANT MORE THAN THE LISTING SHOWED YOU', () => {
  // The check no app store performs. "It wanted more than it told you" is the single most useful
  // thing anybody can know about a program they did not write.
  const v = agrees(good({ needs: ['read', 'net'] }), listed({ reach: ['read'] }));
  assert.equal(v.ok, false);
  assert.deepEqual(v.more, ['net']);
  assert.match(v.why, /the shop said/);
  assert.match(v.why, /but the file also wants to/);
  assert.match(v.why, /reach the internet/, 'the difference was named in code, not in words: ' + v.why);
});

test('a file claiming to be a different addon is refused outright', () => {
  const v = agrees(good({ id: 'something-else' }), listed());
  assert.equal(v.ok, false);
  assert.equal(v.swapped, true);
  assert.match(v.why, /you asked to install "word-count" and this file calls itself "something-else"/);
});

test('WANTING LESS THAN ADVERTISED IS FINE, and it is said out loud', () => {
  // Good news is still news, and this is the only moment anybody would notice it.
  const v = agrees(good({ needs: [] }), listed({ reach: ['read', 'write'] }));
  assert.equal(v.ok, true);
  assert.deepEqual(v.fewer.sort(), ['read', 'write']);
  assert.match(v.why, /needs less than the shop said/);
  assert.match(v.why, /read your notes/, 'what it does not need was named in code: ' + v.why);
});

test('an exact match says so plainly', () => {
  const v = agrees(good(), listed());
  assert.equal(v.ok, true);
  assert.deepEqual(v.fewer, []);
  assert.match(v.why, /exactly what the shop showed you/);
});

test('a listing that shows no permissions still catches a file that wants some', () => {
  const v = agrees(good({ needs: ['read'] }), listed({ reach: [] }));
  assert.equal(v.ok, false);
  assert.match(v.why, /do none of these things/);
});

test('comparing against nothing is refused rather than passed', () => {
  for (const bad of [null, undefined, {}, 7, 'listing']) {
    assert.equal(agrees(good(), bad).ok, false, 'a missing listing was treated as agreement');
    assert.equal(agrees(bad, listed()).ok, false, 'a missing manifest was treated as agreement');
  }
});

// ─────────────────────────── admitting it ───────────────────────────

test('admit refuses at the first thing that is wrong, and says which stage', () => {
  assert.equal(admit(null, listed()).stage, 'shape');
  assert.equal(admit(good({ needs: ['net'] }), listed()).stage, 'mismatch');
  assert.equal(admit(good(), listed()).ok, true);
});

test('THE GRANT IT ENDS UP WITH IS THE INTERSECTION, never the union', () => {
  // If the two ever disagreed in a way we let through, the smaller wins. An addon can only ever end
  // up with less than it was shown asking for.
  const a = admit(good({ needs: ['read'] }), listed({ reach: ['read', 'write'] }));
  assert.equal(a.ok, true);
  assert.deepEqual(a.grant, ['read'], 'it was handed a permission its own code never asked for');
  assert.throws(() => { a.grant.push('write'); }, TypeError);
});

test('an admitted addon that wants nothing gets nothing', () => {
  const a = admit(good({ needs: [] }), listed({ reach: ['read', 'write', 'net'] }));
  assert.equal(a.ok, true);
  assert.deepEqual(a.grant, []);
});

// ─────────────────────────── the box it runs in ───────────────────────────
//
// These run the box's ACTUAL code. It used to live inside a template literal, where a mutation gate
// could break every branch of it and nothing would notice, because the tests could only look at the
// shape of the text. Now it is two real functions, serialised at build time and attacked here.

/** A fake tab: enough of a window for the box's plumbing to run inside. */
function fakeBox() {
  const sent = [];
  const listeners = { message: [], error: [], unhandledrejection: [] };
  const self_ = {
    parent: { postMessage: (m) => sent.push(m) },
    addEventListener: (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); },
    removeEventListener: (k, fn) => { listeners[k] = (listeners[k] || []).filter(f => f !== fn); },
  };
  self_.self = self_;
  const ctx = {
    sent, listeners, self: self_,
    // deliver a message from the host into the box
    post: (data) => { for (const fn of [...(listeners.message || [])]) fn({ data }); },
    raise: (k, ev) => { for (const fn of [...(listeners[k] || [])]) fn(ev); },
  };
  return ctx;
}

/** Run one of the box functions inside the fake tab. */
function inBox(ctx, fn) {
  // The functions reference self / parent / addEventListener as globals, exactly as they do in a
  // real frame — so they are called with those bound rather than imported.
  const run = new Function('self', 'parent', 'addEventListener', 'removeEventListener',
    `return (${fn.toString()})();`);
  return run(ctx.self, ctx.self.parent, ctx.self.addEventListener, ctx.self.removeEventListener);
}

test('the plumbing gives an addon exactly two things to call, and no host', () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  assert.equal(typeof ctx.self.manifest, 'function');
  assert.equal(typeof ctx.self.run, 'function');
  // ⚑ Phase one is genuinely powerless: there is nothing here that could read, write or reach out.
  assert.equal(ctx.self.host, undefined, 'a host existed before anything had been declared');
  assert.equal(ctx.self.fetch, undefined);
});

test('what an addon declares is remembered, and nothing is sent until phase two', () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.self.manifest({ id: 'x', name: 'X', does: 'a real description of what it does', needs: [] });
  assert.deepEqual(ctx.sent, [], 'the box spoke before it was asked to');
  inBox(ctx, afterAddon);
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].kind, 'declared');
  assert.equal(ctx.sent[0].manifest.id, 'x');
});

test('AN ADDON THAT NEVER CALLED run() IS REPORTED, not silently ignored', () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.self.manifest({ id: 'x' });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  assert.ok(ctx.sent.some(m => m.kind === 'broke' && /never called run/.test(m.text)));
});

test('the work only starts when the host says go, and never before', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  let started = false;
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async (host) => { started = true; host.say('hello'); });
  inBox(ctx, afterAddon);
  assert.equal(started, false, 'it ran without being told to');
  // anything that is not "go" must not start it either
  ctx.post({ kind: 'something-else' });
  ctx.post({ id: 'stray' });
  assert.equal(started, false, 'a message that was not go started the work');
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(started, true);
  assert.ok(ctx.sent.some(m => m.kind === 'say' && m.text === 'hello'));
  assert.ok(ctx.sent.some(m => m.kind === 'finished'));
});

test('A REFUSED ASK THROWS INSIDE THE ADDON, so it cannot carry on as though allowed', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  let caught = null, wentOn = false;
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async (host) => {
    try { await host.net('https://somewhere.test'); wentOn = true; }
    catch (e) { caught = e.message; }
  });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  const askMsg = ctx.sent.find(m => m.kind === 'ask');
  assert.ok(askMsg, 'it never asked');
  assert.equal(askMsg.what, 'net');
  assert.equal(askMsg.detail, 'https://somewhere.test', 'the ask lost what it was actually after');
  ctx.post({ id: askMsg.id, allowed: false, why: 'you did not allow that' });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(caught, 'you did not allow that');
  assert.equal(wentOn, false, 'it carried on after being refused');
});

test('an allowed ask hands back the data the host actually sent', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  let got = null;
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async (host) => { got = await host.read('notes'); });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  const ask = ctx.sent.find(m => m.kind === 'ask');
  ctx.post({ id: ask.id, allowed: true, data: { notes: 'hello' } });
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(got, { notes: 'hello' });
});

test('a reply meant for a different ask is ignored', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  let done = false;
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async (host) => { await host.read(); done = true; });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  ctx.post({ id: 'not-the-one', allowed: true, data: 1 });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(done, false, 'somebody else\u2019s answer was accepted as this one\u2019s');
});

test('every capability has one method, and nothing exists for what is never allowed', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  let host = null;
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async (h) => { host = h; });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  for (const m of ['read', 'write', 'net', 'spend', 'publish', 'run', 'say']) {
    assert.equal(typeof host[m], 'function', 'the host has no ' + m + '()');
  }
  assert.equal(host.keys, undefined, 'the host offers a way to reach something nothing may ever have');
  assert.equal(host.grant, undefined);
});

test('an addon that throws is reported rather than hanging', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async () => { throw new Error('it fell over'); });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  assert.ok(ctx.sent.some(m => m.kind === 'broke' && /fell over/.test(m.text)));
  assert.ok(!ctx.sent.some(m => m.kind === 'finished'), 'it reported finishing after falling over');
});

test('a thrown error with no message still comes back as something readable', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async () => { throw 'just a string'; });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  const broke = ctx.sent.find(m => m.kind === 'broke');
  assert.ok(broke && broke.text.includes('just a string'), 'the failure came back as nothing: ' + JSON.stringify(broke));
});

test('an error or a rejection anywhere in the box is reported', () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.raise('error', { message: 'boom' });
  assert.ok(ctx.sent.some(m => m.kind === 'broke' && /boom/.test(m.text)));
  ctx.raise('unhandledrejection', { reason: new Error('later boom') });
  assert.ok(ctx.sent.some(m => m.kind === 'broke' && /later boom/.test(m.text)));
  ctx.raise('unhandledrejection', { reason: 'a bare string' });
  assert.ok(ctx.sent.some(m => m.kind === 'broke' && /a bare string/.test(m.text)));
});

// ─────────────────────────── the document it is written into ───────────────────────────

test('THE WALL IS IN THE DOCUMENT — nothing loads from anywhere', () => {
  const f = frameFor('manifest({});');
  assert.match(f, /default-src 'none'/, 'the policy does not block everything');
  // No unsafe-eval either: widening it to make the plumbing tidier would weaken the only thing
  // here that actually contains anybody.
  assert.doesNotMatch(f, /unsafe-eval|connect-src|img-src|default-src \*/);
});

test('the addon sits between the two halves of the plumbing, never inside either', () => {
  const f = frameFor('manifest({ id: "mine" });');
  const first = f.indexOf('__box');
  const addon = f.indexOf('manifest({ id: "mine" })');
  const second = f.lastIndexOf('__box');
  assert.ok(first > 0 && addon > first, 'the addon ran before anything gave it manifest()');
  assert.ok(second > addon, 'the declaration is sent before the addon has had a chance to declare');
});

test('a closing script tag in the source cannot break out', () => {
  const f = frameFor('manifest({}); // </script><img src=x onerror=alert(1)>');
  assert.doesNotMatch(f, /\/\/ <\/script><img/, 'the source closed the script element');
});

test('building a box survives any source at all', () => {
  for (const junk of [null, undefined, 7, {}, [], true, { toString() { throw new Error('no'); } }]) {
    assert.equal(typeof frameFor(junk), 'string');
    assert.match(frameFor(junk), /default-src 'none'/);
  }
});

test('the same manifest and listing always give the same verdict', () => {
  assert.deepEqual(admit(good(), listed()), admit(good(), listed()));
  assert.deepEqual(agrees(good({ needs: ['net'] }), listed()), agrees(good({ needs: ['net'] }), listed()));
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('AN ARRAY IS NOT A MANIFEST, and it is refused as one rather than as a missing id', () => {
  // An array passes a bare truthiness check and a typeof check. Refusing it further down as
  // "no id" reads as a small mistake in an otherwise sane file, when in fact it is not a
  // manifest at all — and the difference is what tells somebody where to look.
  const r = checkShape([]);
  assert.equal(r.ok, false);
  assert.match(r.why, /never said what it is/, 'an array was refused as though it were a manifest: ' + r.why);
  for (const notAThing of [null, undefined, 7, 'manifest', true, ['id']]) {
    assert.match(checkShape(notAThing).why, /never said what it is/, JSON.stringify(notAThing) + ' was mistaken for a manifest');
  }
});

test('comparing a manifest against a listing with no id says exactly that', () => {
  // Falling through to the "this file calls itself something else" message sends somebody looking
  // for a swapped file when the real problem is that there is nothing to compare against.
  assert.match(agrees(good(), { reach: [] }).why, /nothing to compare/);
  assert.match(agrees({ needs: [] }, listed()).why, /nothing to compare/);
  assert.match(agrees({ id: '' }, { id: '' }).why, /nothing to compare/);
  // and a genuine mismatch still reads as a mismatch
  assert.match(agrees(good({ id: 'other' }), listed()).why, /calls itself/);
});

test('what the shop showed is named in words, not in codes', () => {
  const v = agrees(good({ needs: ['read', 'net'] }), listed({ reach: ['read'] }));
  assert.equal(v.ok, false);
  assert.match(v.why, /read your notes and memory/, 'the shop side was printed as a code: ' + v.why);
  assert.match(v.why, /reach the internet/, 'the extra was printed as a code: ' + v.why);
  assert.doesNotMatch(v.why, /would read,|would net\b/, 'a bare capability name reached the sentence');
});

test('A FAILURE OBJECT WITH A MESSAGE IS REPORTED BY ITS MESSAGE, not stringified whole', () => {
  // String({message:'x'}) is "[object Object]", which tells nobody anything. This is the difference
  // between a readable failure and a shrug, and it applies to both places the box reports one.
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.raise('unhandledrejection', { reason: { message: 'the real reason' } });
  const r1 = ctx.sent.find(m => m.kind === 'broke');
  assert.ok(r1 && /the real reason/.test(r1.text), 'a rejection came back as: ' + JSON.stringify(r1));
  assert.ok(!/object Object/.test(r1.text));
});

test('and the same when the work itself throws something with a message', async () => {
  const ctx = fakeBox();
  inBox(ctx, plumbing);
  ctx.self.manifest({ id: 'x' });
  ctx.self.run(async () => { throw { message: 'thrown plainly' }; });
  inBox(ctx, afterAddon);
  ctx.post({ kind: 'go' });
  await new Promise(r => setTimeout(r, 0));
  const broke = ctx.sent.find(m => m.kind === 'broke');
  assert.ok(broke && /thrown plainly/.test(broke.text), 'the failure came back as: ' + JSON.stringify(broke));
  assert.ok(!/object Object/.test(broke.text));
});
