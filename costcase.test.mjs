// costcase.test.mjs — the buyer's cost case: every figure from the sourced basis, like for like, floors not
// top ends, every bad input refused with its reason, and never a throw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, BASIS_KEYS, sourcesOf, over, costCase } from './costcase.mjs';

const BASIS = JSON.parse(readFileSync(new URL('./vendor/sovereign-enterprise/data/basis.json', import.meta.url), 'utf8'));
const base = (patch) => ({ ...BASIS, ...patch });
const r2 = (x) => Math.round(x * 100) / 100;

test('costCase · the default case, every line from the sourced basis', () => {
  const r = costCase(BASIS, {});
  assert.equal(r.ok, true);
  assert.deepEqual(r.inputs, DEFAULTS);
  assert.deepEqual(r.lines, { seats: 1386, seatsKept: 1386, api: 117.62, apiKept: 58.81, power: 32.21, openApi: 6.12 });
  assert.deepEqual(r.perYear, { today: 1503.62, own: 1477.02, cloudOpen: 1450.93 });
  assert.deepEqual(r.over, { today: 4652.14, own: 4569.84, cloudOpen: 4489.12 });
  assert.deepEqual([r.savingPerYear, r.savingOver], [26.6, 82.3]);
  // at the starting numbers the cheap cloud is cheaper than owning, and the case says so
  assert.deepEqual([r.versusCloudPerYear, r.versusCloudOver, r.breakEven], [-26.09, -80.72, 2634]);
  assert.deepEqual(costCase(BASIS), r);
});

