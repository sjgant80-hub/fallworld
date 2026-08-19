// fallworld · mind.test.mjs — reading the studied mind, every rule falsifiable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validMind, associatesFor, wondersOf } from './mind.mjs';

const MIND = () => ({
  v: 1, kind: 'sididy-mind', exported: '2026-08-19', studied: 1747,
  mind: {
    fallworld: [
      { to: 'acg-assessor', w: 0.618, via: 'fallworld -reuses→ memory:fallkard-forge · …', at: '2026-08-19' },
      { to: 'witness', w: 0.5, via: 'via the build chats', at: '2026-08-19' },
    ],
    agora: [{ to: 'the-wallet', w: 0.618, via: 'signed transfers kinship', at: '2026-08-18' }],
    tiny: [{ to: 'never-matched-by-text', w: 0.9, via: 'x', at: 'y' }],
  },
  wonders: [
    { root: 'memory:the-machine', node: 'attractor', w: 0.618 },
    { root: 'memory:verify-like-a-human', node: 'airgap', w: 0.618 },
  ],
});

test('VALIDMIND SAYS YES WITH THE COUNT AND NO WITH THE REASON — a wrong file never half-loads', () => {
  const v = validMind(MIND());
  assert.equal(v.ok, true);
  assert.match(v.why, /3 studied node\(s\) · exported 2026-08-19/);
  assert.match(validMind(null).why, /not a file this page can read/);
  assert.match(validMind({ kind: 'fold-glyph' }).why, /not a si-didy mind/);
  assert.match(validMind({ kind: 'sididy-mind' }).why, /a label, not a mind/);
  assert.match(validMind({ kind: 'sididy-mind', mind: {} }).why, /empty — study first/);
  assert.match(validMind({ kind: 'sididy-mind', mind: { a: [] } }).why, /\(undated\)/, 'a missing export date is said, not invented');
});

test('ASSOCIATES MATCH THE QUESTION AND THE FITTED TOOLS — strongest first, provenance riding', () => {
  const m = MIND();
  const a = associatesFor(m, 'should fallworld get a new door?', []);
  assert.equal(a[0].to, 'acg-assessor');
  assert.equal(a[0].w, 0.618);
  assert.match(a[0].via, /memory:fallkard-forge/);
  assert.equal(a[1].to, 'witness');
  assert.equal(a.length, 2, 'only the matched root associates ride');
  // a fitted tool matches by exact id even when the text never names it
  const b = associatesFor(m, 'nothing relevant here', ['agora']);
  assert.deepEqual(b.map(x => x.to), ['the-wallet']);
  // both at once: dedup by target, sorted by weight then name
  const c = associatesFor(m, 'fallworld?', ['agora']);
  assert.deepEqual(c.map(x => x.to), ['acg-assessor', 'the-wallet', 'witness']);
});

test('SHORT IDS NEVER MATCH BY TEXT — and matched roots are not re-suggested as targets', () => {
  const m = MIND();
  assert.deepEqual(associatesFor(m, 'a tiny question', []), [],
    'the 4-char id "tiny" must not text-match — short names false-positive too easily');
  assert.deepEqual(associatesFor(m, 'tiny', ['tiny']).map(x => x.to), ['never-matched-by-text'],
    'but an exact fitted id of any length matches');
  // a root that is also another root's target is not duplicated
  const m2 = MIND();
  m2.mind['acg-assessor'] = [{ to: 'fallworld', w: 0.9, via: 'v', at: 'a' }];
  const out = associatesFor(m2, 'fallworld and acg-assessor together', []);
  assert.ok(!out.some(x => x.to === 'fallworld'), 'a matched root never comes back as its own suggestion');
});

test('THE CAP HOLDS AND DEFAULTS TO SIX', () => {
  const m = { kind: 'sididy-mind', mind: { longword: Array.from({ length: 12 }, (_, i) => ({ to: 't' + i, w: 1 - i * 0.01, via: '', at: '' })) } };
  assert.equal(associatesFor(m, 'longword', []).length, 6);
  assert.equal(associatesFor(m, 'longword', [], 2).length, 2);
  assert.equal(associatesFor(m, 'longword', [], 0).length, 6, 'a garbage cap falls to the default');
});

test('WONDERS COME BACK BOUNDED AND WELL-FORMED — garbage entries are dropped, not shown', () => {
  const w = wondersOf(MIND(), 1);
  assert.equal(w.length, 1);
  assert.equal(w[0].node, 'airgap', 'the LAST wonders are the freshest dreams');
  assert.equal(wondersOf(MIND()).length, 2, 'the default cap is three, and two is all there is');
  const dirty = { kind: 'sididy-mind', mind: { a: [] }, wonders: [null, 7, { root: 'r' }, { root: 'r', node: 'n' }] };
  assert.deepEqual(wondersOf(dirty, 5).map(x => x.node), ['n']);
});

test('FUZZ: total on garbage', () => {
  for (const g of [null, undefined, 0, 'x', [], {}, { kind: 'sididy-mind', mind: { a: 'not-a-list' } }]) {
    validMind(g); associatesFor(g, 'x', ['y']); wondersOf(g);
  }
  assert.deepEqual(associatesFor(MIND(), null, null), []);
  assert.deepEqual(associatesFor({ kind: 'sididy-mind', mind: { fallworld: [null, 9, { to: 42 }] } }, 'fallworld', []), [],
    'malformed associations are skipped, never shown');
  assert.ok(true);
});


// ─── round two: the gate found seven gaps — each dies here ───

test('AN EXACTLY-FIVE-CHAR ID TEXT-MATCHES — agora is a word, not noise', () => {
  const a = associatesFor(MIND(), 'is agora ready for the fair?', []);
  assert.deepEqual(a.map(x => x.to), ['the-wallet'], 'five characters is the inclusive floor');
});

test('CAP ONE IS ONE — the floor of the cap is inclusive', () => {
  const m = { kind: 'sididy-mind', mind: { longword: Array.from({ length: 12 }, (_, i) => ({ to: 't' + i, w: 1 - i * 0.01, via: '', at: '' })) } };
  assert.equal(associatesFor(m, 'longword', [], 1).length, 1);
});

test('A NON-STRING STUDY DATE READS AS EMPTY, NEVER AS THE VALUE', () => {
  const m = { kind: 'sididy-mind', mind: { fallworld: [{ to: 'x', w: 1, via: 'v', at: 99 }] } };
  assert.strictEqual(associatesFor(m, 'fallworld', [])[0].at, '');
});

test('GARBAGE FILES REFUSE WITH THE FIRST REASON — a number and an array are not files', () => {
  assert.match(validMind(7).why, /not a file this page can read/);
  assert.match(validMind([]).why, /not a file this page can read/);
});

test('A FRACTIONAL WONDER CAP FALLS TO THE DEFAULT THREE, NEVER TO EVERYTHING', () => {
  const m = { kind: 'sididy-mind', mind: { a: [] },
    wonders: Array.from({ length: 5 }, (_, i) => ({ root: 'r' + i, node: 'n' + i, w: 0.6 })) };
  assert.equal(wondersOf(m, 0.5).length, 3, 'half a wonder is not a cap');
});

test('EQUAL WEIGHTS SORT BY NAME — the suggestions are deterministic', () => {
  const m = { kind: 'sididy-mind', mind: { longword: [
    { to: 'zz-late', w: 0.5, via: '', at: '' },
    { to: 'aa-early', w: 0.5, via: '', at: '' },
  ] } };
  assert.deepEqual(associatesFor(m, 'longword', []).map(x => x.to), ['aa-early', 'zz-late']);
});
