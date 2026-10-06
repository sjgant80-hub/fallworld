// deck.mjs — THE CARDS. Every public build in the estate as a card you can hold: its rarity earned from
// what GitHub ran (world.json, graded by build-world.mjs), its art grown from that evidence, and a
// rarity table like any collection has, except that no rarity here was assigned by anybody.
//
// The estate has world.json (the evidence, graded), fallkard (a card GAME with its own deck) and
// fallkard-forge (the card FORMAT, whose art.mjs paints one full 440×616 raster card from a reading
// key). None turns the whole estate into a collection you can browse, count and compare, and a grid of
// six hundred cards needs a small vector sigil rather than six hundred raster paintings. So this.
//
// Pure: no I/O, no clock, no randomness. The same evidence always grows the same card.
import { TIER_LABEL, fnv1a } from './trial.mjs';

export const RARITY_ORDER = Object.freeze(['unknown', 'normal', 'magic', 'rare', 'unique', 'set']);
export const PROOF_ORDER = Object.freeze(['prototype', 'works', 'proven']);
export const CREATURE = Object.freeze({ champion: 'Champion', ancestor: 'Ancestor', first: 'First of its line' });
export const ORGAN = Object.freeze({ grown: 'Grown organ', hand: 'Hand-built organ' });

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : '');

// A catalogue entry (built by build-client.mjs from world.json) → a card.
export function cardOf(e) {
  if (!isObj(e) || !str(e.id) || !RARITY_ORDER.includes(e.rarity)) return null;
  const proof = PROOF_ORDER.includes(e.tier) ? e.tier : 'prototype';
  return {
    id: e.id, name: str(e.name) || e.id, does: str(e.does), rarity: e.rarity, label: TIER_LABEL[e.rarity],
    why: str(e.why), proof, evidence: str(e.evidence), seat: str(e.seat) || 'work', kind: str(e.kind) || 'mine',
    by: str(e.by), live: e.live === true, url: str(e.url) || null,
    genes: fnv1a([e.id, e.rarity, proof, str(e.seat), str(e.kind)].join('|')),
  };
}

// A creature from kard-evolve's sealed record → a card. `role` is champion, ancestor or first.
export function creatureCard(c, role) {
  if (!isObj(c) || !str(c.key) || !Number.isInteger(c.gen) || !(role in CREATURE)) return null;
  return {
    id: 'creature-' + c.gen + '-' + c.key, name: c.key, does: 'generation ' + c.gen + ' of the sealed evolution',
    rarity: role, label: CREATURE[role], why: '', proof: 'proven', evidence: '', seat: 'creature', kind: 'creature',
    by: 'the creatures of kard-evolve', live: true, url: 'https://sjgant80-hub.github.io/kard-evolve/',
    genes: fnv1a('creature|' + c.key),
  };
}

// An organ from pattern-organs' sealed verdict → a card. `role` is grown or hand; `o` is that arm's champion in one
// seed ({ seed, key, elements, heldAuc }), graded once on two months of shop sessions it never saw.
export function organCard(o, role) {
  if (!isObj(o) || !str(o.key) || !Number.isInteger(o.seed) || !Number.isFinite(o.heldAuc) || !Object.hasOwn(ORGAN, role)) return null;
  const els = Array.isArray(o.elements) ? o.elements.filter((e) => typeof e === 'string') : [];
  return {
    id: 'organ-' + role + '-' + o.seed, name: (role === 'grown' ? 'Funnel organ, grown' : 'Funnel organ, hand-built') + ' · seed ' + o.seed,
    does: 'held-out AUC ' + o.heldAuc.toFixed(3) + ' on November and December' + (els.length ? ' · ' + els.join(', ') : ''),
    rarity: role, label: ORGAN[role], why: '', proof: 'proven', evidence: '', seat: 'organ', kind: 'organ',
    by: 'pattern-organs', live: true, url: 'https://sjgant80-hub.github.io/pattern-organs/',
    genes: fnv1a('organ|' + role + '|' + o.key),
  };
}

