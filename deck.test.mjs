import { test } from 'node:test';
import assert from 'node:assert/strict';
import D, { RARITY_ORDER, PROOF_ORDER, CREATURE, ORGAN, cardOf, creatureCard, organCard, tongueCard, sentinelCard, airgapCard, ledgerCard, seedLibraryCard, attestCard, sigil, ringsOf, rarityTable, traitTable, filterDeck, realness } from './deck.mjs';
import { fnv1a } from './trial.mjs';

const E = (o = {}) => ({ id: 'forge', name: 'The Forge', does: 'makes cards', rarity: 'unique', why: 'held', tier: 'proven', evidence: 'gate @ abc1234', seat: 'work', kind: 'mine', by: 'Simon Gant', live: true, url: 'https://x/', ...o });

test('the orders and the default export', () => {
  assert.deepEqual(RARITY_ORDER, ['unknown', 'normal', 'magic', 'rare', 'unique', 'set']);
  assert.deepEqual(PROOF_ORDER, ['prototype', 'works', 'proven']);
  assert.deepEqual(CREATURE, { champion: 'Champion', ancestor: 'Ancestor', first: 'First of its line' });
  assert.deepEqual(ORGAN, { grown: 'Grown organ', hand: 'Hand-built organ' });
  assert.ok(Object.isFrozen(RARITY_ORDER) && Object.isFrozen(PROOF_ORDER) && Object.isFrozen(CREATURE) && Object.isFrozen(ORGAN));
  assert.equal(Object.keys(D).length, 19);
  assert.equal(D.tongueCard, tongueCard);
  assert.equal(D.sentinelCard, sentinelCard);
  assert.equal(D.airgapCard, airgapCard);
  assert.equal(D.ledgerCard, ledgerCard);
  assert.equal(D.seedLibraryCard, seedLibraryCard);
  assert.equal(D.attestCard, attestCard);
  assert.equal(D.organCard, organCard);
  assert.equal(D.realness, realness);
});

test('cardOf: a catalogue entry becomes a card', () => {
  assert.deepEqual(cardOf(E()), {
    id: 'forge', name: 'The Forge', does: 'makes cards', rarity: 'unique', label: 'Unique', why: 'held', proof: 'proven',
    evidence: 'gate @ abc1234', seat: 'work', kind: 'mine', by: 'Simon Gant', live: true, url: 'https://x/',
    genes: fnv1a('forge|unique|proven|work|mine'),
  });
  const bare = cardOf({ id: 'b', rarity: 'normal' });
  assert.deepEqual(bare, { id: 'b', name: 'b', does: '', rarity: 'normal', label: 'Normal', why: '', proof: 'prototype', evidence: '', seat: 'work', kind: 'mine', by: '', live: false, url: null, genes: fnv1a('b|normal|prototype||') });
  assert.equal(cardOf(E({ tier: 'godlike' })).proof, 'prototype');
  assert.equal(cardOf(E({ tier: 'works' })).proof, 'works');
  assert.equal(cardOf(E({ live: 'yes' })).live, false);
  assert.equal(cardOf(E({ name: 7, does: null })).name, 'forge');
  for (const bad of [null, [], 'x', E({ id: '' }), E({ id: 5 }), E({ rarity: 'mythic' }), E({ rarity: undefined })]) assert.equal(cardOf(bad), null);
});

test('creatureCard: the evolution\'s creatures, credited', () => {
  assert.deepEqual(creatureCard({ key: 'UV|515', gen: 14 }, 'champion'), {
    id: 'creature-14-UV|515', name: 'UV|515', does: 'generation 14 of the sealed evolution', rarity: 'champion', label: 'Champion',
    why: '', proof: 'proven', evidence: '', seat: 'creature', kind: 'creature', by: 'the creatures of kard-evolve', live: true,
    url: 'https://sjgant80-hub.github.io/kard-evolve/', genes: fnv1a('creature|UV|515'),
  });
  assert.equal(creatureCard({ key: '|642', gen: 0 }, 'first').label, 'First of its line');
  assert.equal(creatureCard({ key: 'U7|545', gen: 7 }, 'ancestor').rarity, 'ancestor');
  for (const [c, r] of [[null, 'champion'], [{ key: '', gen: 1 }, 'champion'], [{ key: 'k', gen: 1.5 }, 'champion'], [{ key: 'k', gen: 1 }, 'queen'], [{ key: 'k' }, 'first']]) {
    assert.equal(creatureCard(c, r), null);
  }
});

