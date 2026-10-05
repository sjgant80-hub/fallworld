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
  'sentinel': '0100fa1f4a7e1e1ca2e6ca01529122d2f61b1387',
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

const TARGETS = [
  ['vendor/fallforgemint/ladder.json', ladder],
  ['vendor/kard-evolve/creatures.json', creatures],
  ['vendor/pattern-organs/organs.json', organs],
  ['vendor/konomi-tongue/tongue.json', tongue],
  ['vendor/sentinel/sentinel.json', sentinel],
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