// The Konomi Tongue's sealed verdict → one card: what the grown language carried, against the 15× it was sealed to reach.
export function tongueCard(v) {
  if (!isObj(v) || !Number.isInteger(v.passed) || !Number.isInteger(v.of) || ![v.text, v.json, v.combined].every((x) => Number.isFinite(x))) return null;
  return {
    id: 'tongue', name: 'The Konomi Tongue', does: 'text ' + v.text + '× · JSON ' + v.json + '× · coded text as a picture ' + v.combined + '× — against 15× (sealed ' + v.passed + ' of ' + v.of + ')',
    rarity: 'tongue', label: 'Tongue', why: '', proof: 'proven', evidence: '', seat: 'language', kind: 'tongue',
    by: 'konomi-tongue', live: true, url: 'https://sjgant80-hub.github.io/konomi-tongue/', genes: fnv1a('tongue|' + v.passed + '|' + v.text + '|' + v.json),
  };
}

// SENTINEL's sealed verdict → one card: the immune system, what it caught and what it let through.
export function sentinelCard(v) {
  if (!isObj(v) || !Number.isInteger(v.passed) || !Number.isInteger(v.of) || !isObj(v.hard) || !isObj(v.grown)) return null;
  if (![v.hard.caught, v.hard.attacks, v.hard.falsePass, v.grown.grownCatch, v.grown.baselineCatch, v.grown.heldAttacks].every(Number.isInteger)) return null;
  return {
    id: 'sentinel', name: 'SENTINEL', does: 'dropped ' + v.hard.caught + ' of ' + v.hard.attacks + ' attacks, ' + v.hard.falsePass + ' false pass · grown detector caught ' + v.grown.grownCatch + ' of ' + v.grown.heldAttacks + ' held-out streams vs ' + v.grown.baselineCatch + ' (sealed ' + v.passed + ' of ' + v.of + ')',
    rarity: 'sentinel', label: 'Sentinel', why: '', proof: 'proven', evidence: '', seat: 'defense', kind: 'sentinel',
    by: 'sentinel', live: true, url: 'https://sjgant80-hub.github.io/sentinel/', genes: fnv1a('sentinel|' + v.passed + '|' + v.hard.caught + '|' + v.grown.grownCatch),
  };
}

// fall-airgap's measured verdict → one card: the 6-byte transport, the ratios it hit and the signature floor it cannot beat.
export function airgapCard(v) {
  if (!isObj(v) || !Number.isInteger(v.passed) || !Number.isInteger(v.of) || ![v.coord, v.delta, v.wire].every(Number.isFinite)) return null;
  return {
    id: 'airgap', name: 'FALL-AIRGAP', does: '6-byte coordinate ' + v.coord + '× · 1-byte delta ' + v.delta + '× · signed per-packet ' + v.wire + '× (the Ed25519 floor) — measured in real wire bytes (sealed ' + v.passed + ' of ' + v.of + ')',
    rarity: 'airgap', label: 'Air-gap', why: '', proof: 'proven', evidence: '', seat: 'transport', kind: 'airgap',
    by: 'fall-airgap', live: true, url: 'https://sjgant80-hub.github.io/fall-airgap/', genes: fnv1a('airgap|' + v.passed + '|' + v.coord + '|' + v.delta),
  };
}

// kestrel-ledger's sealed verdict → one card: IndexedDB as the Shadow Fold (step 4 of 4). The ledger
// resumes mid-thought, N mutations reconstruct byte-identical, its coordinate is far smaller than JSON,
// a 10k replay is quick, and a poisoned ledger lands on the same clean state it started from.
export function ledgerCard(v) {
  if (!isObj(v) || ![v.N, v.verdictPassed, v.verdictOf].every(Number.isInteger)) return null;
  if (![v.ratioPayloadVsJson, v.replayMs10k].every(Number.isFinite)) return null;
  return {
    id: 'kestrel-ledger', name: 'KESTREL-LEDGER',
    does: 'resumes mid-thought: ' + v.N + ' mutations reconstruct byte-identical · 6-byte ledger ~' + v.ratioPayloadVsJson + '× smaller than JSON · 10k replay ' + v.replayMs10k + 'ms · poisoned ledger rejected (sealed ' + v.verdictPassed + ' of ' + v.verdictOf + ')',
    rarity: 'ledger', label: 'Ledger', why: '', proof: 'proven', evidence: '', seat: 'memory', kind: 'ledger',
    by: 'kestrel-ledger', live: true, url: 'https://sjgant80-hub.github.io/kestrel-ledger/', genes: fnv1a('ledger|' + v.verdictPassed + '|' + v.ratioPayloadVsJson + '|' + v.N),
  };
}

