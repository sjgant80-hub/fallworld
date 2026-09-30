#!/usr/bin/env node
// scripts/grow-trial.mjs — THE TRIAL OF RULES, sealed before any model is asked.
//
//   node scripts/grow-trial.mjs --seal    write data/grow-prereg.json (refuses to overwrite) — commit and push it first
//   node scripts/grow-trial.mjs --check   exit 1 unless the committed pre-registration is what the kernel and its sealing
//                                         commit give
//   node scripts/grow-trial.mjs --run     refuses unless the seal is committed and on GitHub; asks each stage's model on this
//                                         machine's Ollama once; writes data/grow-run.json with every raw reply
//   node scripts/grow-trial.mjs --verify  re-grades every recorded reply with today's kernel; exit 1 unless it matches
//
// Every model runs here, on this machine's own electricity. Nothing is sent anywhere else.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { pickTrial, trialPrompt, rarityRule, scoreStage, judgeTrial, RULES_TEXT } from '../trial.mjs';
import { stagesFrom } from '../grow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRE = join(ROOT, 'data', 'grow-prereg.json'), OUT = join(ROOT, 'data', 'grow-run.json');
const text = (f) => readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const die = (m) => { console.error(m); process.exit(1); };
const has = (f) => process.argv.includes(f);
const stable = (o) => JSON.stringify(o, null, 1) + '\n';
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const atCommit = (c) => (f) => git('show', c + ':' + f).replace(/\r\n/g, '\n');

const SEED = 'fallworld-trial-2026-09-30', PER = 10, BAR = 57;
const MEASURED = [['hatchling', 'llama3.2:1b'], ['runner', 'qwen2.5:7b'], ['keeper', 'qwen2.5:14b']];
const CALL = { endpoint: 'http://127.0.0.1:11434/api/generate', stream: false, options: { temperature: 0, seed: 7, num_predict: 16 } };

function prereg(read = text) {
  const world = JSON.parse(read('world.json'));
  const vend = JSON.parse(read('vendor/fallforgemint/ladder.json'));
  const stages = stagesFrom(vend.ladder);
  const trial = pickTrial(world.items.filter((i) => !i.private), SEED, PER);
  const paramsOf = (model) => vend.ladder.flatMap((r) => r.models).find((m) => m.id === model).paramsB;
  return {
    kind: 'fallworld-grow-prereg', v: 1, written: '2026-09-30',
    approvedBy: 'Simon, relayed verbatim: "also like the didys hatch into webllm first then 7b 14b 70 200b etc etc"',
    statement: 'Sealed, committed and pushed before any model is asked. Every model runs on this machine through Ollama; nothing is sent anywhere else. The result is published whichever way it lands.',
    question: 'What is the smallest stage of didy that can apply the world\'s own rarity rule, card by card, well enough to be trusted with it?',
    trial: {
      from: { file: 'world.json', sha256: sha(read('world.json')), generated: world.generated },
      seed: SEED, perRarity: PER, rules: RULES_TEXT, cards: trial,
      prompts: { built: 'trial.mjs trialPrompt(card.facts)', sha256: sha(trial.map((t) => trialPrompt(t.facts)).join('\n\u0000\n')) },
      graded: 'trial.mjs gradeReply: the reply must name exactly one rarity, and it must be the one the rule gives',
    },
    bar: { right: BAR, of: trial.length, why: 'a didy that applies the world\'s rules for you has to be near-exact: at most three slips in sixty' },
    stages: MEASURED.map(([id, model]) => ({ id, name: stages.find((s) => s.id === id).name, model, paramsB: paramsOf(model) })),
    notMeasured: {
      fledgling: 'no ~3–4B model is on this machine, and downloading one was not part of this run',
      larger: 'sage, elder and titan need more memory than this machine has; the run records the machine and the page computes the floor',
      tab: 'the hatchling in a browser tab (WebLLM) is the same size of model; the live page lets anyone run this same trial there, on their own device',
    },
    sizer: { heuristic: 'fallforgemint TASK_TIER.classify', rung: vend.taskTier.classify, stage: stages[vend.taskTier.classify + 1].id, note: 'the sizer\'s own starting guess for a classify job, which it calls a heuristic, never a measured score' },
    call: CALL,
    rules: [
      { id: 'bar-cleared', rule: 'at least one measured stage names the right rarity for at least ' + BAR + ' of the ' + trial.length + ' cards' },
      { id: 'size-helps', rule: 'each larger stage gets at least as many right as the one below it' },
      { id: 'hatchling-short', rule: 'the hatchling (~1B) falls short of the bar, so this job needs a didy to grow' },
      { id: 'smaller-suffices', rule: 'the smallest stage that clears the bar is not the largest one measured, so growing further would be waste' },
    ],
    predictions: {
      said: 'before any model was asked, by Kar',
      'bar-cleared': 'pass — the keeper (14B) clears it',
      'size-helps': 'pass',
      'hatchling-short': 'pass — I expect the hatchling around half right; ordered rules with a distracting description are where small models slip',
      'smaller-suffices': 'pass — I expect the runner (7B) to clear the bar, so the keeper is not needed; this is the one I am least sure of',
      sizer: 'the sizer starts a classify job at the hatchling; I expect the measurement to overrule it',
    },
  };
}

