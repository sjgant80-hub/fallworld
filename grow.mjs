// grow.mjs — HOW A DIDY GROWS. From an egg that needs no model at all to a titan on a server: one
// stage at a time, and only when a measured bar says the job needs it.
//
// The estate has fallforgemint's sizer LADDER (vendored here as data, vendor/fallforgemint/ladder.json,
// checked against upstream by scripts/sync-sources.mjs) and ladder.mjs's rungs, which say WHO runs the
// work — nobody, your machine, or a rented model. Neither turns a measured score into a decision to
// grow or to shrink, or says what a size asks of a machine. This does.
//
// ⚑ A DIDY GROWS TO THE SMALLEST STAGE THAT CLEARS THE BAR, AND NO FURTHER. Pokémon only ever
// evolve upward. A didy also shrinks: if a smaller stage clears the bar, that is where it goes,
// because a bigger mind than the job needs is slower, heavier and answers to more hardware.
//
// Pure: no I/O, no clock, no randomness.

export const EGG = Object.freeze({ id: 'egg', name: 'Egg', rung: -1, band: 'no model', paramsB: 0, runsOn: 'nothing at all: the rules engine answers', models: Object.freeze([]) });
export const NAMES = Object.freeze(['Hatchling', 'Fledgling', 'Runner', 'Keeper', 'Sage', 'Elder', 'Titan']);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const pos = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

// The sizer's rungs → the didy's stages, the egg first. Refuses a ladder that is not the one it names.
export function stagesFrom(ladder) {
  if (!Array.isArray(ladder) || ladder.length !== NAMES.length) return null;
  if (!ladder.every((r, k) => isObj(r) && r.tier === k && pos(r.approxParamsB) && Array.isArray(r.models)
    && (k === 0 || r.approxParamsB > ladder[k - 1].approxParamsB))) return null;
  return [EGG, ...ladder.map((r, k) => Object.freeze({
    id: NAMES[k].toLowerCase(), name: NAMES[k], rung: k, band: String(r.band), paramsB: r.approxParamsB,
    runsOn: String(r.runsOn), models: Object.freeze(r.models.map((m) => String(m.id))),
  }))];
}

// Bits per weight, measured from real model files: [{ bytes, paramsB }] → the mean.
export function bitsPerWeight(files) {
  if (!Array.isArray(files) || files.length === 0 || !files.every((f) => isObj(f) && pos(f.bytes) && pos(f.paramsB))) return null;
  return files.reduce((a, f) => a + (f.bytes * 8) / (f.paramsB * 1e9), 0) / files.length;
}

// What a stage asks of a machine, in GB: its weights at `bpw` bits each, plus `overhead` for the
// context and the runtime. One decimal, rounded up — a floor, never an optimistic guess.
export function memoryGB(paramsB, bpw, overhead) {
  if (!(paramsB >= 0) || !pos(bpw) || !(overhead >= 0) || !Number.isFinite(paramsB + overhead)) return null;
  return Math.ceil(paramsB * bpw / 8 * (1 + overhead) * 10) / 10;
}

// The largest stage a machine with `ramGB` can hold. The egg needs nothing, so every machine holds it.
export function largestHeld(stages, ramGB, bpw, overhead) {
  if (!Array.isArray(stages) || stages.length === 0 || !(ramGB >= 0) || memoryGB(1, bpw, overhead) === null) return null;
  let held = null;
  for (const s of stages) {
    const need = isObj(s) ? memoryGB(s.paramsB, bpw, overhead) : null;
    if (need === null || need > ramGB) break;
    held = s;
  }
  return held;
}

// Where a didy at stage `at` should be for one job, given the measured scores { stageId: right } out of
// `n`, and the bar. The smallest stage that clears decides; with none cleared, the next stage above the
// largest one measured is the one to try.
export function evolve(stages, at, measured, bar) {
  const k = Array.isArray(stages) ? stages.findIndex((s) => isObj(s) && s.id === at) : -1;
  if (k < 0 || !isObj(measured) || !Number.isInteger(bar) || bar < 1) return null;
  const tried = stages.map((s, i) => ({ s, i, r: isObj(s) ? measured[s.id] : null })).filter((x) => Number.isInteger(x.r));
  const hit = tried.find((x) => x.r >= bar);
  if (hit) {
    const move = hit.i > k ? 'grow' : hit.i < k ? 'shrink' : 'stay';
    const why = move === 'stay' ? stages[k].name + ' clears the bar, and nothing smaller measured does'
      : hit.s.name + ' is the smallest stage that clears the bar (' + hit.r + ' against ' + bar + ')';
    return { move, to: hit.s.id, why };
  }
  const top = tried.length ? tried[tried.length - 1].i : k;
  const next = stages[Math.max(top, k) + 1];
  return next ? { move: 'try', to: next.id, why: 'nothing measured clears ' + bar + '; ' + next.name + ' is the next stage to measure' }
    : { move: 'stay', to: stages[k].id, why: 'no stage clears ' + bar + ', and there is no larger stage to try' };
}

export default { EGG, NAMES, stagesFrom, bitsPerWeight, memoryGB, largestHeld, evolve };