test('organCard: the grown and the hand-built funnel organs, credited', () => {
  const o = { seed: 4, key: '91.2.1516397.4.7.2.0.5.0.1.1.4', elements: ['own', 'shape', 7, 'connect'], heldAuc: 0.826104 };
  assert.deepEqual(organCard(o, 'grown'), {
    id: 'organ-grown-4', name: 'Funnel organ, grown · seed 4', does: 'held-out AUC 0.826 on November and December · own, shape, connect',
    rarity: 'grown', label: 'Grown organ', why: '', proof: 'proven', evidence: '', seat: 'organ', kind: 'organ', by: 'pattern-organs', live: true,
    url: 'https://sjgant80-hub.github.io/pattern-organs/', genes: fnv1a('organ|grown|91.2.1516397.4.7.2.0.5.0.1.1.4'),
  });
  const h = organCard({ ...o, elements: undefined }, 'hand');
  assert.equal(h.name, 'Funnel organ, hand-built · seed 4');
  assert.equal(h.label, 'Hand-built organ');
  assert.equal(h.does, 'held-out AUC 0.826 on November and December');
  assert.equal(h.genes, fnv1a('organ|hand|' + o.key));
  assert.equal(organCard({ ...o, elements: [] }, 'grown').does, 'held-out AUC 0.826 on November and December');
  for (const [c, r] of [[null, 'grown'], [{ ...o, key: '' }, 'grown'], [{ ...o, seed: 1.5 }, 'grown'], [{ ...o, heldAuc: NaN }, 'grown'], [{ ...o, heldAuc: '0.8' }, 'hand'], [o, 'random'], [o, 'toString']]) {
    assert.equal(organCard(c, r), null);
  }
});

test('tongueCard: the Konomi Tongue against the 15× it was sealed to reach', () => {
  const v = { passed: 3, of: 11, text: 1.05, json: 2.72, combined: 2.07 };
  assert.deepEqual(tongueCard(v), {
    id: 'tongue', name: 'The Konomi Tongue', does: 'text 1.05× · JSON 2.72× · coded text as a picture 2.07× — against 15× (sealed 3 of 11)',
    rarity: 'tongue', label: 'Tongue', why: '', proof: 'proven', evidence: '', seat: 'language', kind: 'tongue', by: 'konomi-tongue', live: true,
    url: 'https://sjgant80-hub.github.io/konomi-tongue/', genes: fnv1a('tongue|3|1.05|2.72'),
  });
  for (const bad of [null, [], { ...v, passed: 1.5 }, { ...v, of: '11' }, { ...v, text: NaN }, { ...v, json: '2' }, { ...v, combined: undefined }]) assert.equal(tongueCard(bad), null);
});

test('sentinelCard: the immune system, what it caught and let through', () => {
  const v = { passed: 6, of: 6, hard: { caught: 72, attacks: 72, falsePass: 0 }, grown: { grownCatch: 27, baselineCatch: 11, heldAttacks: 27 } };
  const c = sentinelCard(v);
  assert.equal(c.id, 'sentinel');
  assert.equal(c.rarity, 'sentinel');
  assert.equal(c.label, 'Sentinel');
  assert.equal(c.kind, 'sentinel');
  assert.equal(c.proof, 'proven');
  assert.equal(c.url, 'https://sjgant80-hub.github.io/sentinel/');
  assert.ok(c.does.includes('72 of 72') && c.does.includes('27 of 27') && c.does.includes('6 of 6'));
  assert.equal(c.genes, fnv1a('sentinel|6|72|27'));
  for (const bad of [null, [], { ...v, passed: 1.5 }, { ...v, hard: null }, { ...v, grown: null }, { ...v, hard: { ...v.hard, caught: '72' } }]) assert.equal(sentinelCard(bad), null);
});

