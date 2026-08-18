// Tests for the wall.
//
// A permission system fails in one direction: it lets something through. Every test here is about
// refusing — and about the record of what was refused, which is the only place you can see what a
// thing you did not write was actually built to want.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASKS, NEVER, judge, watch, ask, report, wantsMore } from './runtime.mjs';

const reader = () => watch('notes', ['read']);

test('AN ASK OUTSIDE THE GRANT IS REFUSED, not warned about and allowed', () => {
  // "Warn and continue" is not containment; it is a diary of things that already happened.
  const d = judge('net', ['read']);
  assert.equal(d.allow, false);
  assert.match(d.why, /did not ask for permission/);
  assert.equal(judge('read', ['read']).allow, true);
});

test('SOME THINGS ARE REFUSED WHATEVER THE GRANT SAYS', () => {
  // A rule that can be unlocked by widening a list is not a rule. These are checked first, so a
  // grant that somehow contains one still cannot buy it.
  for (const forbidden of Object.keys(NEVER)) {
    const d = judge(forbidden, [forbidden, 'read', 'net', 'write', 'spend', 'publish', 'run']);
    assert.equal(d.allow, false, `a grant containing "${forbidden}" bought it`);
    assert.equal(d.never, true);
    assert.match(d.why, /whatever its grant says/);
  }
});

test('an addon can never read your keys, even holding every ordinary permission', () => {
  const everything = Object.keys(ASKS);
  assert.equal(judge('keys', everything).allow, false, 'a fully-trusted addon could read the keys');
});

test('a made-up capability is refused rather than treated as harmless', () => {
  for (const bad of ['telepathy', '', null, undefined, 7, {}, 'READ']) {
    const d = judge(bad, ['read', 'net', 'write']);
    assert.equal(d.allow, false, JSON.stringify(bad) + ' was allowed');
  }
  assert.equal(judge('READ', ['read']).allow, false, 'a case-different name slipped through');
});

test('an empty grant allows nothing at all', () => {
  for (const g of [[], null, undefined, 'read', 7, {}]) {
    for (const a of Object.keys(ASKS)) assert.equal(judge(a, g).allow, false, `${a} was allowed by grant ${JSON.stringify(g)}`);
  }
});

// ─────────────────────────── the record ───────────────────────────

test('EVERY REFUSAL IS KEPT — the only place you can see what it TRIED to do', () => {
  // Every permission system shows what an addon was allowed. None shows what it wanted.
  const w = reader();
  ask(w, { what: 'read', detail: 'your notes' }, 0);
  ask(w, { what: 'net', detail: 'https://somewhere.test' }, 1);
  const r = report(w);
  assert.equal(r.tried, 2);
  assert.equal(r.allowed, 1);
  assert.equal(r.refused, 1);
  assert.deepEqual(r.byWhat, { net: 1 });
  assert.equal(w.asks[1].detail, 'https://somewhere.test', 'the refusal lost what it was actually after');
});

test('ASKING REPEATEDLY FOR WHAT IT CANNOT HAVE IS THE SIGNAL, and it is said plainly', () => {
  const w = reader();
  for (let i = 0; i < 5; i++) ask(w, 'net', i);
  const r = report(w);
  assert.deepEqual(r.persistent, ['net']);
  assert.match(r.verdict, /repeatedly tried/);
  assert.match(r.verdict, /5 times/);
  assert.match(r.verdict, /what it was built to do/);
});

test('once or twice is not called a pattern — crying wolf gets the warning ignored', () => {
  const w = reader();
  ask(w, 'net', 0); ask(w, 'net', 1);
  const r = report(w);
  assert.deepEqual(r.persistent, [], 'two asks were called a pattern');
  assert.match(r.verdict, /refused/);
});

test('trying something never permitted says REMOVE IT, in those words', () => {
  const w = watch('sneaky', ['read']);
  ask(w, 'keys', 0);
  const r = report(w);
  assert.deepEqual(r.forbidden, ['keys']);
  assert.match(r.verdict, /Nothing is ever allowed to do that/);
  assert.match(r.verdict, /Remove it/);
});

test('NOTHING TRIED IS NOT A CLEAN BILL OF HEALTH', () => {
  // An addon that has asked for nothing is one you have not run, and reading that as "safe" is the
  // badge that cannot fail.
  const r = report(reader());
  assert.equal(r.tried, 0);
  assert.match(r.verdict, /not the same as it being harmless/);
  assert.doesNotMatch(r.verdict, /all inside|clean|safe/i);
});

