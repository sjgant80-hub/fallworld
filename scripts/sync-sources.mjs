// sync-sources.mjs — five things this world shows and does not own, fetched from the repos that do,
// at pinned commits, and checked by CI so they cannot drift into something typed.
//
//   vendor/fallforgemint/ladder.json   the sizer's size ladder (~1B → ~100–200B), from fallforgemint
//   vendor/kard-evolve/creatures.json  the creatures' sealed evolution: the champion, its line, gen 0,
//                                      and the self-observing run's summary, from kard-evolve
//   vendor/pattern-organs/organs.json  the funnel organs' sealed verdict: the grown and the hand-built champions of every
//                                      seed, graded on two held-out months, from pattern-organs
//   vendor/konomi-tongue/tongue.json   the Konomi Tongue's sealed verdict against 15×, from konomi-tongue
//   vendor/sentinel/sentinel.json      SENTINEL's sealed verdict (the immune gate + grown detector), from sentinel
//   vendor/kestrel-ledger/kestrel-ledger.json  kestrel-ledger's sealed verdict (IndexedDB as the Shadow Fold, step 4 of 4), from kestrel-ledger
//   vendor/seed-library/seed-library.json  the Seed Library's sealed measure (knowledge in tiny seeds, not weights), from seed-library
//
//   node scripts/sync-sources.mjs          write them
//   node scripts/sync-sources.mjs --check  exit 1 unless each is exactly what its pinned commit gives
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PINS = {
  fallforgemint: '2db5257bd79562679a908573f4489d2ccc580aa8',
  'kard-evolve': '3c1986582199ec09dd9c3cbc5a8ca91a19af1d5f',
  'pattern-organs': 'c5ce42c28e5e9ac87e2e59ccc18b511d3b210754',
  'konomi-tongue': '0cac69d9936b0591f0ea53e316abc8f980000a04',
  'sentinel': '41fb41c1d99d03d218d2229fd2d957fbce725250',
  'fall-airgap': 'e0d0af0cb1505abe78fd2ed0c38644905263b397',
  'kestrel-ledger': '4e6e506bfc8228b30fcdcc514e0b649d6663c424',
  'seed-library': '67d361c8e207f29e1158aacb98f770757b52b575',
  'estate-attest': 'd5bac08bae3bba4b5543e41a95bafb24626fd8dc',
};
const raw = (repo, file) => `https://raw.githubusercontent.com/sjgant80-hub/${repo}/${PINS[repo]}/${file}`;
const normalise = (t) => String(t).split('\r\n').join('\n');

async function grab(url, tries = 5) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return normalise(await r.text());
      last = String(r.status);
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) { last = e.message; }
    await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
  }
  throw new Error(`could not fetch ${url} (${last})`);
}

async function ladder() {
  const src = await grab(raw('fallforgemint', 'kernel.mjs'));
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
  return {
    source: { repo: 'sjgant80-hub/fallforgemint', sha: PINS.fallforgemint, file: 'kernel.mjs', sha256: createHash('sha256').update(src).digest('hex') },
    version: mod.CATALOG_VERSION, note: mod.CATALOG_VERIFY_NOTE, ladder: mod.LADDER, taskTier: mod.TASK_TIER,
  };
}

async function creatures() {
  const runText = await grab(raw('kard-evolve', 'data/run.json'));
  const obsText = await grab(raw('kard-evolve', 'data/observe-run.json'));
  const run = JSON.parse(runText), obs = JSON.parse(obsText);
  const r = run.record;
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return {
    source: {
      repo: 'sjgant80-hub/kard-evolve', sha: PINS['kard-evolve'],
      run: { file: 'data/run.json', sha256: createHash('sha256').update(runText).digest('hex'), sealedIn: run.sealedIn, recordSha256: run.recordSha256 },
      observe: { file: 'data/observe-run.json', sha256: createHash('sha256').update(obsText).digest('hex'), sealedIn: obs.sealedIn },
    },
    champion: r.champion, gen0: r.gen0, line: r.line, generations: r.history.length - 1,
    judged: { passed: run.judged.passed, of: run.judged.of, rules: run.judged.rules, real: run.judged.champReal, spec: run.judged.specReal },
    observer: {
      passed: obs.judged.passed, of: obs.judged.of, rules: obs.judged.rules,
      firstUV: obs.judged.uv, medians: Object.fromEntries(Object.entries(obs.judged.uv).map(([k, v]) => [k, median(v)])),
    },
  };
}