test('airgapCard: the 6-byte transport, the ratios and the signature floor', () => {
  const v = { passed: 5, of: 5, coord: 31, delta: 145, wire: 3.28 };
  const c = airgapCard(v);
  assert.equal(c.id, 'airgap');
  assert.equal(c.rarity, 'airgap');
  assert.equal(c.label, 'Air-gap');
  assert.equal(c.kind, 'airgap');
  assert.equal(c.seat, 'transport');
  assert.equal(c.proof, 'proven');
  assert.equal(c.url, 'https://sjgant80-hub.github.io/fall-airgap/');
  assert.ok(c.does.includes('31×') && c.does.includes('145×') && c.does.includes('3.28×') && c.does.includes('5 of 5'));
  assert.equal(c.genes, fnv1a('airgap|5|31|145'));
  for (const bad of [null, [], { ...v, passed: 1.5 }, { ...v, of: '5' }, { ...v, coord: NaN }, { ...v, delta: '145' }, { ...v, wire: undefined }]) assert.equal(airgapCard(bad), null);
});

test('ledgerCard: IndexedDB as the Shadow Fold, step 4 of 4', () => {
  const v = { N: 10000, byteIdentical: true, ratioPayloadVsJson: 25.9, ratioSignedVsJsonSigned: 3.55, ledgerPayloadKB: 58.6, jsonMB: 1.48, replayMs10k: 16.252, poisonedEqualsClean: true, verdictPassed: 6, verdictOf: 6 };
  assert.deepEqual(ledgerCard(v), {
    id: 'kestrel-ledger', name: 'KESTREL-LEDGER',
    does: 'resumes mid-thought: 10000 mutations reconstruct byte-identical · 6-byte ledger ~25.9× smaller than JSON · 10k replay 16.252ms · poisoned ledger rejected (sealed 6 of 6)',
    rarity: 'ledger', label: 'Ledger', why: '', proof: 'proven', evidence: '', seat: 'memory', kind: 'ledger',
    by: 'kestrel-ledger', live: true, url: 'https://sjgant80-hub.github.io/kestrel-ledger/', genes: fnv1a('ledger|6|25.9|10000'),
  });
  for (const bad of [null, [], { ...v, N: 1.5 }, { ...v, N: '10000' }, { ...v, verdictPassed: 1.5 }, { ...v, verdictOf: '6' }, { ...v, ratioPayloadVsJson: NaN }, { ...v, replayMs10k: undefined }]) assert.equal(ledgerCard(bad), null);
});

test('attestCard: the trust rail turned inward, the estate’s own claims re-run', () => {
  const v = { held: 18, of: 18, total: 1768, pages: 1545, live: 540 };
  assert.deepEqual(attestCard(v), {
    id: 'estate-attest', name: 'ESTATE-ATTEST',
    does: '18 of 18 of the estate’s own claims re-run and HOLD against the real index · 1768 repos recomputed · 1545 pages enabled but only 540 verified live',
    rarity: 'attest', label: 'Attest', why: '', proof: 'proven', evidence: '', seat: 'trust', kind: 'attest',
    by: 'estate-attest', live: true, url: 'https://sjgant80-hub.github.io/estate-attest/', genes: fnv1a('attest|18|1768|540'),
  });
  for (const bad of [null, [], { ...v, held: 1.5 }, { ...v, of: '18' }, { ...v, total: NaN }, { ...v, pages: undefined }, { ...v, live: '540' }]) assert.equal(attestCard(bad), null);
});

