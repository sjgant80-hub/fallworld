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

const FROM = 'https://raw.githubusercontent.com/sjgant80-hub/fall-os/main';
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

const check = process.argv.includes('--check');
let drift = 0;

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
if (check) console.log(`in step with fall-os — ${KERNELS.length} kernels`);
