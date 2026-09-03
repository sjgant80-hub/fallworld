// render.test.mjs — the seam law, falsifiable. Load-bearing: the doors catch before anything
// renders, reuse outranks recombine outranks generate (generation is the LAST resort, by law),
// the κ boundaries are exact, freezing needs an argument, and the shadow provably remembers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAPPA, DOORS, intentOf, collapse, persist, foldBack, recallOf } from './render.mjs';

const SHADOW = [
  { name: 'falljustice', desc: 'consumer letter before action engine with verified case law and deadlines', url: 'x' },
  { name: 'fallgrowth', desc: 'growth brain learns which social strategy moves your goals from real outcomes', url: 'x' },
  { name: 'glampos', desc: 'bookings for small stays with the double booking guard', url: 'x' },
  { name: 'the-bell', desc: 'mutation verdict becomes a bell clean rings true survivors crack it', url: 'x' },
];

test('INTENT — meat tokens, the key, and every door class detected ALONE', () => {
  const it = intentOf('I need a tool to track guest bookings for my cabin');
  assert.ok(it.tokens.includes('bookings') && it.tokens.includes('guest'));
  assert.ok(!it.tokens.includes('tool') && !it.tokens.includes('need'), 'filler words are not intent');
  assert.equal(it.doors.length, 0);
  assert.equal(intentOf('track my bookings').key, intentOf('bookings — track them').key, 'rephrasings share a key');
  assert.deepEqual(intentOf('charge the client an invoice').doors, ['money']);
  assert.deepEqual(intentOf('draft the contract terms').doors, ['legal']);
  assert.deepEqual(intentOf('wipe the old records').doors, ['irreversible']);
  assert.deepEqual(intentOf('publish the update').doors, ['external']);
  assert.deepEqual(intentOf('store all my passwords in one place').doors, ['private'], "sididy's door: a leak cannot be folded back");
  assert.deepEqual(intentOf('invoice the client then tweet it').doors, ['money', 'external'], 'multiple doors all named');
  assert.match(intentOf('').why, /collapses nothing from silence/);
  assert.match(intentOf('the and was').why, /no checkable words/);
  assert.match(intentOf(7).why, /collapses nothing from silence/);
});

test('COLLAPSE — a door outranks everything: nothing auto-renders past the human key', () => {
  const r = collapse('build me an invoice generator for bookings', SHADOW);
  assert.equal(r.mode, 'door');
  assert.deepEqual(r.doors, ['money']);
  assert.match(r.why, /the seam does not auto-render what a human must answer for/);
  assert.match(r.why, /— a human door;/, 'one door speaks in the singular');
  const two = collapse('delete and publish everything', SHADOW);
  assert.deepEqual(two.doors, ['irreversible', 'external']);
  assert.match(two.why, /these are human doors/, 'two doors speak in the plural — the grammar counts the doors');
});

test('COLLAPSE — REUSE: the estate already holds it, zero new software', () => {
  const r = collapse('letter before action with verified case law', SHADOW);
  assert.equal(r.mode, 'reuse');
  assert.equal(r.fold.name, 'falljustice');
  assert.ok(r.support >= KAPPA);
  assert.match(r.why, /the estate already holds this — "falljustice"/);
  assert.match(r.why, /zero new software/);
});

test('COLLAPSE — RECOMBINE: two folds cover what neither does alone', () => {
  const r = collapse('double booking guard that learns strategy outcomes', SHADOW);
  assert.equal(r.mode, 'recombine', 'each half sits at exactly half the intent — neither reuses alone: ' + JSON.stringify(r));
  const names = r.folds.map((f) => f.name).sort();
  assert.deepEqual(names, ['fallgrowth', 'glampos']);
  assert.ok(r.coverage >= KAPPA, 'together they clear κ: ' + r.coverage);
  assert.match(r.why, /a composition, not a new cage/);
});

