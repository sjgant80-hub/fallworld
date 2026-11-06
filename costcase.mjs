// fallworld · costcase.mjs — what a team's rented AI costs it today, and what the same work costs owned.
//
// For the buyer's half of the page. The one money claim Fall World makes is the meter along its top: how
// much of what ran, ran on your own machine, and how much was rented. This turns the reader's own numbers
// into that meter's bill. Every outside figure is read from the vendored, sourced basis
// (vendor/sovereign-enterprise/data/basis.json, byte for byte from sovereign-enterprise, pinned and checked
// by scripts/sync-sources.mjs); the seats, the calls and the share are the reader's own. No price of ours
// appears here: these are the buyer's costs, at the prices their suppliers publish.
//
// Like for like, and floors rather than top ends:
//   - a rented assistant seat is a different product (a frontier model inside an office suite), so the
//     case keeps every seat unless the reader drops some, and a dropped seat is the reader's call, made
//     after their own trial shows a local stage does the job that seat was bought for;
//   - the calls that move onto their own machines are only the share the reader sets, which the Grow
//     panel lets them measure in their own tab; every other call stays on the rented API at full price;
//   - an owned machine is costed as an always-on extra draw, every hour of the year, which overstates it;
//   - the third route rents the SAME share from the cheapest sourced open model (gpt-oss-120b on AWS Bedrock,
//     London), so owning is also set against the cheap cloud, and the case says when that cloud is cheaper.
// CPI is applied to every year after the first. Pure, total, deterministic: garbage in → { ok: false, why },
// never a throw.

export const DEFAULTS = Object.freeze({ seats: 5, seatsDropped: 0, callsPerWeek: 500, tokensIn: 1500, tokensOut: 300, shareLocal: 0.5, machines: 1, years: 3 });
export const BASIS_KEYS = Object.freeze(['seat.copilot', 'frontier', 'bedrockGptOss120b', 'fxGbpPerUsd', 'laptopExtraWatts', 'hoursPerYear', 'electricityPencePerKwh', 'cpi']);

const isNum = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isCount = (x) => Number.isInteger(x) && x >= 0;
const r2 = (x) => Math.round(x * 100) / 100;

/** the basis entries the case reads, each a sourced number; null when one is missing or unreadable */
function figures(basis) {
  const b = basis || {}, f = (k) => b[k] || {};
  const out = {
    seat: f('seat.copilot').value, apiIn: f('frontier').inPerM, apiOut: f('frontier').outPerM, fx: f('fxGbpPerUsd').value,
    openIn: f('bedrockGptOss120b').inPerM, openOut: f('bedrockGptOss120b').outPerM,
    watts: f('laptopExtraWatts').value, hours: f('hoursPerYear').value, pence: f('electricityPencePerKwh').value, cpi: f('cpi').value,
  };
  return Object.values(out).every(isNum) ? out : null;
}

/** where each figure came from, for the page to list beside the numbers */
export function sourcesOf(basis) {
  try {
    return BASIS_KEYS.map((k) => ({ key: k, what: basis[k].what || basis[k].product, source: basis[k].source || null, via: basis[k].via || null }));
  } catch { return []; }
}

/** a yearly cost carried over `years`, rising by CPI each year after the first; null if the numbers cannot be read */
export function over(perYear, cpi, years) {
  try {
    let total = 0, factor = 1;
    for (let y = 0; y < years; y++) { total += perYear * factor; factor *= 1 + cpi; }
    return r2(total);
  } catch { return null; }
}

/** the case. input (all optional, defaults above): seats, seatsDropped, callsPerWeek, tokensIn, tokensOut, shareLocal (0 to 1), machines, years */
export function costCase(basis, input) {
  try {
    const f = figures(basis);
    if (!f) return { ok: false, why: 'a sourced basis with every figure the case reads' };
    const i = { ...DEFAULTS, ...(input || {}) };
    if (!isCount(i.seats)) return { ok: false, why: 'seats: a whole number, 0 or more' };
    if (!isCount(i.seatsDropped) || i.seatsDropped > i.seats) return { ok: false, why: 'seats dropped: a whole number, no more than the seats' };
    if (!isNum(i.callsPerWeek) || !isNum(i.tokensIn) || !isNum(i.tokensOut)) return { ok: false, why: 'calls and tokens: numbers, 0 or more' };
    if (!isNum(i.shareLocal) || i.shareLocal > 1) return { ok: false, why: 'the share run on your own machines: 0 to 1' };
    if (!isCount(i.machines) || (i.shareLocal > 0 && i.machines < 1)) return { ok: false, why: 'machines: a whole number, at least one when any share runs on them' };
    if (!Number.isInteger(i.years) || i.years < 1 || i.years > 10) return { ok: false, why: 'years: 1 to 10' };
    const seats = r2(i.seats * 12 * f.seat);                                                          // rented assistant seats, a year
    const seatsKept = r2((i.seats - i.seatsDropped) * 12 * f.seat);                                   // the ones the reader keeps
    const api = r2(i.callsPerWeek * 52 * (i.tokensIn * f.apiIn + i.tokensOut * f.apiOut) / 1e6 * f.fx);  // every call on a rented frontier API
    const apiKept = r2(api * (1 - i.shareLocal));                                                     // the calls that stay rented
    const power = r2(i.machines * f.watts * f.hours / 1000 * f.pence / 100);                          // owned: an always-on extra draw, a year
    // the same share rented instead, at the cheapest sourced open-model rate (AWS Bedrock, London), a year
    const openPerCall = (i.tokensIn * f.openIn + i.tokensOut * f.openOut) / 1e6 * f.fx;
    const openApi = r2(i.callsPerWeek * 52 * i.shareLocal * openPerCall);
    const perYear = { today: r2(seats + api), own: r2(seatsKept + apiKept + power), cloudOpen: r2(seatsKept + apiKept + openApi) };
    const total = { today: over(perYear.today, f.cpi, i.years), own: over(perYear.own, f.cpi, i.years), cloudOpen: over(perYear.cloudOpen, f.cpi, i.years) };
    // the calls a week at which owning's fixed electricity equals renting the same share from the open model; null when nothing moves
    const perWeekOpen = 52 * i.shareLocal * openPerCall;
    const breakEven = perWeekOpen > 0 ? Math.ceil(power / perWeekOpen) : null;
    return {
      ok: true, inputs: i, lines: { seats, seatsKept, api, apiKept, power, openApi }, perYear, over: total,
      savingPerYear: r2(perYear.today - perYear.own), savingOver: r2(total.today - total.own),
      versusCloudPerYear: r2(perYear.cloudOpen - perYear.own), versusCloudOver: r2(total.cloudOpen - total.own), breakEven,
    };
  } catch { return { ok: false, why: 'the inputs could not be read' }; }
}

export default { DEFAULTS, BASIS_KEYS, sourcesOf, over, costCase };