// the Seed Library's sealed measure → one card: knowledge in tiny konomi seeds, not weights. The whole
// 4-domain library is a few hundred bytes, every seed germinates a working build on the node's own data
// offline, each grows larger than its seed, and the SENTINEL-style guard refuses every tampered seed.
export function seedLibraryCard(v) {
  if (!isObj(v) || ![v.libraryBytes, v.grownBytes, v.domains].every(Number.isInteger)) return null;
  if (![v.shopperAuc, v.triageAuc, v.waterAuc, v.cropAuc, v.growMs, v.sporeRatio].every(Number.isFinite)) return null;
  return {
    id: 'seed-library', name: 'SEED-LIBRARY',
    does: 'knowledge in seeds, not weights: the whole ' + v.domains + '-domain library is ' + v.libraryBytes + ' bytes → ' + v.grownBytes + '-byte builds · held-out AUC shopper ' + v.shopperAuc + ' / triage ' + v.triageAuc + ' / water ' + v.waterAuc + ' / crop ' + v.cropAuc + ' · seeds ' + v.minRatio + '–' + v.maxRatio + '× smaller than grown · grows one domain offline in ' + v.growMs + 'ms · every tampered seed refused · fall-spore bonus ' + v.sporeRatio + '× on real UCI',
    rarity: 'seedlib', label: 'Seed', why: '', proof: 'proven', evidence: '', seat: 'memory', kind: 'seedlib',
    by: 'seed-library', live: true, url: 'https://sjgant80-hub.github.io/seed-library/', genes: fnv1a('seedlib|' + v.libraryBytes + '|' + v.domains + '|' + v.shopperAuc),
  };
}

// estate-attest's recomputed verdict → one card: the trust rail turned inward. The estate's own claims
// re-run against the real index, every one graded HOLDS, with the honest pages-vs-live gap on its face.
export function attestCard(v) {
  if (!isObj(v) || ![v.held, v.of, v.total, v.pages, v.live].every(Number.isInteger)) return null;
  return {
    id: 'estate-attest', name: 'ESTATE-ATTEST',
    does: v.held + ' of ' + v.of + ' of the estate’s own claims re-run and HOLD against the real index · ' + v.total + ' repos recomputed · ' + v.pages + ' pages enabled but only ' + v.live + ' verified live',
    rarity: 'attest', label: 'Attest', why: '', proof: 'proven', evidence: '', seat: 'trust', kind: 'attest',
    by: 'estate-attest', live: true, url: 'https://sjgant80-hub.github.io/estate-attest/', genes: fnv1a('attest|' + v.held + '|' + v.total + '|' + v.live),
  };
}

// pattern-forge's sealed run → one card: the whole sovereign pattern loop on one organ. A pattern
// survives only if it generalises; breeding lifts it; the LOCAL model proposes forms no stump can
// express; the observer learns which forms win and reprioritises; and it ships a generated book.
export function patternForgeCard(v) {
  if (!isObj(v) || ![v.signalTestBA, v.breedSingleBestTestBA, v.breedChampionTestBA, v.llmChampionTestBA, v.llmBestStumpTestBA].every(Number.isFinite)) return null;
  if (![v.observerUnguidedPos, v.observerGuidedPos, v.bookSize].every(Number.isInteger)) return null;
  return {
    id: 'pattern-forge', name: 'PATTERN-FORGE',
    does: 'the sovereign pattern loop: a pattern survives only if it generalises (signal held-out ' + v.signalTestBA + ') · breeding lifts ' + v.breedSingleBestTestBA + '→' + v.breedChampionTestBA + ' · the local model proposes a ' + v.llmChampionKind + ' form no stump can express (held-out ' + v.llmChampionTestBA + ' vs best stump ' + v.llmBestStumpTestBA + ') · the observer moves the winner ' + v.observerUnguidedPos + '→' + v.observerGuidedPos + ' · a ' + v.bookSize + '-pattern book shipped',
    rarity: 'forge', label: 'Forge', why: '', proof: 'proven', evidence: '', seat: 'mind', kind: 'forge',
    by: 'pattern-forge', live: true, url: 'https://sjgant80-hub.github.io/pattern-forge/', genes: fnv1a('forge|' + v.signalTestBA + '|' + v.breedChampionTestBA + '|' + v.bookSize),
  };
}