async function ask(model, prompt) {
  const r = await fetch(CALL.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, stream: false, options: CALL.options }) });
  if (!r.ok) throw new Error(model + ' answered ' + r.status);
  const j = await r.json();
  return { reply: j.response, evalCount: j.eval_count, evalMs: Math.round(j.eval_duration / 1e6), promptCount: j.prompt_eval_count, promptMs: Math.round(j.prompt_eval_duration / 1e6), totalMs: Math.round(j.total_duration / 1e6) };
}

function grade(pre, runs) {
  const scores = pre.stages.map((s) => ({ id: s.id, paramsB: s.paramsB, ...scoreStage(pre.trial.cards, runs[s.id].map((x) => x.reply)) }));
  return { scores, judged: judgeTrial(scores.map(({ id, paramsB, right, n }) => ({ id, paramsB, right, n })), pre.bar.right) };
}

if (has('--seal')) {
  if (existsSync(PRE)) die('data/grow-prereg.json exists — it is sealed');
  const p = prereg();
  if (p.trial.cards.some((c) => rarityRule(c.facts) !== c.answer)) die('the trial disagrees with the rule it tests');
  mkdirSync(dirname(PRE), { recursive: true });
  writeFileSync(PRE, stable(p));
  console.log('sealed data/grow-prereg.json · ' + p.trial.cards.length + ' cards · sha256 ' + sha(stable(p)));
  process.exit(0);
}
if (!existsSync(PRE)) die('not sealed yet — node scripts/grow-trial.mjs --seal');
const sealedIn = existsSync(OUT) ? JSON.parse(text('data/grow-run.json')).sealedIn : null;
if (has('--check')) {
  const same = text('data/grow-prereg.json') === stable(prereg(sealedIn ? atCommit(sealedIn) : text))
    && (!sealedIn || atCommit(sealedIn)('data/grow-prereg.json') === text('data/grow-prereg.json'));
  console.log(same ? 'the trial\'s pre-registration matches its inputs' + (sealedIn ? ' as sealed in ' + sealedIn.slice(0, 7) : '') : 'data/grow-prereg.json differs from what its inputs give');
  process.exit(same ? 0 : 1);
}
const pre = JSON.parse(text('data/grow-prereg.json'));
if (has('--verify')) {
  if (!sealedIn) die('no data/grow-run.json to verify');
  const run = JSON.parse(text('data/grow-run.json'));
  const same = JSON.stringify(grade(pre, run.runs)) === JSON.stringify(run.result);
  console.log(same ? 'REPRODUCED — every recorded reply re-grades to the committed result' : 'NOT REPRODUCED');
  process.exit(same ? 0 : 1);
}
if (!has('--run')) die('usage: node scripts/grow-trial.mjs --seal | --check | --run | --verify');
if (sealedIn) die('data/grow-run.json exists — the trial runs once');
if (stable(pre) !== stable(prereg())) die('the committed pre-registration is not what this script seals from these files');
if (git('status', '--porcelain', 'data/grow-prereg.json', 'scripts/grow-trial.mjs', 'trial.mjs', 'grow.mjs', 'world.json', 'vendor/fallforgemint/ladder.json').trim()) die('commit the seal and everything it reads first');
git('fetch', '-q', 'origin');
try { git('merge-base', '--is-ancestor', 'HEAD', 'origin/main'); } catch { die('push first — HEAD is not on origin/main'); }
const sealCommit = git('log', '-1', '--format=%H', '--', 'data/grow-prereg.json').trim();

const tags = await (await fetch('http://127.0.0.1:11434/api/tags')).json();
const models = {}, runs = {};
const started = new Date().toISOString();
for (const s of pre.stages) {
  const t = tags.models.find((m) => m.name === s.model);
  if (!t) die(s.model + ' is not on this machine');
  models[s.id] = { model: s.model, digest: t.digest, bytes: t.size, parameterSize: t.details.parameter_size, quantization: t.details.quantization_level, family: t.details.family };
  runs[s.id] = [];
  for (const [k, card] of pre.trial.cards.entries()) {
    runs[s.id].push(await ask(s.model, trialPrompt(card.facts)));
    if ((k + 1) % 10 === 0) console.log(s.id + ' ' + (k + 1) + '/' + pre.trial.cards.length);
  }
}
const result = grade(pre, runs);
writeFileSync(OUT, stable({
  kind: 'fallworld-grow-run', v: 1, sealedIn: sealCommit, startedAt: started, finishedAt: new Date().toISOString(),
  machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, memoryBytes: os.totalmem(), platform: os.platform() + ' ' + os.release(), ollama: (await (await fetch('http://127.0.0.1:11434/api/version')).json()).version },
  models, runs, result,
}));
console.log('measured · ' + result.judged.passed + ' of ' + result.judged.of + ' rules · ' + result.scores.map((s) => s.id + ' ' + s.right + '/' + s.n).join(' · '));
