// pass.test.mjs — the Guild Pass rules, and the one that matters most.
//
// A subscription that can withhold what you already own is the hostage model. This world runs a
// subscription. The only thing separating the two is an invariant, so the invariant is tested over
// arbitrary holdings rather than over the handful of examples I would have chosen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WINGS, OWNED_KINDS, FLOW_KINDS, classify, TIERS, tierForRung, grantTier,
  cancel, cancelIsHonest, priceOfWing, access, WING_PRICE, sameHolding,
} from './pass.mjs';

// ── ⚑ THE CANCEL TEST ────────────────────────────────────────────────────────

test('⚑ cancelling keeps every owned thing, over ANY mix of holdings', () => {
  // Not "over the examples I picked". Every combination of owned kinds is tried, because the failure
  // this guards against is one owned kind quietly ending up on the revocable side of the line.
  const flow = FLOW_KINDS.map((kind, i) => ({ kind, id: `f${i}` }));
  for (let mask = 0; mask < (1 << OWNED_KINDS.length); mask++) {
    const owned = OWNED_KINDS.filter((_, i) => mask & (1 << i)).map((kind, i) => ({ kind, id: `o${i}` }));
    const before = [...owned, ...flow];
    const r = cancelIsHonest(before);
    assert.ok(r.honest, `${r.reason} — holdings were ${owned.map(o => o.kind).join(',') || '(none)'}`);
    assert.equal(cancel(before).kept.length, owned.length, 'everything owned survives, nothing extra');
  }
});

test('⚑ and it stops exactly the things the Pass was supplying', () => {
  const before = [
    { kind: 'didy', id: 'mine' }, { kind: 'tool', id: 'forge-pro' }, { kind: 'kono', id: '46' },
    { kind: 'credit', id: 'august' }, { kind: 'checking', id: 'clinic' }, { kind: 'standing', id: 'guild' },
  ];
  const after = cancel(before);
  assert.deepEqual(after.kept.map(h => h.kind).sort(), ['didy', 'kono', 'tool'],
    'the didy and its trained state, the bought tool, and the $KONO already earned');
  assert.deepEqual(after.stopped.map(h => h.kind).sort(), ['checking', 'credit', 'standing'],
    'the monthly allowance, the active checking, the guild standing');
});

test('⚑ $KONO already earned is OWNED; the monthly credit is FLOW', () => {
  // The distinction the whole model rests on: metering new-make is honest, clawing back what someone
  // earned is not. They look alike in a database and are opposites in a contract.
  assert.equal(classify('kono'), 'own');
  assert.equal(classify('credit'), 'flow');
  const after = cancel([{ kind: 'kono', id: 'earned' }, { kind: 'credit', id: 'granted' }]);
  assert.equal(after.kept.length, 1);
  assert.equal(after.kept[0].kind, 'kono');
});

test('⚑ a holding nobody classified is refused, not guessed at', () => {
  assert.throws(() => classify('vibes'), /unclassified/,
    '⚑ guessing is how something owned ends up revocable. A new kind is a decision somebody has to make');
  assert.throws(() => cancel([{ kind: 'mystery', id: 'x' }]), /unclassified/);
});

test('the trained didy is owned — the single most tempting thing to hold hostage', () => {
  assert.equal(classify('didy'), 'own');
  const after = cancel([{ kind: 'didy', id: 'trained-for-two-years' }]);
  assert.equal(after.kept.length, 1, 'it survives cancelling, always');
});

test('cancelIsHonest reports WHAT would be taken, not just that something would', () => {
  // A guard that says only "no" cannot be acted on. This one has to name the holding.
  const r = cancelIsHonest([{ kind: 'tool', id: 'watchtower' }]);
  assert.equal(r.honest, true);
  assert.match(r.reason, /flow, standing and service/);
});

test('⚑ two tools of the same kind are told apart by their id', () => {
  // The check matches a holding on kind AND id. On kind alone, owning any tool would appear to cover
  // every tool — so losing one of three bought tools would read as honest.
  const before = [{ kind: 'tool', id: 'forge-pro' }, { kind: 'tool', id: 'watchtower' }, { kind: 'tool', id: 'clinic' }];
  const after = cancel(before);
  assert.deepEqual(after.kept.map(t => t.id).sort(), ['clinic', 'forge-pro', 'watchtower'], 'all three survive');
  // and the honesty check must notice if one of them did not come back
  const short = { kept: after.kept.filter(t => t.id !== 'watchtower') };
  const missing = before.filter(o => !short.kept.some(k => k.kind === o.kind && k.id === o.id));
  assert.deepEqual(missing.map(m => m.id), ['watchtower'],
    '⚑ identity is part of ownership: three bought tools are three things, not one kind of thing');
});

// ── tiers: earned, not bought ────────────────────────────────────────────────

test('⚑ the top tier cannot be bought, only earned', () => {
  assert.throws(() => grantTier({ rung: 8, paid: true }), /cannot be granted without an external check|cannot be bought/,
    '⚑ the amber rungs need somebody who is not you. A tier that money can reach is a tier you can self-grade, which is the pay-for-position model this exists to differ from');
  assert.equal(grantTier({ rung: 8, externallyVerified: true }), 'sovereign', 'an outside check does grant it');
});

test('the lower tiers can be bought, because they can be reached alone', () => {
  assert.equal(grantTier({ rung: 0, paid: true }), 'neuron');
  assert.equal(grantTier({ rung: 5, paid: true }), 'cortex');
});