test('a clean run says so without overstating it', () => {
  const w = reader();
  ask(w, 'read', 0); ask(w, 'read', 1);
  const r = report(w);
  assert.equal(r.refused, 0);
  assert.match(r.verdict, /all inside what you allowed/);
});

test('a grant is cleaned at the door — an addon cannot smuggle in a capability that does not exist', () => {
  const w = watch('x', ['read', 'telepathy', 'keys', 'net']);
  assert.deepEqual(w.grant, ['read', 'net'], 'a made-up or forbidden reach survived into the grant');
});

// ─────────────────────────── it cannot widen itself ───────────────────────────

test('AN ADDON CANNOT WIDEN ITS OWN GRANT BY ASKING', () => {
  // The moment it can talk its way into more reach, the install screen was theatre.
  const w = reader();
  const more = wantsMore(w, ['net', 'read', 'write']);
  assert.equal(more.granted, false);
  assert.deepEqual(more.extra.sort(), ['net', 'write']);
  assert.match(more.say, /you did not allow when you installed it/);
  // And nothing changed: it still cannot do it.
  assert.equal(judge('net', w.grant).allow, false);
});

test('asking for nothing new says so, rather than prompting a person for no reason', () => {
  const more = wantsMore(reader(), ['read']);
  assert.deepEqual(more.extra, []);
  assert.match(more.say, /nothing new/);
});

test('asking for something never permitted is named as impossible, not as a choice', () => {
  const more = wantsMore(reader(), ['keys', 'net']);
  assert.deepEqual(more.impossible, ['keys']);
  assert.match(more.say, /nothing is ever allowed to do/i);
  assert.equal(more.granted, false);
});

// ─────────────────────────── total ───────────────────────────

test('every capability and every forbidden thing is explained in a person\'s words', () => {
  for (const [k, v] of Object.entries(ASKS)) assert.ok(v.length > 12, k + ' has no plain meaning');
  for (const [k, v] of Object.entries(NEVER)) assert.ok(v.length > 12, k + ' has no plain meaning');
  // No name may be in both lists, or the order of the checks would decide the answer.
  for (const k of Object.keys(NEVER)) assert.ok(!Object.hasOwn(ASKS, k), k + ' is both grantable and forbidden');
});

test('the wall holds when handed rubbish', () => {
  for (const junk of [null, undefined, 7, 'watch', [], {}, { asks: 'no' }]) {
    assert.doesNotThrow(() => report(junk));
    assert.doesNotThrow(() => wantsMore(junk, ['net']));
    assert.doesNotThrow(() => ask(junk, 'read', 0));
    assert.equal(ask(junk, 'read', 0).allow, false, 'a broken watcher allowed something');
  }
  assert.doesNotThrow(() => watch(null, null));
  assert.deepEqual(watch(null, null).grant, []);
});

test('the same asks against the same grant always come out the same', () => {
  const a = reader(); const b = reader();
  for (const w of [a, b]) { ask(w, 'read', 0); ask(w, 'net', 1); ask(w, 'keys', 2); }
  assert.deepEqual(report(a), report(b));
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('three is where "a pattern" starts, and the line is exact', () => {
  const at = reader(); for (let i = 0; i < 3; i++) ask(at, 'net', i);
  assert.deepEqual(report(at).persistent, ['net'], 'three asks was not called a pattern');
  const under = reader(); for (let i = 0; i < 2; i++) ask(under, 'net', i);
  assert.deepEqual(report(under).persistent, [], 'two asks was called a pattern');
});

test('an ask sent as a bare name works exactly like one sent as an object', () => {
  const a = reader(), b = reader();
  ask(a, 'net', 0);
  ask(b, { what: 'net' }, 0);
  assert.equal(a.asks[0].what, b.asks[0].what);
  assert.equal(a.asks[0].allowed, b.asks[0].allowed);
  assert.equal(a.asks[0].detail, '', 'a bare-name ask invented a detail');
});

test('a refusal of something unknown quotes what was actually asked for', () => {
  const d = judge('telepathy', ['read']);
  assert.match(d.why, /"telepathy"/, 'the refusal did not say what it refused: ' + d.why);
  assert.equal(d.unknown, true);
  // And an empty ask reads as nothing rather than as an empty pair of quotes.
  assert.match(judge('', ['read']).why, /nothing/);
});
