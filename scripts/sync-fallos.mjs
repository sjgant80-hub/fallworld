// sync-fallos.mjs — fallworld does not own an engine. fall-os does.
//
// ⚑ CONNECT, DO NOT INVENT. This repo re-implemented four things fall-os already had — routing,
// the tier ladder, the conductor, the shadow — because nobody checked first. A second engine beside
// the real one is worse than no engine: they drift, and the copy is the one people end up reading.
//
// So the kernels below are VENDORED, not rewritten: fetched from fall-os, kept byte-identical, and
// checked by CI. If fall-os moves and this repo does not, the check fails loudly rather than
// letting the game quietly run last month's OS.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// ⚑ THE ESTATE ALREADY HAD THESE. Every one of them was rebuilt from scratch in this repo before
// anybody looked — the cascade, the provider list, the plugin manifest. The rule that says check the
// full index first exists because this keeps happening, and it happened five times in one sitting.
const REPOS = {
  'fall-os': 'https://raw.githubusercontent.com/sjgant80-hub/fall-os/main',
  'fall-kit': 'https://raw.githubusercontent.com/sjgant80-hub/fall-kit/main',
  'fallcompass': 'https://raw.githubusercontent.com/sjgant80-hub/fallcompass/main',
};
const FROM = REPOS['fall-os'];
const OTHERS = [
  ['fall-kit', 'fall-kit.js'],          // the cascade: T0 off · T2 WebLLM in-browser · T3 BYOK
  ['fallcompass', 'fallcompass-shim.js'], // 8 providers, keys straight from localStorage
];
const KERNELS = [
  'core.mjs',        // φ, κ, fork / hold / collapse — the primitives everything else stands on
  'didy.mjs',        // the conductor: makeDidy, train, conduct
  'walk.mjs',        // THE CASCADE: worth, price, affordable, routes, walk, step
  'shadow.mjs',      // the roads not taken
  'organs/t0.mjs',   // tier 0 — no model at all
  'organs/t1.mjs',   // tier 1 — a real model in the visitor's own tab
];

const dir = 'vendor/fall-os';
mkdirSync(dir + '/organs', { recursive: true });

// One place decides what "the same file" means, so a Windows checkout and a Linux runner agree.
const normalise = (t) => String(t).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

// ⚑ A BLIP IS NOT DRIFT. GitHub raw returns the odd 502, and letting one kill the whole sync means
// a perfectly-in-step repo reports itself broken — which is the kind of red people learn to ignore.
async function grab(url, tries = 5) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return normalise(await r.text());
      last = `${r.status}`;
      // 404 will not get better by asking again; 429 and 5xx will, but only after a wait.
      if (r.status < 500 && r.status !== 429) break;
      await new Promise(ok => setTimeout(ok, 800 * (i + 1)));
    } catch (e) { last = e.message; await new Promise(ok => setTimeout(ok, 800 * (i + 1))); }
  }
  throw new Error(`could not fetch ${url} (${last})`);
}

const check = process.argv.includes('--check');
let drift = 0;

for (const [repo, f] of OTHERS) {
  let upstream;
  try { upstream = await grab(`${REPOS[repo]}/${f}`); }
  catch (e) { console.error(e.message); process.exit(1); }
  mkdirSync(`vendor/${repo}`, { recursive: true });
  const at = `vendor/${repo}/${f}`;
  const have = existsSync(at) ? normalise(readFileSync(at, 'utf8')) : null;
  const same = have !== null && createHash('sha256').update(have).digest('hex')
                            === createHash('sha256').update(upstream).digest('hex');
  if (check) { if (!same) { console.error(`${repo}/${f} has drifted — run: node sync-fallos.mjs`); drift += 1; } continue; }
  writeFileSync(at, upstream);
  console.log(`${same ? '=' : '↓'} ${repo}/${f}`);
}

for (const f of KERNELS) {
  const r = await fetch(`${FROM}/${f}`);
  if (!r.ok) { console.error(`could not fetch ${f}: ${r.status}`); process.exit(1); }
  const upstream = (await r.text()).split('\r\n').join('\n');
  const at = `${dir}/${f}`;
  const have = existsSync(at) ? readFileSync(at, 'utf8').split('\r\n').join('\n') : null;
  const same = have !== null && createHash('sha256').update(have).digest('hex')
                            === createHash('sha256').update(upstream).digest('hex');
  if (check) {
    if (!same) { console.error(`${f} has drifted from fall-os — run: node sync-fallos.mjs`); drift += 1; }
    continue;
  }
  writeFileSync(at, upstream);
  console.log(`${same ? '=' : '↓'} ${f}`);
}

if (check && drift) { console.error(`\n${drift} kernel(s) out of step with fall-os.`); process.exit(1); }
if (check) console.log(`in step with the estate — ${KERNELS.length + OTHERS.length} files from ${Object.keys(REPOS).length} repos`);