// the organs' verdict as pattern-organs' own grade() wrote it (data/verdict.json, a CI fixpoint there) — nothing re-graded here
async function organs() {
  const text = await grab(raw('pattern-organs', 'data/verdict.json'));
  const v = JSON.parse(text);
  return {
    source: { repo: 'sjgant80-hub/pattern-organs', sha: PINS['pattern-organs'], file: 'data/verdict.json', sha256: createHash('sha256').update(text).digest('hex'), sealedIn: v.sealedIn },
    passed: v.passed, of: v.of, medians: v.medians, wins: v.wins, sure: v.sure, reference: v.reference,
    seeds: v.seeds.map((s) => ({ seed: s.seed, grown: { key: s.grown.key, elements: s.grown.elements, heldAuc: s.grown.heldAuc }, hand: { key: s.hand.key, elements: s.hand.elements, heldAuc: s.hand.heldAuc } })),
    medianSeed: v.medianSeed,
  };
}

// SENTINEL's sealed verdict (data/verdict.json, a CI fixpoint there): what the immune gate caught and the grown detector found
async function sentinel() {
  const t = await grab(raw('sentinel', 'data/verdict.json'));
  const v = JSON.parse(t);
  return {
    source: { repo: 'sjgant80-hub/sentinel', sha: PINS['sentinel'], file: 'data/verdict.json', sha256: createHash('sha256').update(t).digest('hex'), sealedIn: v.sealedIn },
    passed: v.passed, of: v.of, hard: v.hard, grown: v.grown,
  };
}

// the Konomi Tongue's verdict as its own grade() wrote it (data/verdict.json, a CI fixpoint there)
async function tongue() {
  const text = await grab(raw('konomi-tongue', 'data/verdict.json'));
  const v = JSON.parse(text);
  return {
    source: { repo: 'sjgant80-hub/konomi-tongue', sha: PINS['konomi-tongue'], file: 'data/verdict.json', sha256: createHash('sha256').update(text).digest('hex'), sealedIn: v.sealedIn },
    passed: v.passed, of: v.of, text: v.text.ratio, textGlyphs: v.text.entries, json: v.json.ratio, combined: v.combined.ratio,
    bestPicture: v.bestPicture, bestText: v.bestText, rules: v.rules.map((r) => ({ id: r.id, pass: r.pass })),
  };
}

// fall-airgap's measured run (data/run.json, a CI fixpoint there): the 6-byte transport's byte-ratios in real wire bytes
async function airgap() {
  const t = await grab(raw('fall-airgap', 'data/run.json'));
  const v = JSON.parse(t);
  const coord = Math.max(...v.rows.map((r) => r.ratioPayload));
  const delta = Math.max(...v.rows.filter((r) => r.ratioDelta).map((r) => r.ratioDelta));
  const wire = Math.min(...v.rows.map((r) => r.ratioWireVsJsonSigned));
  const vals = Object.values(v.verdict);
  return {
    source: { repo: 'sjgant80-hub/fall-airgap', sha: PINS['fall-airgap'], file: 'data/run.json', sha256: createHash('sha256').update(t).digest('hex'), measured: v.measured },
    passed: vals.filter(Boolean).length, of: vals.length, coord, delta, wire,
  };
}

// kestrel-ledger's sealed record (data/run.json, its CI fixpoint): IndexedDB as the Shadow Fold — the
// ledger resumes mid-thought, N mutations reconstruct byte-identical, a six-byte ledger coordinate that
// is far smaller than JSON, a fast replay, and a poisoned ledger rejected to the same clean state.
async function kestrelLedger() {
  const t = await grab(raw('kestrel-ledger', 'data/run.json'));
  const v = JSON.parse(t);
  return {
    source: { repo: 'sjgant80-hub/kestrel-ledger', sha: PINS['kestrel-ledger'], file: 'data/run.json', sha256: createHash('sha256').update(t).digest('hex') },
    N: v.N, byteIdentical: v.reconstruction.byteIdentical,
    ratioPayloadVsJson: v.storage.ratioPayloadVsJson, ratioSignedVsJsonSigned: v.storage.ratioSignedVsJsonSigned,
    ledgerPayloadKB: v.storage.ledgerPayloadKB, jsonMB: v.storage.jsonMB,
    replayMs10k: v.replay.replayMs10k, poisonedEqualsClean: v.tamper.poisonedEqualsClean,
    verdictPassed: v.verdict.passed, verdictOf: v.verdict.of,
  };
}