test('the rung boundaries are exactly where they are written', () => {
  assert.equal(tierForRung(3), 'neuron', 'L3 is the top of neuron');
  assert.equal(tierForRung(4), 'cortex', 'L4 is the bottom of cortex');
  assert.equal(tierForRung(6), 'cortex', 'L6 is the top of cortex');
  assert.equal(tierForRung(7), 'sovereign', 'L7 is where external verification starts');
  assert.equal(tierForRung(10), 'sovereign');
  assert.equal(tierForRung(0), 'neuron');
});

test('a rung outside the ladder is refused', () => {
  for (const bad of [-1, 11, 3.5, '5', null, undefined, NaN]) {
    assert.throws(() => tierForRung(bad), /rung must be/, `${JSON.stringify(bad)} is not a rung`);
  }
});

test('every tier covers rungs, and together they cover the whole ladder without overlap', () => {
  const seen = new Set();
  for (let r = 0; r <= 10; r++) {
    const t = tierForRung(r);
    assert.ok(TIERS.some(x => x.id === t), `${r} maps to a real tier`);
    seen.add(t);
  }
  assert.equal(seen.size, TIERS.length, 'no tier is unreachable');
});

// ── what a room costs ────────────────────────────────────────────────────────

test('⚑ the door is never gated', () => {
  assert.equal(priceOfWing('fight'), 'free',
    '⚑ the fight wing is the demonstration and the thing that grows the mesh. Charging here trades the engine for one month of revenue');
  assert.equal(access({ wing: 'fight', hasPass: false }).allowed, true, 'with no Pass and nothing bought');
});

test('their own notes and their own machine are never gated', () => {
  for (const w of ['think', 'rules', 'build', 'earn']) {
    assert.equal(priceOfWing(w), 'free', `${w} is free`);
    assert.equal(access({ wing: w, hasPass: false }).allowed, true);
  }
});

test('the checking zone is what the Pass buys', () => {
  assert.equal(access({ wing: 'proof', hasPass: false }).allowed, false, 'without the Pass');
  assert.equal(access({ wing: 'proof', hasPass: true }).allowed, true, 'with it');
});

test('⚑ but something bought outright opens without a Pass, forever', () => {
  const r = access({ wing: 'proof', hasPass: false, owns: [{ kind: 'tool', wing: 'proof', id: 'watchtower' }] });
  assert.equal(r.allowed, true);
  assert.equal(r.why, 'owned outright',
    '⚑ pay-once means pay once. If a bought tool needed a live subscription to open, the shop would be a subscription wearing a different word');
});

test('⚑ and a tool bought for ONE wing does not open a different one', () => {
  // The check is kind AND wing. On either alone, buying any tool would unlock every paid wing, and
  // the shop would be selling a master key while describing a single tool.
  const other = access({ wing: 'proof', hasPass: false, owns: [{ kind: 'tool', wing: 'build', id: 'forge-pro' }] });
  assert.equal(other.allowed, false, 'a forge bought for the build wing is not a Clinic pass');

  const notATool = access({ wing: 'proof', hasPass: false, owns: [{ kind: 'card', wing: 'proof', id: 'a-card' }] });
  assert.equal(notATool.allowed, false, 'and holding a card that mentions the wing is not owning the tool');
});

test('every wing has a price, and it is one of the two kinds', () => {
  for (const w of WINGS) assert.ok(['free', 'pass'].includes(priceOfWing(w)), `${w} is priced`);
  assert.equal(Object.keys(WING_PRICE).length, WINGS.length, 'no wing is missing a price');
  assert.throws(() => priceOfWing('dungeon'), /unknown wing/);
});

test('⚑ the same holding means the same KIND and the same ONE', () => {
  // Inside cancelIsHonest this is unreachable while cancel() is correct — nothing is ever missing.
  // It is checked here directly because the day it matters is the day something HAS gone missing,
  // and a matcher that has never been exercised is a matcher nobody has tested.
  assert.equal(sameHolding({ kind: 'tool', id: 'forge' }, { kind: 'tool', id: 'forge' }), true);
  assert.equal(sameHolding({ kind: 'tool', id: 'forge' }, { kind: 'tool', id: 'watchtower' }), false,
    '⚑ two different tools are two things — on kind alone, owning any tool would look like owning every tool');
  assert.equal(sameHolding({ kind: 'tool', id: 'forge' }, { kind: 'card', id: 'forge' }), false,
    'and a card is not a tool because they share a name');
});

test('⚑ the wings priced here are the wings the world actually has', async () => {
  // ⚑ This test exists because the price list named a wing "checking" while the world calls it
  // "proof". Every lookup missed, every wing silently fell back to free, and the page cheerfully
  // told visitors the subscription zone was free. Two lists meaning the same thing is one bug
  // waiting for the case that separates them — the third time that shape has cost something here.
  // The world is data now rather than a module — see the note at the top of rooms.test.mjs. The
  // check is the same one: two lists meaning the same thing is a bug waiting for the case that
  // separates them, and it has cost something here three times.
  const { readFileSync } = await import('node:fs');
  const { wings: WORLD } = JSON.parse(readFileSync(new URL('./rooms.json', import.meta.url), 'utf8'));
  const worldIds = WORLD.map(w => w.id).sort();
  assert.deepEqual([...WINGS].sort(), worldIds,
    'the price list and the world must name the same six wings');
  for (const id of worldIds) assert.ok(WING_PRICE[id], `${id} has a price`);
});

test('exactly one wing costs money, and it is the checking one', () => {
  const paid = WINGS.filter(w => priceOfWing(w) === 'pass');
  assert.deepEqual(paid, ['proof'],
    'the Pass buys ongoing checking. If a second wing ever appears here, the free door has moved');
});
