// scan-workflows.mjs — pass 2. For every repo that has ever run CI, list ALL its workflows.
//
// ⚑ THE LATEST RUN IS THE WRONG QUESTION. Pass 1 asked for the most recent completed run, and for a
// repo with Pages enabled that is almost always "pages build and deployment" — GitHub's automatic
// deploy, which checks NOTHING about the code. A real mutation gate sitting underneath it would have
// been invisible. So this asks each repo for every workflow it has, and the latest run of each.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';

const OUT = 'workflow-evidence.json';
const ev = JSON.parse(readFileSync('ci-evidence.json', 'utf8'));
const candidates = Object.entries(ev).filter(([, v]) => v.runs > 0).map(([k]) => k);

const gh = (args) => new Promise((res) => {
  execFile('gh', args, { encoding: 'utf8', maxBuffer: 5e7 }, (err, stdout) => res(err ? null : stdout));
});

// GitHub's own deploy jobs. They prove the site published, never that the code works.
const AUTOMATIC = /^(pages build and deployment|Deploy static content to Pages|pages-build-deployment)$/i;

const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = candidates.filter(c => !(c in done));
console.log(`repos with any CI: ${candidates.length} · to do ${todo.length}`);

let i = 0;
async function lane() {
  while (i < todo.length) {
    const name = todo[i++];
    const raw = await gh(['api', `repos/sjgant80-hub/${name}/actions/workflows`,
      '--jq', '[.workflows[] | {id, name, path, state}]']);
    let flows = [];
    try { flows = JSON.parse(raw || '[]'); } catch { flows = []; }
    const real = flows.filter(f => !AUTOMATIC.test(f.name) && !/dynamic\/pages/.test(f.path || ''));
    const out = [];
    for (const f of real) {
      const r = await gh(['api', `repos/sjgant80-hub/${name}/actions/workflows/${f.id}/runs?per_page=1&status=completed`,
        '--jq', '(.workflow_runs[0] // {}) | {conclusion, sha: .head_sha, at: .updated_at}']);
      let run = {};
      try { run = JSON.parse(r || '{}'); } catch { /* no run */ }
      // The workflow FILE is what says whether the tests were themselves attacked.
      const body = await gh(['api', `repos/sjgant80-hub/${name}/contents/${f.path}`, '--jq', '.content']);
      let text = '';
      if (body) { try { text = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8'); } catch { text = ''; } }
      out.push({
        name: f.name, path: f.path, state: f.state,
        conclusion: run.conclusion || null, sha: run.sha || null, at: run.at || null,
        // ⚑ A MENTION IS NOT A GATE. This was a substring match for the word "witness" anywhere in
        // the workflow YAML, and `mutation` is the single field that promotes a repo to PROVEN —
        // which tier.mjs then renders as "a mutation gate ran on GitHub's hardware and every mutant
        // died". A comment saying the word was enough to earn that sentence.
        //
        // Two things are now required, and they are the two that today proved are separately missing
        // in real repositories:
        //   1. an actual INVOCATION, not the word — `witness.mjs mutate`, or the Action by uses:
        //   2. a step that READS THE VERDICT. witness exits 0 even when mutants survive, so a
        //      workflow that runs it and never checks cannot fail on a survivor. proof-of-play ran
        //      that way for months and its gate had never tested anything at all.
        // Without both, the run being green says nothing about mutants, so it is not PROVEN.
        mutation: /witness(\.mjs)?\s+mutate\b|uses:\s*\S*witness|stryker\s+run|pitest|mutmut\s+run/i.test(text)
                  && /"clean"|\bclean\b\s*[:=]|--fail-on|exit\s+1/.test(text),
        pinned: /witness@v?\d|--branch\s+v\d|ref:\s*v\d/i.test(text),
      });
    }
    done[name] = out;
    if (Object.keys(done).length % 20 === 0) writeFileSync(OUT, JSON.stringify(done));
  }
}
await Promise.all(Array.from({ length: 6 }, lane));

// ⚑ WRITE WHAT WAS LEARNED. The loop only saved every twentieth repo, so the last batch — up to
// nineteen of them — was computed, counted in the totals printed below, and then thrown away. The
// next run silently rescanned them, and anything looked up straight from the file simply was not
// there. A cache that drops its tail is worse than no cache: the number on screen and the number on
// disk disagree, and only one of them is ever read again.
writeFileSync(OUT, JSON.stringify(done));
writeFileSync(OUT, JSON.stringify(done));

let anyReal = 0, greenReal = 0, mut = 0, mutGreen = 0;
for (const [, flows] of Object.entries(done)) {
  if (!flows.length) continue;
  anyReal++;
  if (flows.some(f => f.conclusion === 'success')) greenReal++;
  if (flows.some(f => f.mutation)) mut++;
  if (flows.some(f => f.mutation && f.conclusion === 'success')) mutGreen++;
}
console.log(`\nrepos with a REAL (non-Pages) workflow : ${anyReal}`);
console.log(`  ...and it is green                  : ${greenReal}`);
console.log(`  ...that workflow is a MUTATION gate : ${mut}`);
console.log(`  ...mutation gate AND green          : ${mutGreen}`);