test('COLLAPSE — GENERATE is the last resort, and the brief names the gap', () => {
  const r = collapse('translate ancient sumerian tablets into recipes', SHADOW);
  assert.equal(r.mode, 'generate');
  assert.ok(r.gaps.includes('sumerian') && r.gaps.includes('tablets'));
  assert.match(r.brief, /last resort — the shadow holds no fold for:/);
  assert.match(r.brief, /persistence is a choice that needs an argument/);
  assert.ok(!r.brief.includes('Imitate'), 'zero-support folds are NOT offered as models — nothing near means nothing near');
  // partial support: the nearest real fold IS offered as the shape to imitate
  const near = collapse('letter recipes sumerian', SHADOW);
  assert.equal(near.mode, 'generate');
  assert.match(near.brief, /Imitate the shape of: falljustice/, 'a fold with real overlap guides the render');
  // a single-fold shadow at half support reaches generate — never a throw on a missing second
  const solo = collapse('double booking sumerian recipes', [SHADOW[2]]);
  assert.equal(solo.mode, 'generate', 'no second fold, no recombine, no crash');
  // all tokens covered but nothing clears the bars: the brief names the COMBINATION gap
  const combo = collapse('letter case strategy bookings', SHADOW);
  assert.equal(combo.mode, 'generate', JSON.stringify(combo));
  assert.match(combo.brief, /no fold for: this combination/, 'every token covered somewhere, no bar cleared — a combination gap, said as such');
  // determinism
  assert.deepEqual(collapse('translate ancient sumerian tablets into recipes', SHADOW), r);
  // refusals
  assert.match(collapse('anything', []).why, /an empty shadow renders nothing/);
  assert.match(collapse('anything', 'x').why, /empty shadow/);
  assert.match(collapse('anything', [{ name: 'ok' }]).why, /a shadow fold is/);
  assert.match(collapse('anything', [null]).why, /a shadow fold is/);
});

test('COLLAPSE — the κ boundary to the bit: 309 of 500 intent tokens covered = reuse, exactly', () => {
  const toks = Array.from({ length: 500 }, (_, i) => 'tok' + String(i).padStart(3, '0'));
  const intent = toks.join(' ');
  const fold = { name: 'bigfold', desc: toks.slice(0, 309).join(' '), url: 'x' };
  const r = collapse(intent, [fold, { name: 'zzz', desc: 'nothing relevant here', url: 'x' }]);
  assert.equal(r.mode, 'reuse', 'support exactly κ reuses — the boundary is inclusive');
  assert.equal(r.support, 0.618);
  const under = collapse(intent, [{ ...fold, desc: toks.slice(0, 308).join(' ') }, { name: 'zzz', desc: 'nothing relevant here', url: 'x' }]);
  assert.notEqual(under.mode, 'reuse', 'one token fewer and reuse is off the table');
});

test('COLLAPSE — κ/2 to the bit: two folds at exactly 0.309 each, union exactly κ → recombine, inclusive twice over', () => {
  const toks = Array.from({ length: 1000 }, (_, i) => 'tok' + String(i).padStart(4, '0'));
  const intent = toks.join(' ');
  const a = { name: 'aaa', desc: toks.slice(0, 309).join(' '), url: 'x' };       // 309/1000 = κ/2 exactly
  const b = { name: 'bbb', desc: toks.slice(309, 618).join(' '), url: 'x' };     // 309 more; union 618/1000 = κ exactly
  const r = collapse(intent, [a, b]);
  assert.equal(r.mode, 'recombine', 'both halves at exactly κ/2 and coverage exactly κ — every boundary inclusive: ' + JSON.stringify({ mode: r.mode, coverage: r.coverage }));
  assert.equal(r.coverage, 0.618);
});

