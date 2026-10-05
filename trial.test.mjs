import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import T, { LABELS, TIER_LABEL, FULL_SET, SAYS_MAX, RULES_TEXT, factsOf, rarityRule, fnv1a, pickTrial, trialPrompt, gradeReply, scoreStage, judgeTrial } from './trial.mjs';

const F = (o = {}) => ({ name: 'x', says: 'does x', described: true, live: true, proven: false, companions: 0, ...o });

test('the labels and constants', () => {
  assert.deepEqual(LABELS, ['Unidentified', 'Normal', 'Magic', 'Rare', 'Unique', 'Set']);
  assert.ok(Object.isFrozen(LABELS) && Object.isFrozen(TIER_LABEL));
  assert.deepEqual(TIER_LABEL, { unknown: 'Unidentified', normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique', set: 'Set', ledger: 'Ledger' });
  assert.equal(FULL_SET, 3);
  assert.equal(SAYS_MAX, 160);
  assert.equal(T.factsOf, factsOf);
  assert.equal(T.judgeTrial, judgeTrial);
  assert.equal(Object.keys(T).length, 13);
});

test('factsOf reads the four facts and what the card says of itself', () => {
  for (const bad of [null, undefined, 3, 'x', [], [1]]) assert.equal(factsOf(bad), null);
  assert.deepEqual(factsOf({ name: 'a-b', title: 'a b', desc: '  does a  ', live: true, proof: { tier: 'proven' }, set: ['api', 'mcp', 'sdk'] }),
    { name: 'a b', says: 'does a', described: true, live: true, proven: true, companions: 3 });
  assert.equal(factsOf({ name: 'n' }).name, 'n');
  assert.equal(factsOf({}).name, '');
  const blank = factsOf({ desc: '   ', live: 'true', proof: { tier: 'works' }, set: 'api' });
  assert.deepEqual([blank.says, blank.described, blank.live, blank.proven, blank.companions], ['', false, false, false, 0]);
  assert.equal(factsOf({ desc: 7 }).described, false);
  assert.equal(factsOf({ proof: 'proven' }).proven, false);
  assert.equal(factsOf({ proof: ['proven'] }).proven, false);
  const exact = 'e'.repeat(SAYS_MAX);
  assert.equal(factsOf({ desc: exact }).says, exact);
  const long = factsOf({ desc: 'L'.repeat(SAYS_MAX + 1) }).says;
  assert.equal(long.length, SAYS_MAX);
  assert.equal(long, 'L'.repeat(SAYS_MAX - 1) + '…');
});

test('rarityRule is the world\'s rule, first match wins', () => {
  assert.equal(rarityRule(F({ described: false, live: true, proven: true, companions: 3 })), 'Unidentified');
  assert.equal(rarityRule(F({ live: false, proven: true, companions: 3 })), 'Normal');
  assert.equal(rarityRule(F({ proven: true, companions: 3 })), 'Set');
  assert.equal(rarityRule(F({ proven: true, companions: 4 })), 'Set');
  assert.equal(rarityRule(F({ proven: true, companions: 2 })), 'Unique');
  assert.equal(rarityRule(F({ companions: 3 })), 'Rare');
  assert.equal(rarityRule(F({ companions: 2 })), 'Magic');
  assert.equal(rarityRule(F()), 'Magic');
  for (const bad of [null, [], 'x', F({ described: 'yes' }), F({ live: 1 }), F({ proven: null }), F({ companions: -1 }), F({ companions: 1.5 }), F({ companions: '3' })]) {
    assert.equal(rarityRule(bad), null);
  }
});

test('the rule agrees with every card build-world.mjs actually graded', () => {
  const w = JSON.parse(readFileSync(new URL('./world.json', import.meta.url), 'utf8'));
  assert.ok(w.items.length > 100);
  const off = w.items.filter((i) => rarityRule(factsOf(i)) !== TIER_LABEL[i.tier]).map((i) => i.name);
  assert.deepEqual(off, []);
});

test('fnv1a is the standard 32-bit hash', () => {
  assert.equal(fnv1a(''), 2166136261);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(fnv1a('foobar'), 0xbf9cf968);
  assert.equal(fnv1a(12), fnv1a('12'));
  assert.notEqual(fnv1a('ab'), fnv1a('ba'));
  assert.equal(fnv1a('😀'), fnv1a('\u{1F600}'));
  assert.notEqual(fnv1a('😀'), fnv1a('\uD83D'));
  assert.ok(fnv1a('zzzzzzzzzz') >= 0);
});

const world = () => {
  const out = [];
  for (const [tier, n] of Object.entries({ unknown: 3, normal: 3, magic: 3, rare: 3, unique: 3, set: 3 })) {
    for (let k = 0; k < n; k++) out.push({ name: tier + k, tier, desc: tier === 'unknown' ? '' : 'd', live: tier !== 'normal', proof: { tier: tier === 'unique' || tier === 'set' ? 'proven' : 'prototype' }, set: tier === 'rare' || tier === 'set' ? [1, 2, 3] : [] });
  }
  return out;
};

test('pickTrial takes the same share of every rarity, by a seeded order', () => {
  for (const [items, per] of [[null, 1], [{}, 1], [world(), 0], [world(), 1.5], [world(), -1], [world(), '1']]) assert.equal(pickTrial(items, 's', per), null);
  const t = pickTrial(world(), 's', 2);
  assert.equal(t.length, 12);
  assert.deepEqual(t.map((x) => x.answer), ['Unidentified', 'Unidentified', 'Normal', 'Normal', 'Magic', 'Magic', 'Rare', 'Rare', 'Unique', 'Unique', 'Set', 'Set']);
  for (const x of t) assert.equal(rarityRule(x.facts), x.answer);
  const order = (seed) => ['unknown0', 'unknown1', 'unknown2'].map((n) => ({ n, k: fnv1a(seed + '|' + n) })).sort((a, b) => a.k - b.k).map((o) => o.n);
  assert.deepEqual(t.slice(0, 2).map((x) => x.id), order('s').slice(0, 2));
  assert.deepEqual(pickTrial(world(), 's', 2), t);
  const seeds = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => pickTrial(world(), s, 1).map((x) => x.id).join());
  assert.ok(new Set(seeds).size > 1);
  assert.equal(pickTrial(world(), 's', 3).length, 18);
  assert.equal(pickTrial(world(), 's', 4), null);
  assert.equal(pickTrial([...world(), null, 7, { name: 'odd', tier: 'mythic' }], 's', 3).length, 18);
  assert.deepEqual(t[0].facts, factsOf(world().find((i) => i.name === t[0].id)));
});

test('the prompt is the rules, the card, and the ask', () => {
  assert.equal(RULES_TEXT.length, 6);
  assert.ok(RULES_TEXT[2].includes('(' + FULL_SET + ' or more)') && RULES_TEXT[4].includes('(' + FULL_SET + ' or more)'));
  for (const bad of [null, {}, F({ live: 'no' })]) assert.equal(trialPrompt(bad), null);
  assert.equal(trialPrompt(F({ name: 'the forge', says: 'makes cards', proven: true, companions: 2 })),
    'You are reading one card in Fall World. Its rarity is decided by these rules, checked in this order; the first rule that applies decides.\n'
    + '1. If nothing describes what it does, it is Unidentified.\n'
    + '2. Otherwise, if there is nothing live to open, it is Normal.\n'
    + '3. Otherwise, if a machine tried to break it and it held, and it ships a full set of companions (3 or more), it is Set.\n'
    + '4. Otherwise, if a machine tried to break it and it held, it is Unique.\n'
    + '5. Otherwise, if it ships a full set of companions (3 or more), it is Rare.\n'
    + '6. Otherwise, it is Magic.\n\n'
    + 'The card: the forge\n'
    + '- what it says about itself: makes cards\n'
    + '- something describes what it does: yes\n'
    + '- there is something live to open: yes\n'
    + '- a machine tried to break it and it held: yes\n'
    + '- companions it ships: 2\n\n'
    + 'Answer with the rarity only, one word.');
  const p = trialPrompt(F({ name: '', says: '', described: false, live: false }));
  assert.ok(p.includes('The card: (no name)\n- what it says about itself: (nothing)\n- something describes what it does: no\n- there is something live to open: no\n- a machine tried to break it and it held: no\n- companions it ships: 0'));
});

test('gradeReply names one rarity or none', () => {
  assert.deepEqual(gradeReply('Rare'), { said: 'Rare', bare: true });
  assert.deepEqual(gradeReply('  set. '), { said: 'Set', bare: true });
  assert.deepEqual(gradeReply('**Unique**'), { said: 'Unique', bare: true });
  assert.deepEqual(gradeReply('"magic"!'), { said: 'Magic', bare: true });
  assert.deepEqual(gradeReply('`Normal`'), { said: 'Normal', bare: true });
  assert.deepEqual(gradeReply("'Unidentified'"), { said: 'Unidentified', bare: true });
  assert.deepEqual(gradeReply('The card is Magic.'), { said: 'Magic', bare: false });
  assert.deepEqual(gradeReply('Rare. It is rare.'), { said: 'Rare', bare: false });
  assert.deepEqual(gradeReply('Rare, not Set'), { said: null, bare: false });
  assert.deepEqual(gradeReply('Legendary'), { said: null, bare: false });
  assert.deepEqual(gradeReply('settings'), { said: null, bare: false });
  assert.deepEqual(gradeReply(''), { said: null, bare: false });
  for (const bad of [null, 5, {}]) assert.deepEqual(gradeReply(bad), { said: null, bare: false });
});

test('scoreStage counts right, bare and silent, and lists the misses', () => {
  const trial = [{ id: 'a', answer: 'Rare' }, { id: 'b', answer: 'Set' }, { id: 'c', answer: 'Magic' }, { id: 'd', answer: 'Normal' }];
  for (const [t, r] of [[trial, ['Rare']], [null, []], [trial, 'Rare']]) assert.equal(scoreStage(t, r), null);
  assert.deepEqual(scoreStage(trial, ['Rare', 'It is Set.', 'Unique', 'no idea']), {
    n: 4, right: 2, bare: 2, silent: 1,
    missed: [{ id: 'c', answer: 'Magic', said: 'Unique' }, { id: 'd', answer: 'Normal', said: null }],
  });
});

test('judgeTrial: the sealed rules, each at its edge', () => {
  const S = (id, paramsB, right, n = 60) => ({ id, paramsB, right, n });
  for (const [st, bar] of [
    [null, 57], [[S('a', 1, 10)], 57], [[S('a', 1, 10), S('b', 7, 58)], 0], [[S('a', 1, 10), S('b', 7, 58)], 57.5],
    [[S('a', 1, 10), S('b', 7, 58)], 61], [[S('a', 7, 10), S('b', 1, 58)], 57], [[S('a', 1, 10), S('b', 1, 58)], 57],
    [[S('a', 1, 61), S('b', 7, 58)], 57], [[S('a', 1, 10.5), S('b', 7, 58)], 57], [[S('a', 1, 10), S('b', 7, 58, 60.5)], 57],
    [[S('a', '1', 10), S('b', 7, 58)], 57], [[S('a', 1, 10), null], 57], [[S('a', 1, 10), S('b', 7, 58)], '57'],
  ]) assert.equal(judgeTrial(st, bar).ok, false);
  const good = judgeTrial([S('hatchling', 1.2, 30), S('runner', 7.6, 57), S('keeper', 14.8, 60)], 57);
  assert.equal(good.chosen, 'runner');
  assert.deepEqual(good.rules, [
    { id: 'bar-cleared', pass: true, value: 'runner is the smallest stage that clears 57' },
    { id: 'size-helps', pass: true, value: 'hatchling 30/60 · runner 57/60 · keeper 60/60' },
    { id: 'hatchling-short', pass: true, value: 'hatchling 30/60, short of 57' },
    { id: 'smaller-suffices', pass: true, value: 'runner cleared; keeper was not needed' },
  ]);
  assert.equal(good.passed, 4);
  assert.equal(good.of, 4);
  const none = judgeTrial([S('a', 1, 10), S('b', 7, 56)], 57);
  assert.equal(none.chosen, null);
  assert.deepEqual(none.rules.map((r) => [r.pass, r.value]), [[false, 'no stage cleared 57'], [true, 'a 10/60 · b 56/60'], [true, 'a 10/60, short of 57'], [false, 'nothing cleared']]);
  const top = judgeTrial([S('a', 1, 10), S('b', 7, 57)], 57);
  assert.deepEqual(top.rules.map((r) => r.pass), [true, true, true, false]);
  assert.equal(top.rules[3].value, 'only the largest measured stage cleared');
  const hatch = judgeTrial([S('a', 1, 58), S('b', 7, 50)], 57);
  assert.equal(hatch.chosen, 'a');
  assert.deepEqual(hatch.rules.map((r) => r.pass), [true, false, false, true]);
  assert.equal(hatch.rules[2].value, 'a 58/60, clears 57');
  assert.equal(hatch.passed, 2);
  const flat = judgeTrial([S('a', 1, 40), S('b', 7, 40), S('c', 14, 39)], 57);
  assert.deepEqual(flat.rules.map((r) => r.pass), [false, false, true, false]);
  assert.equal(judgeTrial([S('a', 1, 40), S('b', 7, 40)], 57).rules[1].pass, true);
  assert.equal(judgeTrial([S('a', 1, 60), S('b', 7, 60)], 60).chosen, 'a');
  const edge = judgeTrial([S('a', 1, 57), S('b', 7, 59)], 57).rules[2];
  assert.deepEqual([edge.pass, edge.value], [false, 'a 57/60, clears 57']);
});