// The art. `genes` decides the symmetry, the petals and the turn; `rings` is how far the proof got
// (1 prototype, 2 works, 3 proven). Colour comes from the card's rarity class on the page.
export function sigil(genes, rings) {
  if (!Number.isInteger(genes) || genes < 0 || genes > 0xffffffff || !Number.isInteger(rings) || rings < 1 || rings > 3) return null;
  const sym = 3 + (genes % 6);
  const len = 18 + ((genes >>> 3) % 16);
  const wid = 5 + ((genes >>> 7) % 9);
  const turn = (genes >>> 11) % 360;
  const cy = 50 - len / 2 - 6;
  let petals = '';
  for (let k = 0; k < sym; k++) {
    const a = (turn + (k * 360) / sym) % 360;
    petals += '<ellipse cx="50" cy="' + cy + '" rx="' + wid / 2 + '" ry="' + len / 2 + '" transform="rotate(' + a.toFixed(2) + ' 50 50)"/>';
  }
  let circles = '';
  for (let k = 0; k < rings; k++) circles += '<circle cx="50" cy="50" r="' + (46 - k * 4) + '" fill="none"/>';
  return '<svg viewBox="0 0 100 100" class="sigil" aria-hidden="true">' + circles + '<g class="petals">' + petals + '</g><circle cx="50" cy="50" r="4" class="core"/></svg>';
}
export const ringsOf = (proof) => Math.max(0, PROOF_ORDER.indexOf(proof)) + 1;

// The rarity table: how many of each, and what share of the whole. Every rarity is listed, even at 0.
export function rarityTable(cards) {
  if (!Array.isArray(cards)) return null;
  const n = cards.filter((c) => isObj(c) && RARITY_ORDER.includes(c.rarity)).length;
  return RARITY_ORDER.map((r) => {
    const count = cards.filter((c) => isObj(c) && c.rarity === r).length;
    return { rarity: r, label: TIER_LABEL[r], count, pct: n ? Math.round((count * 1000) / n) / 10 : 0 };
  });
}

// Any trait: how many cards carry each value, most common first, ties by name.
export function traitTable(cards, key) {
  if (!Array.isArray(cards) || !str(key)) return null;
  const m = new Map();
  for (const c of cards) if (isObj(c) && typeof c[key] === 'string') m.set(c[key], (m.get(c[key]) || 0) + 1);
  return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'en'));
}

// The deck, narrowed: by rarity, by seat, by proof, and by words in the name or what it does.
export function filterDeck(cards, q) {
  if (!Array.isArray(cards)) return [];
  const f = isObj(q) ? q : {};
  const words = str(f.text).toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter((c) => isObj(c)
    && (!f.rarity || c.rarity === f.rarity) && (!f.seat || c.seat === f.seat) && (!f.proof || c.proof === f.proof)
    && words.every((w) => (str(c.name) + ' ' + str(c.does) + ' ' + str(c.id)).toLowerCase().includes(w)));
}

// How real is a thing that is made of these builds? Read from their cards, never said.
//   proven — every one is in the deck and a mutation gate held on each
//   tested — every one is in the deck and a machine ran its tests on each
//   live   — every one is in the deck and can be opened now
//   built  — every one is in the deck
//   partial — some are; designed — none is
export function realness(ids, cards) {
  if (!Array.isArray(ids) || ids.length === 0 || !Array.isArray(cards)) return null;
  const by = new Map(cards.filter(isObj).map((c) => [c.id, c]));
  const found = ids.map((id) => by.get(id)).filter(Boolean);
  const missing = ids.filter((id) => !by.has(id));
  const all = (p) => found.every(p);
  const state = found.length === 0 ? 'designed' : missing.length ? 'partial'
    : all((c) => c.proof === 'proven') ? 'proven' : all((c) => c.proof !== 'prototype') ? 'tested' : all((c) => c.live) ? 'live' : 'built';
  return { state, found: found.map((c) => c.id), missing };
}

export default { RARITY_ORDER, PROOF_ORDER, CREATURE, ORGAN, cardOf, creatureCard, organCard, tongueCard, sentinelCard, airgapCard, ledgerCard, seedLibraryCard, attestCard, patternForgeCard, sigil, ringsOf, rarityTable, traitTable, filterDeck, realness };