test('seedLibraryCard: knowledge in tiny seeds, not weights', () => {
  const v = { libraryBytes: 226, grownBytes: 1129, domains: 4, sessions: 12330, shopperAuc: 0.82, triageAuc: 0.95, waterAuc: 0.75, cropAuc: 0.75, minRatio: 3.4, maxRatio: 6.2, growMs: 357, growDomain: 'triage', sporeBytes: 32, sporeGrownBytes: 4739, sporeRatio: 148, sporeAuc: 0.82, allOffline: true, allGuarded: true };
  assert.deepEqual(seedLibraryCard(v), {
    id: 'seed-library', name: 'SEED-LIBRARY',
    does: 'knowledge in seeds, not weights: the whole 4-domain library is 226 bytes → 1129-byte builds · held-out AUC shopper 0.82 / triage 0.95 / water 0.75 / crop 0.75 · seeds 3.4–6.2× smaller than grown · grows one domain offline in 357ms · every tampered seed refused · fall-spore bonus 148× on real UCI',
    rarity: 'seedlib', label: 'Seed', why: '', proof: 'proven', evidence: '', seat: 'memory', kind: 'seedlib',
    by: 'seed-library', live: true, url: 'https://sjgant80-hub.github.io/seed-library/', genes: fnv1a('seedlib|226|4|0.82'),
  });
  for (const bad of [null, [], { ...v, libraryBytes: 1.5 }, { ...v, grownBytes: 1.1 }, { ...v, domains: '4' }, { ...v, shopperAuc: NaN }, { ...v, growMs: undefined }, { ...v, sporeRatio: '148' }]) assert.equal(seedLibraryCard(bad), null);
});

test('sigil: the same genes always grow the same art', () => {
  assert.equal(sigil(0, 1),
    '<svg viewBox="0 0 100 100" class="sigil" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none"/><g class="petals">'
    + '<ellipse cx="50" cy="35" rx="2.5" ry="9" transform="rotate(0.00 50 50)"/>'
    + '<ellipse cx="50" cy="35" rx="2.5" ry="9" transform="rotate(120.00 50 50)"/>'
    + '<ellipse cx="50" cy="35" rx="2.5" ry="9" transform="rotate(240.00 50 50)"/>'
    + '</g><circle cx="50" cy="50" r="4" class="core"/></svg>');
  const g = 205245;   // sym 6, len 25, wid 6, turn 100
  const s = sigil(g, 3);
  assert.equal((s.match(/<ellipse/g) || []).length, 6);
  assert.equal(s, '<svg viewBox="0 0 100 100" class="sigil" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none"/><circle cx="50" cy="50" r="42" fill="none"/><circle cx="50" cy="50" r="38" fill="none"/><g class="petals">'
    + [100, 160, 220, 280, 340, 40].map((a) => '<ellipse cx="50" cy="31.5" rx="3" ry="12.5" transform="rotate(' + a + '.00 50 50)"/>').join('')
    + '</g><circle cx="50" cy="50" r="4" class="core"/></svg>');
  assert.equal((sigil(g, 2).match(/fill="none"/g) || []).length, 2);
  const h = 15 + (15 << 3) + (8 << 7) + (359 << 11);   // sym 8, len 18, wid 7, turn 359
  assert.equal((sigil(h, 1).match(/<ellipse/g) || []).length, 8);
  assert.ok(sigil(h, 1).includes('<ellipse cx="50" cy="35" rx="3.5" ry="9" transform="rotate(359.00 50 50)"/><ellipse cx="50" cy="35" rx="3.5" ry="9" transform="rotate(44.00 50 50)"/>'));
  const seven = 1144;   // sym 7, len 33, wid 13, turn 0: petals off the whole degrees
  assert.ok(sigil(seven, 1).includes('rotate(51.43 50 50)') && sigil(seven, 1).includes('rotate(308.57 50 50)'));
  assert.ok(sigil(seven, 1).includes('cy="27.5" rx="6.5" ry="16.5"'));
  assert.ok(sigil(0xffffffff, 1).startsWith('<svg'));
  for (const [g2, r] of [[-1, 1], [1.5, 1], [2 ** 32, 1], ['5', 1], [5, 0], [5, 4], [5, 1.5]]) assert.equal(sigil(g2, r), null);
  assert.deepEqual(['prototype', 'works', 'proven', 'odd'].map(ringsOf), [1, 2, 3, 1]);
});