// the Seed Library's sealed measure (data/run.json @ the measure commit of its two-commit seal): knowledge
// stored as tiny, readable konomi seeds — no weights — and a general ribosome germinates each on the node's
// own data, offline. The whole 4-domain library is a few hundred bytes; every seed grows a working build.
async function seedLibrary() {
  const t = await grab(raw('seed-library', 'data/run.json'));
  const v = JSON.parse(t);
  const L = v.library, S = L.seeds;
  const auc = (d) => S.find((s) => s.domain === d).heldAuc;
  const round = (x, n) => Number(x.toFixed(n));
  const ratios = S.map((s) => s.ratio);
  const spore = v.bonus.fallSpore;
  return {
    source: { repo: 'sjgant80-hub/seed-library', sha: PINS['seed-library'], file: 'data/run.json', sha256: createHash('sha256').update(t).digest('hex') },
    libraryBytes: L.totalSeedBytes, grownBytes: L.totalGrownBytes, domains: L.domains, sessions: v.sessions,
    shopperAuc: round(auc('shopper'), 2), triageAuc: round(auc('triage'), 2), waterAuc: round(auc('water'), 2), cropAuc: round(auc('crop'), 2),
    minRatio: round(Math.min(...ratios), 1), maxRatio: round(Math.max(...ratios), 1),
    growMs: v.growOnDemand.ms, growDomain: v.growOnDemand.domain,
    sporeBytes: spore.sporeBytes, sporeGrownBytes: spore.grownBytes, sporeRatio: Math.round(spore.ratio), sporeAuc: round(spore.heldAuc, 2),
    allOffline: S.every((s) => s.offline) && v.growOnDemand.offline && spore.offline,
    allGuarded: S.every((s) => s.guardValid && s.guardTamperedRejected),
  };
}

// estate-attest's own re-runnable verdict (data/verdict.json, its generated fixpoint): the estate's
// claims about itself, re-run against the real index — how many hold, and the headline recompute.
async function attest() {
  const t = await grab(raw('estate-attest', 'data/verdict.json'));
  const v = JSON.parse(t);
  return {
    source: { repo: 'sjgant80-hub/estate-attest', sha: PINS['estate-attest'], file: 'data/verdict.json', sha256: createHash('sha256').update(t).digest('hex') },
    held: v.held, of: v.of, total: v.total, public: v.public, private: v.private, live: v.live, pages: v.pages, withDesc: v.withDesc,
  };
}

const TARGETS = [
  ['vendor/fallforgemint/ladder.json', ladder],
  ['vendor/kard-evolve/creatures.json', creatures],
  ['vendor/pattern-organs/organs.json', organs],
  ['vendor/konomi-tongue/tongue.json', tongue],
  ['vendor/sentinel/sentinel.json', sentinel],
  ['vendor/fall-airgap/airgap.json', airgap],
  ['vendor/kestrel-ledger/kestrel-ledger.json', kestrelLedger],
  ['vendor/seed-library/seed-library.json', seedLibrary],
  ['vendor/estate-attest/estate-attest.json', attest],
];

const check = process.argv.includes('--check');
let drift = 0;
for (const [file, make] of TARGETS) {
  const want = JSON.stringify(await make(), null, 1) + '\n';
  const path = join(here, file);
  if (check) {
    const have = existsSync(path) ? normalise(readFileSync(path, 'utf8')) : null;
    if (have !== want) { drift++; console.error(`DRIFT ${file} is not what the pinned commit gives`); }
    else console.log(`in step  ${file}`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, want);
    console.log(`wrote    ${file}`);
  }
}
if (drift) process.exit(1);
