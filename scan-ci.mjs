// scan-ci.mjs — gather the EVIDENCE the tier is computed from. No judgement here, only facts.
//
// Two passes, cheap first:
//   1. every root repo → its most recent completed Actions run (1 call). No runs = no machine has
//      ever checked it.
//   2. only the repos that HAVE a run → read the workflow file and look for a mutation gate.
//
// ⚑ A repo cannot talk its way up this ladder. Everything here comes from GitHub's own API about
// what ran on GitHub's own hardware.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';

const OUT = 'ci-evidence.json';
const idx = JSON.parse(readFileSync('C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json', 'utf8'));
const N = idx.nodes.filter(n => !n.fork && !n.private);
const names = new Set(N.map(n => n.name));
const TAILS = ['onboard', 'paper', 'practice'];
const companionOf = (n) => {
  const m = /^(.+)-(api|mcp|sdk)$/.exec(n.name);
  if (m && names.has(m[1])) return m[1];
  for (const t of TAILS) if (n.name.length > t.length && n.name.endsWith(t) && names.has(n.name.slice(0, -t.length))) return n.name.slice(0, -t.length);
  return null;
};
const roots = N.filter(n => !companionOf(n));

const gh = (args) => new Promise((res) => {
  execFile('gh', args, { encoding: 'utf8', maxBuffer: 5e7 }, (err, stdout) => res(err ? null : stdout));
});

const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = roots.filter(r => !(r.name in done));
console.log(`roots ${roots.length} · already scanned ${Object.keys(done).length} · to do ${todo.length}`);

const LANES = 8;
let i = 0, ok = 0;
async function lane() {
  while (i < todo.length) {
    const r = todo[i++];
    const raw = await gh(['api', `repos/sjgant80-hub/${r.name}/actions/runs?per_page=1&status=completed`,
      '--jq', '{n: .total_count, r: (.workflow_runs[0] // {}) | {conclusion, name, path, sha: .head_sha, at: .updated_at}}']);
    let rec = { runs: 0 };
    if (raw) { try { const j = JSON.parse(raw); rec = { runs: j.n || 0, ...(j.r || {}) }; } catch { /* leave as no-runs */ } }
    done[r.name] = rec;
    ok++;
    if (ok % 50 === 0) { writeFileSync(OUT, JSON.stringify(done)); console.log(`  ${ok}/${todo.length}`); }
  }
}
await Promise.all(Array.from({ length: LANES }, lane));
writeFileSync(OUT, JSON.stringify(done));

const withRuns = Object.entries(done).filter(([, v]) => v.runs > 0);
const green = withRuns.filter(([, v]) => v.conclusion === 'success');
console.log(`\nscanned ${Object.keys(done).length}`);
console.log(`  have ever run CI : ${withRuns.length}`);
console.log(`  latest run green : ${green.length}`);
console.log(`\nworkflow names seen on green repos:`);
const byName = {};
for (const [, v] of green) byName[v.name || '?'] = (byName[v.name || '?'] || 0) + 1;
for (const [k, v] of Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${String(v).padStart(4)}  ${k}`);