test('PERSIST — fold-back is the default; freezing needs an argument, not a shrug', () => {
  assert.equal(persist('reuse').policy, 'keep-frozen');
  assert.match(persist('reuse').why, /earned its persistence before this intent arrived/);
  assert.equal(persist('recombine').policy, 'hold-live');
  assert.equal(persist('generate').policy, 'render-and-fold');
  assert.match(persist('generate').why, /the lit surface stays cheap/);
  const argued = persist('generate', 'this render is the invoice template three clients now depend on weekly');
  assert.equal(argued.policy, 'keep-frozen');
  assert.match(argued.why, /^frozen by argument:/);
  assert.equal(persist('generate', 'clients depend weekly').policy, 'keep-frozen', 'exactly three meat words is the smallest argument that stands');
  assert.match(persist('generate', 'keep').why, /a shrug does not freeze a fold/);
  assert.match(persist('generate', '   ').why, /needs an argument|shrug/);
  assert.equal(persist('generate', '').policy, 'render-and-fold', 'an empty reason is NO reason — the default holds, not a refusal');
  assert.equal(persist('recombine', null).policy, 'hold-live', 'null reason is no reason too');
  assert.match(persist('door').why, /doors never rendered/);
  assert.match(persist('x').why, /rendered modes/);
});

test('FOLD-BACK + RECALL — the shadow remembers, and repeat renders GROW the record', () => {
  let ledger = [];
  const fresh = recallOf('track cabin bookings', ledger);
  assert.equal(fresh.remembered, false);
  assert.match(fresh.why, /collapse it fresh/);
  const f1 = foldBack(ledger, 'track cabin bookings', { mode: 'reuse', folds: ['glampos'] });
  assert.ok(f1.ok);
  ledger = f1.ledger;
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].renders, 1);
  // a rephrasing lands on the SAME record
  const f2 = foldBack(ledger, 'cabin bookings — track', { mode: 'reuse', folds: ['glampos'] });
  ledger = f2.ledger;
  assert.equal(ledger.length, 1, 'one intent, one record — rephrasings share the memory');
  assert.equal(ledger[0].renders, 2);
  const rec = recallOf('track the cabin bookings', ledger);
  assert.equal(rec.remembered, true);
  assert.equal(rec.mode, 'reuse');
  assert.deepEqual(rec.folds, ['glampos']);
  assert.match(rec.why, /the shadow remembers — rendered 2 time\(s\) before as reuse via glampos/);
  assert.equal(f1.ledger[0].renders, 1, 'foldBack never mutates the old ledger');
  assert.match(foldBack('x', 'intent words', { mode: 'reuse' }).why, /must be a list/);
  // a ledger holding a null entry is skipped over, never thrown on
  assert.equal(recallOf('intent words', [null]).remembered, false, 'a null record is not a memory');
  assert.equal(foldBack([null], 'intent words', { mode: 'reuse', folds: [] }).ok, true, 'foldBack steps over the corpse and appends');
  assert.match(foldBack([], 'intent words', { mode: 'nah' }).why, /needs the mode that rendered/);
  assert.match(foldBack([], 'intent words', null).why, /needs the mode/);
  assert.match(recallOf('intent words', 'x').why, /must be a list/);
});

test('THE FUZZ — 300 random intents: exactly one mode, total determinism, doors always win', () => {
  let seed = 90210;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const WORDS = ['bookings', 'guard', 'strategy', 'outcomes', 'letter', 'action', 'verified', 'deadlines', 'bell', 'verdict', 'cabin', 'guest', 'recipes', 'tablets', 'goals', 'social'];
  const DOORWORDS = ['invoice', 'contract', 'delete', 'publish'];
  for (let t = 0; t < 300; t++) {
    const n = 2 + Math.floor(rnd() * 6);
    const ws = Array.from({ length: n }, () => WORDS[Math.floor(rnd() * WORDS.length)]);
    const hasDoor = rnd() > 0.7;
    if (hasDoor) ws.push(DOORWORDS[Math.floor(rnd() * 4)]);
    const text = ws.join(' ');
    const a = collapse(text, SHADOW), b = collapse(text, SHADOW);
    assert.deepEqual(a, b, 'no moods');
    assert.ok(a.ok);
    assert.ok(['door', 'reuse', 'recombine', 'generate'].includes(a.mode));
    if (hasDoor) assert.equal(a.mode, 'door', 'a door word ALWAYS wins, whatever else the intent says');
    assert.ok(typeof (a.why || a.brief) === 'string', 'every collapse speaks');
  }
});
