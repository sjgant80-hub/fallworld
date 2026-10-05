// trial.mjs — THE TRIAL OF RULES. Can a didy of a given size follow the world's own rules exactly?
//
// The estate has fallforgemint's sizer, which picks a STARTING size from the kind of job and says of
// itself that capability-by-size is "a heuristic ... never a measured score", and tier.mjs, which
// grades a BUILD by what its CI ran. Neither measures a MODEL against a bar. This does: the world's
// own rarity rule (build-world.mjs), a real card's facts, one word back, graded by the rule itself.
//
// The card's own description goes in too, on purpose. Rarity used to be read off what a repository
// said about itself, and that was the bug: a didy that believes "witness-gated" in a description
// over the evidence beside it fails this trial, exactly as the old builder did.
//
// Pure: no I/O, no clock. The pick is seeded, so the same world and seed give the same trial.

export const LABELS = Object.freeze(['Unidentified', 'Normal', 'Magic', 'Rare', 'Unique', 'Set']);
export const TIER_LABEL = Object.freeze({ unknown: 'Unidentified', normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique', set: 'Set', ledger: 'Ledger' });
export const FULL_SET = 3;
export const SAYS_MAX = 160;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFacts = (f) => isObj(f) && typeof f.described === 'boolean' && typeof f.live === 'boolean'
  && typeof f.proven === 'boolean' && Number.isInteger(f.companions) && f.companions >= 0;

// A world item → the four facts its rarity is decided by, plus its name and what it says of itself.
export function factsOf(item) {
  if (!isObj(item)) return null;
  const says = typeof item.desc === 'string' ? item.desc.trim() : '';
  const proof = isObj(item.proof) ? item.proof.tier : null;
  return {
    name: String(item.title || item.name || ''),
    says: says.length > SAYS_MAX ? says.slice(0, SAYS_MAX - 1) + '…' : says,
    described: says !== '', live: item.live === true, proven: proof === 'proven',
    companions: Array.isArray(item.set) ? item.set.length : 0,
  };
}

// The world's rarity rule, first match wins — the same order as build-world.mjs rarity().
export function rarityRule(f) {
  if (!isFacts(f)) return null;
  if (!f.described) return 'Unidentified';
  if (!f.live) return 'Normal';
  if (f.proven) return f.companions >= FULL_SET ? 'Set' : 'Unique';
  return f.companions >= FULL_SET ? 'Rare' : 'Magic';
}

// FNV-1a, 32-bit. Not security — a stable, seedable order that needs no crypto in a browser.
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

// The trial's cards: `per` of each rarity, the first by a seeded hash of the name. A rarity with too
// few cards to fill its share makes the whole pick refuse — a lopsided trial measures the wrong thing.
export function pickTrial(items, seed, per) {
  if (!Array.isArray(items) || !Number.isInteger(per) || per < 1) return null;
  const out = [];
  for (const label of LABELS) {
    const pool = items.filter((i) => isObj(i) && TIER_LABEL[i.tier] === label)
      .map((i) => ({ i, k: fnv1a(seed + '|' + i.name) }))
      .sort((a, b) => a.k - b.k);
    if (pool.length < per) return null;
    for (const { i } of pool.slice(0, per)) out.push({ id: i.name, facts: factsOf(i), answer: label });
  }
  return out;
}

const yes = (b) => (b ? 'yes' : 'no');
export const RULES_TEXT = [
  'If nothing describes what it does, it is Unidentified.',
  'Otherwise, if there is nothing live to open, it is Normal.',
  'Otherwise, if a machine tried to break it and it held, and it ships a full set of companions (' + FULL_SET + ' or more), it is Set.',
  'Otherwise, if a machine tried to break it and it held, it is Unique.',
  'Otherwise, if it ships a full set of companions (' + FULL_SET + ' or more), it is Rare.',
  'Otherwise, it is Magic.',
];

// The one prompt every size is given. The rules, then the card, then the ask — nothing else.
export function trialPrompt(f) {
  if (!isFacts(f)) return null;
  return 'You are reading one card in Fall World. Its rarity is decided by these rules, checked in this order; the first rule that applies decides.\n'
    + RULES_TEXT.map((r, n) => (n + 1) + '. ' + r).join('\n')
    + '\n\nThe card: ' + (f.name || '(no name)') + '\n'
    + '- what it says about itself: ' + (f.says || '(nothing)') + '\n'
    + '- something describes what it does: ' + yes(f.described) + '\n'
    + '- there is something live to open: ' + yes(f.live) + '\n'
    + '- a machine tried to break it and it held: ' + yes(f.proven) + '\n'
    + '- companions it ships: ' + f.companions + '\n\n'
    + 'Answer with the rarity only, one word.';
}

// A reply → the rarity it names, or null when it names none or more than one ("Rare, not Set" is not an
// answer); and whether the reply was that word and nothing else.
export function gradeReply(reply) {
  const text = typeof reply === 'string' ? reply : '';
  const named = [...new Set([...text.matchAll(/\b(unidentified|normal|magic|rare|unique|set)\b/gi)].map((m) => m[1].toLowerCase()))];
  const said = named.length === 1 ? LABELS.find((l) => l.toLowerCase() === named[0]) : null;
  return { said, bare: said !== null && text.trim().replace(/[.!*"'`]/g, '').toLowerCase() === named[0] };
}

// One stage's replies against the trial's answers.
export function scoreStage(trial, replies) {
  if (!Array.isArray(trial) || !Array.isArray(replies) || replies.length !== trial.length) return null;
  let right = 0, bare = 0, silent = 0;
  const missed = [];
  trial.forEach((t, k) => {
    const g = gradeReply(replies[k]);
    if (g.said === null) silent++;
    if (g.bare) bare++;
    if (g.said === t.answer) right++;
    else missed.push({ id: t.id, answer: t.answer, said: g.said });
  });
  return { n: trial.length, right, bare, silent, missed };
}

// The sealed rules. `stages` is ordered small to large: [{ id, paramsB, right, n }].
export function judgeTrial(stages, bar) {
  const ok = Array.isArray(stages) && stages.length >= 2 && Number.isInteger(bar) && bar > 0
    && stages.every((s, k) => isObj(s) && Number.isInteger(s.right) && Number.isInteger(s.n) && s.right <= s.n && bar <= s.n
      && typeof s.paramsB === 'number' && (k === 0 || s.paramsB > stages[k - 1].paramsB));
  if (!ok) return { ok: false, why: 'at least two stages, small to large, each { id, paramsB, right, n }, and a bar no bigger than n' };
  const clears = stages.filter((s) => s.right >= bar);
  const chosen = clears.length ? clears[0] : null;
  const last = stages[stages.length - 1];
  const score = (s) => s.id + ' ' + s.right + '/' + s.n;
  const rules = [
    { id: 'bar-cleared', pass: chosen !== null, value: chosen ? chosen.id + ' is the smallest stage that clears ' + bar : 'no stage cleared ' + bar },
    { id: 'size-helps', pass: stages.every((s, k) => k === 0 || s.right >= stages[k - 1].right), value: stages.map(score).join(' · ') },
    { id: 'hatchling-short', pass: stages[0].right < bar, value: score(stages[0]) + (stages[0].right < bar ? ', short of ' : ', clears ') + bar },
    { id: 'smaller-suffices', pass: chosen !== null && chosen !== last, value: chosen === null ? 'nothing cleared' : chosen === last ? 'only the largest measured stage cleared' : chosen.id + ' cleared; ' + last.id + ' was not needed' },
  ];
  return { ok: true, chosen: chosen ? chosen.id : null, rules, passed: rules.filter((r) => r.pass).length, of: rules.length };
}

export default { LABELS, TIER_LABEL, FULL_SET, SAYS_MAX, RULES_TEXT, factsOf, rarityRule, fnv1a, pickTrial, trialPrompt, gradeReply, scoreStage, judgeTrial };