test('costCase · like for like: kept seats stay at full price, the rented share of calls stays at full price', () => {
  const r = costCase(BASIS, { seats: 8, seatsDropped: 3, callsPerWeek: 2000, tokensIn: 2500, tokensOut: 400, shareLocal: 0.25, machines: 2, years: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.lines.seats, r2(8 * 12 * BASIS['seat.copilot'].value));
  assert.equal(r.lines.seatsKept, r2(5 * 12 * BASIS['seat.copilot'].value));
  assert.equal(r.lines.api, r2(2000 * 52 * (2500 * BASIS.frontier.inPerM + 400 * BASIS.frontier.outPerM) / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(r.lines.apiKept, r2(r.lines.api * 0.75));
  assert.equal(r.lines.power, r2(2 * BASIS.laptopExtraWatts.value * BASIS.hoursPerYear.value / 1000 * BASIS.electricityPencePerKwh.value / 100));
  assert.equal(r.perYear.today, r2(r.lines.seats + r.lines.api));
  assert.equal(r.perYear.own, r2(r.lines.seatsKept + r.lines.apiKept + r.lines.power));
  assert.equal(r.savingPerYear, r2(r.perYear.today - r.perYear.own));
  assert.equal(r.over.today, r2(r.perYear.today * (1 + (1 + BASIS.cpi.value))));
  assert.equal(r.savingOver, r2(r.over.today - r.over.own));
  const per = (2500 * BASIS.bedrockGptOss120b.inPerM + 400 * BASIS.bedrockGptOss120b.outPerM) / 1e6 * BASIS.fxGbpPerUsd.value;
  assert.equal(r.lines.openApi, r2(2000 * 52 * 0.25 * per));
  assert.equal(r.perYear.cloudOpen, r2(r.lines.seatsKept + r.lines.apiKept + r.lines.openApi));
  assert.equal(r.over.cloudOpen, r2(r.perYear.cloudOpen * (1 + (1 + BASIS.cpi.value))));
  assert.equal(r.versusCloudPerYear, r2(r.perYear.cloudOpen - r.perYear.own));
  assert.equal(r.versusCloudOver, r2(r.over.cloudOpen - r.over.own));
  assert.equal(r.breakEven, Math.ceil(r.lines.power / (52 * 0.25 * per)));
});

test('costCase · the third route: the same share rented from the cheapest sourced open model', () => {
  const per = (1500 * BASIS.bedrockGptOss120b.inPerM + 300 * BASIS.bedrockGptOss120b.outPerM) / 1e6 * BASIS.fxGbpPerUsd.value;
  const r = costCase(BASIS, { callsPerWeek: 10000 });
  assert.equal(r.lines.openApi, r2(10000 * 52 * 0.5 * per));
  assert.ok(r.breakEven < 10000 && r.versusCloudPerYear > 0, 'above the break-even owning beats the cheap cloud');
  const at = costCase(BASIS, { callsPerWeek: r.breakEven }), below = costCase(BASIS, { callsPerWeek: r.breakEven - 1 });
  assert.ok(at.versusCloudPerYear >= -0.01 && below.versusCloudPerYear <= 0.01, 'the break-even sits where the two routes cross');
  assert.equal(costCase(BASIS, { shareLocal: 0, machines: 0 }).breakEven, null);
  assert.equal(costCase(base({ bedrockGptOss120b: { inPerM: 0, outPerM: 0 } }), {}).breakEven, null);
  const doubled = costCase(BASIS, { machines: 2 });
  assert.equal(doubled.breakEven, Math.ceil(doubled.lines.power / (52 * 0.5 * per)));
  assert.equal(costCase(base({ bedrockGptOss120b: { inPerM: 1, outPerM: 0 } }), {}).lines.openApi, r2(500 * 52 * 0.5 * 1500 * 1 / 1e6 * BASIS.fxGbpPerUsd.value));
  assert.equal(costCase(base({ bedrockGptOss120b: { inPerM: 0, outPerM: 1 } }), {}).lines.openApi, r2(500 * 52 * 0.5 * 300 * 1 / 1e6 * BASIS.fxGbpPerUsd.value));
});

test('costCase · the figures move with the basis, not with anything typed', () => {
  const seat = costCase(base({ 'seat.copilot': { ...BASIS['seat.copilot'], value: 30 } }), {});
  assert.equal(seat.lines.seats, 5 * 12 * 30);
  const fx = costCase(base({ fxGbpPerUsd: { ...BASIS.fxGbpPerUsd, value: 1 } }), {});
  assert.equal(fx.lines.api, r2(500 * 52 * (1500 * 2 + 300 * 10) / 1e6));
  const power = costCase(base({ electricityPencePerKwh: { ...BASIS.electricityPencePerKwh, value: 10 } }), {});
  assert.equal(power.lines.power, r2(15 * 8760 / 1000 * 10 / 100));
  const hours = costCase(base({ hoursPerYear: { value: 1000 } }), {});
  assert.equal(hours.lines.power, r2(15 * 1000 / 1000 * BASIS.electricityPencePerKwh.value / 100));
  const watts = costCase(base({ laptopExtraWatts: { value: 30 } }), {});
  assert.equal(watts.lines.power, r2(30 * 8760 / 1000 * BASIS.electricityPencePerKwh.value / 100));
  const api = costCase(base({ frontier: { inPerM: 4, outPerM: 0 } }), {});
  assert.equal(api.lines.api, r2(500 * 52 * 1500 * 4 / 1e6 * BASIS.fxGbpPerUsd.value));
  const cpi = costCase(base({ cpi: { value: 0 } }), {});
  assert.equal(cpi.over.today, r2(cpi.perYear.today * 3));
});

test('costCase · an owned route can cost more than it saves, and the case says so rather than hiding it', () => {
  const r = costCase(BASIS, { callsPerWeek: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.savingPerYear, -32.21);
  assert.ok(r.savingOver < 0);
});

test('costCase · dropping seats is the reader’s call, and only counts when they make it', () => {
  assert.equal(costCase(BASIS, { seatsDropped: 5 }).lines.seatsKept, 0);
  assert.equal(costCase(BASIS, { seatsDropped: 5 }).savingPerYear, 1412.6);
  assert.equal(costCase(BASIS, { shareLocal: 1 }).lines.apiKept, 0);
  assert.equal(costCase(BASIS, { shareLocal: 1 }).savingOver, 264.25);
  const nothing = costCase(BASIS, { shareLocal: 0, machines: 0 });
  assert.deepEqual([nothing.savingPerYear, nothing.savingOver, nothing.lines.power], [0, 0, 0]);
});

test('costCase · boundaries hold at both ends of every input', () => {
  for (const ok of [{ seats: 0 }, { seatsDropped: 5 }, { seatsDropped: 0 }, { callsPerWeek: 0, tokensIn: 0, tokensOut: 0 },
    { shareLocal: 0 }, { shareLocal: 1 }, { shareLocal: 0, machines: 0 }, { machines: 1 }, { machines: 3 }, { years: 1 }, { years: 10 }]) {
    assert.equal(costCase(BASIS, ok).ok, true, JSON.stringify(ok));
  }
  assert.equal(costCase(BASIS, { years: 1 }).over.today, 1503.62);
  assert.equal(costCase(BASIS, { years: 10 }).over.today, over(1503.62, BASIS.cpi.value, 10));
});

test('costCase · each bad input refused with its reason', () => {
  const why = (i) => costCase(BASIS, i).why;
  assert.equal(why({ seats: -1 }), 'seats: a whole number, 0 or more');
  assert.equal(why({ seats: 2.5 }), 'seats: a whole number, 0 or more');
  assert.equal(why({ seats: '5' }), 'seats: a whole number, 0 or more');
  assert.equal(why({ seatsDropped: 6 }), 'seats dropped: a whole number, no more than the seats');
  assert.equal(why({ seatsDropped: -1 }), 'seats dropped: a whole number, no more than the seats');
  assert.equal(why({ seatsDropped: 1.5 }), 'seats dropped: a whole number, no more than the seats');
  assert.equal(why({ callsPerWeek: -1 }), 'calls and tokens: numbers, 0 or more');
  assert.equal(why({ tokensIn: NaN }), 'calls and tokens: numbers, 0 or more');
  assert.equal(why({ tokensOut: 'x' }), 'calls and tokens: numbers, 0 or more');
  assert.equal(why({ callsPerWeek: Infinity }), 'calls and tokens: numbers, 0 or more');
  assert.equal(why({ shareLocal: 1.5 }), 'the share run on your own machines: 0 to 1');
  assert.equal(why({ shareLocal: -0.1 }), 'the share run on your own machines: 0 to 1');
  assert.equal(why({ machines: 0 }), 'machines: a whole number, at least one when any share runs on them');
  assert.equal(why({ machines: 2.5 }), 'machines: a whole number, at least one when any share runs on them');
  assert.equal(why({ machines: -1, shareLocal: 0 }), 'machines: a whole number, at least one when any share runs on them');
  assert.equal(why({ years: 0 }), 'years: 1 to 10');
  assert.equal(why({ years: 11 }), 'years: 1 to 10');
  assert.equal(why({ years: 2.5 }), 'years: 1 to 10');
});

test('costCase · refuses a basis missing any figure it reads', () => {
  const refused = { ok: false, why: 'a sourced basis with every figure the case reads' };
  assert.deepEqual(costCase(null, {}), refused);
  assert.deepEqual(costCase(undefined, {}), refused);
  for (const k of BASIS_KEYS) { const b = { ...BASIS }; delete b[k]; assert.deepEqual(costCase(b, {}), refused, k); }
  assert.deepEqual(costCase(base({ cpi: { value: -0.1 } }), {}), refused);
  assert.deepEqual(costCase(base({ frontier: { inPerM: 2 } }), {}), refused);
  assert.deepEqual(costCase(base({ bedrockGptOss120b: { outPerM: 0.93 } }), {}), refused);
  assert.deepEqual(costCase(base({ hoursPerYear: { value: Infinity } }), {}), refused);
});

test('over · CPI on every year after the first, compounding', () => {
  assert.equal(over(100, 0.1, 1), 100);
  assert.equal(over(100, 0.1, 2), 210);
  assert.equal(over(100, 0.1, 3), 331);
  assert.equal(over(100, 0, 4), 400);
  assert.equal(over(100, 0.1, 0), 0);
});

test('sourcesOf · every figure the case reads, with what it is and where it came from', () => {
  const s = sourcesOf(BASIS);
  assert.deepEqual(s.map((x) => x.key), [...BASIS_KEYS]);
  assert.equal(s.find((x) => x.key === 'seat.copilot').what, 'Microsoft 365 Copilot (enterprise)');
  assert.equal(s.find((x) => x.key === 'frontier').what, 'Claude Sonnet 5 (API)');
  assert.match(s.find((x) => x.key === 'bedrockGptOss120b').what, /^Amazon Bedrock/);
  assert.equal(s.find((x) => x.key === 'cpi').what, BASIS.cpi.what);
  assert.match(s.find((x) => x.key === 'seat.copilot').source, /^https:\/\/www\.microsoft\.com\//);
  assert.equal(s.find((x) => x.key === 'hoursPerYear').source, null);
  assert.equal(s.find((x) => x.key === 'hoursPerYear').via, null);
  assert.equal(s.find((x) => x.key === 'frontier').via, BASIS.frontier.via);
  assert.ok(s.filter((x) => x.key !== 'hoursPerYear').every((x) => /^https:\/\//.test(x.source)));
  assert.deepEqual(sourcesOf(null), []);
});

test('costCase · totality: garbage never throws', () => {
  const G = [undefined, null, 0, 'x', [], {}, { seats: {} }, { years: Infinity }, true, () => 1, new Proxy({}, { get() { throw new Error('no'); } })];
  for (const a of G) for (const b of G) assert.doesNotThrow(() => costCase(a, b));
  for (const g of G) { assert.doesNotThrow(() => sourcesOf(g)); assert.doesNotThrow(() => over(g, g, 3)); }
  assert.equal(costCase(BASIS, { seats: {} }).ok, false);
  assert.deepEqual(costCase(new Proxy({}, { get() { throw new Error('no'); } }), {}), { ok: false, why: 'the inputs could not be read' });
});