const deck = () => [cardOf(E({ id: 'a', rarity: 'set', seat: 'money' })), cardOf(E({ id: 'b', rarity: 'set', tier: 'works', does: 'reads cards' })),
  cardOf(E({ id: 'c', rarity: 'magic', seat: 'money', tier: 'prototype', live: false, name: 'Card Maker' })), cardOf(E({ id: 'd', rarity: 'normal', seat: 'people', tier: 'prototype' }))];

test('rarityTable: every rarity, counted, as a share of the whole', () => {
  assert.deepEqual(rarityTable([...deck(), null, { rarity: 'mythic' }, creatureCard({ key: 'k', gen: 1 }, 'champion')]), [
    { rarity: 'unknown', label: 'Unidentified', count: 0, pct: 0 }, { rarity: 'normal', label: 'Normal', count: 1, pct: 25 },
    { rarity: 'magic', label: 'Magic', count: 1, pct: 25 }, { rarity: 'rare', label: 'Rare', count: 0, pct: 0 },
    { rarity: 'unique', label: 'Unique', count: 0, pct: 0 }, { rarity: 'set', label: 'Set', count: 2, pct: 50 }]);
  assert.equal(rarityTable([cardOf(E({ rarity: 'set' })), cardOf(E({ rarity: 'rare' })), cardOf(E({ rarity: 'rare' }))])[3].pct, 66.7);
  assert.deepEqual(rarityTable([]).map((r) => r.pct), [0, 0, 0, 0, 0, 0]);
  assert.equal(rarityTable(null), null);
});

test('traitTable: most common first, ties by name', () => {
  assert.deepEqual(traitTable(deck(), 'seat'), [{ value: 'money', count: 2 }, { value: 'people', count: 1 }, { value: 'work', count: 1 }]);
  assert.deepEqual(traitTable([...deck(), null, { seat: 3 }], 'proof'), [{ value: 'prototype', count: 2 }, { value: 'proven', count: 1 }, { value: 'works', count: 1 }]);
  assert.deepEqual(traitTable([{ s: 'b' }, { s: 'a' }], 's'), [{ value: 'a', count: 1 }, { value: 'b', count: 1 }]);
  for (const [c, k] of [[null, 'seat'], [deck(), ''], [deck(), 5]]) assert.equal(traitTable(c, k), null);
});

test('filterDeck narrows by rarity, seat, proof and words', () => {
  const ids = (q) => filterDeck(deck(), q).map((c) => c.id);
  assert.deepEqual(ids(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids({ rarity: 'set' }), ['a', 'b']);
  assert.deepEqual(ids({ seat: 'money' }), ['a', 'c']);
  assert.deepEqual(ids({ proof: 'works' }), ['b']);
  assert.deepEqual(ids({ text: 'READS' }), ['b']);
  assert.deepEqual(ids({ text: 'card maker' }), ['c']);
  assert.deepEqual(ids({ text: '  ' }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids({ text: 'd' }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids({ text: 'forge x' }), []);
  assert.deepEqual(ids({ rarity: 'set', seat: 'money', proof: 'proven', text: 'cards' }), ['a']);
  assert.deepEqual(filterDeck([null, ...deck()], []).length, 4);
  assert.deepEqual(filterDeck(null, {}), []);
});

test('realness is read from the cards, never said', () => {
  const d = deck();
  assert.equal(realness(['a'], d).state, 'proven');
  assert.equal(realness(['a', 'b'], d).state, 'tested');
  assert.equal(realness(['a', 'c'], d).state, 'built');
  assert.equal(realness(['a', 'd'], d).state, 'live');
  assert.deepEqual(realness(['a', 'zz'], d), { state: 'partial', found: ['a'], missing: ['zz'] });
  assert.deepEqual(realness(['zz'], d), { state: 'designed', found: [], missing: ['zz'] });
  assert.equal(realness(['a'], [null, ...d]).state, 'proven');
  for (const [ids, c] of [[[], d], [null, d], [['a'], null]]) assert.equal(realness(ids, c), null);
});
