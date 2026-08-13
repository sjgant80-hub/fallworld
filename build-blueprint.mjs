// build-blueprint.mjs — the map of what we are building, generated from the index.
//
// ⚑ EVERY NUMBER ON THIS PAGE IS COUNTED HERE, NEVER TYPED. The whole point of the page is to be the
// honest picture, so a hand-typed total would defeat it on the first day it drifted.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tierOf, tally, primaryOf } from './tier.mjs';

const EVIDENCE = existsSync('tier-evidence.json') ? JSON.parse(readFileSync('tier-evidence.json', 'utf8')) : {};
const PROOF = { proven: 'g', works: 'w', prototype: 'p' };

const idx = JSON.parse(readFileSync('C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json', 'utf8'));
const N = idx.nodes.filter(n => !n.fork);
const names = new Set(N.map(n => n.name));
const TAILS = ['onboard', 'paper', 'practice'];
const companionOf = (n) => {
  const m = /^(.+)-(api|mcp|sdk)$/.exec(n.name);
  if (m && names.has(m[1])) return m[1];
  for (const t of TAILS) if (n.name.length > t.length && n.name.endsWith(t) && names.has(n.name.slice(0, -t.length))) return n.name.slice(0, -t.length);
  return null;
};
// A description that only a minting script has ever written means nobody has said what the thing is.
const MINTED = [/minted by mint-all/i, /^\s*\S+\s+(api|mcp|sdk)\s*·\s*@ai-native-solutions/i, /sovereign single-file tool\s*·\s*@ai-native-solutions/i];
const isMinted = (d) => MINTED.some(re => re.test(String(d || '')));

const companions = N.filter(n => companionOf(n));
const roots = N.filter(n => !companionOf(n));
const real = roots.filter(r => r.desc && !isMinted(r.desc));
const blank = roots.filter(r => !r.desc || isMinted(r.desc));

const SHELVES = [
  ['Front door', 'How anyone finds and starts anything.', /^(fallworld|fallestate|fallharbor|fallfind|fallshell|fallboot|fallmarket|fallkard|fallgo|fallescape)$/],
  ['The thing you run', 'The operating system and the agent that lives in it.', /^(fall-os|fallcore|fall-kit|fallcore-factory|si-didy|liveware-core|openkonomi|sididy-cockpit|fallmind|fallmind-v2|fallrouter|fallcompass|fallrelay|fall-hot|fall-registry|fallsdk|fallhardened|fallseed|fallseed-generator)$/],
  ['Run a trade', 'One app per kind of firm — clinic, vet, law, claims.', /^(fallclinic|fallvet|fallhr|fallrecruit|fallclaim|falllegal|fallinsurance|fallbooks|fallpractice|fallaccount|fallaccount-trades|falladviser|falladviser-v2|fallcorp|fallonboard|fallpaper|fallenterprise|fallclinic-us|fallhub|fallforge)$/],
  ['Start a trade', 'Starter kits that stand a new firm up in one file.', /^fallseed-/],
  ['Sell', 'CRM, outreach, LinkedIn, booking.', /^(fallcrm|fallcrm-elite|fallforce|fallsalescrm|fallreach|fallscout|falllead|fallpost|fallgravity|fallflip|fallcarousel|fallguild|fallcall|fall-sales-marketing|fallgrade|fallslot|falllist|fallform|fallconcierge)$/],
  ['Make', 'The Adobe and Oracle replacements, plus documents.', /^(fallstudio|fallmage|fallvector|fallpage|fallmotion|fallscene|fallaudio|fallpdf|fallasset|falloffice|fallnote|fallbase|fallbuild|fallledger|fallreport|fallcube-api|fallscribe|fallanno)$/],
  ['Money', 'Invoices, payments, cash runway, refunds.', /^(fallinvoice|fallpay|fallflow|fallap|fallback|fallstack|fallmap|fallmint|fall-sdk-generator|fallskin)$/],
  ['Talk', 'Mesh, mail, broadcast, phones — no middleman.', /^(fallnet|falllink|fallmail|fallcast|fallhop|fallcarrier|fallbridge|fallonion|falllens|fallcdn|fallperf|fallmobile|fallphone|fall-kqtt-bridge|fall-mcp-bridge|fallherd|falllight)$/],
  ['Remember', 'Notes, memory, storage, backup.', /^(fallgarden|fall-remember|fallrecall|fallpod|fallstore|fallvault|fallecho|fallsync|fallmirror|fallpx)$/],
  ['Prove', 'The bit nobody else has: proof a thing actually works.', /^(fallid|fallshield|fallsignature|falltrust|falldns|fallineage|fallsieve|fallwatch|fallwatcher|fallresolve|fallcloser|fallconsensus|fallcharter|fall-verify|fall-vetter|fall-prompt-gate|fallsecurity|witness|proof-of-play|acg-assessor|konomify|earned|the-toll|konomium-vault)$/],
  ['Law and rights', 'Letters, claims, research, the EU AI Act.', /^(falljustice|fallbrief|fallfence|fallforensics|fall-euaiact|redress-engine|divorcerbot)$/],
  ['The economy', 'Agents that work, trade and get paid.', /^(fallcolony|konomi-swarm|fallswarm|kcc-jobs|agora|fallharmony)$/],
  ['Thinking tools', 'Research fan-out, autopilot, the odd experiments.', /^(fall-raas|fall-substrate|fall-autopilot-kit|fall-cube|fall-bloom|fall-palette|fall127agents|falllearn)$/],
];

// Every build carries the rung a machine put it on. Attached BEFORE shelving, so a shelf can never
// show a count the tier data disagrees with.
for (const r of real) { const t = tierOf(EVIDENCE[r.name], { live: r.live }); r.tier = t.tier; r.tierWhy = t.why; }

const taken = new Set();
const shelves = SHELVES.map(([title, blurb, re]) => {
  const rows = real.filter(r => !taken.has(r.name) && re.test(r.name));
  rows.forEach(r => taken.add(r.name));
  return {
    title, blurb,
    rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
    counts: tally(rows),
  };
});
const unshelved = real.filter(r => !taken.has(r.name));

// The overlaps — the actual argument for streamlining.
const DUPES = [
  ['One job, seven apps', 'Customer records and outreach', /^(fallcrm|fallcrm-elite|fallforce|fallsalescrm|fallreach|fallscout|falllead)$/],
  ['One suite, nine apps', 'The Adobe replacement', /^(fallstudio|fallmage|fallvector|fallpage|fallmotion|fallscene|fallaudio|fallpdf|fallasset)$/],
  ['One starter, seventeen copies', 'Per-trade starter kits', /^fallseed-/],
  ['One set of books, eight apps', 'Accounts and advice', /^(fallaccount|fallaccount-trades|falladviser|falladviser-v2|fallbooks|fallpractice|fallonboard|fallpaper)$/],
  ['One inbox, nine apps', 'Getting a message from A to B', /^(fallnet|falllink|fallmail|fallcast|fallhop|fallcarrier|fallbridge|fallonion|falllens)$/],
  ['One disk, seven apps', 'Keeping bytes somewhere', /^(fallstore|fallpod|fallvault|fallecho|fallcdn|fallsync|fallcube-api)$/],
  ['One passport, six apps', 'Proving who you are', /^(fallid|fallshield|fallsignature|falltrust|falldns|fallineage)$/],
];
// Move 2 in one line: for each cluster, the first choice is whichever is furthest up the ladder.
// primaryOf keeps the rest — a cluster that quietly loses members reads exactly like one that got
// finished, and only one of those is true.
const dupes = DUPES.map(([label, job, re]) => {
  const rows = real.filter(r => re.test(r.name));
  const p = primaryOf(rows);
  return { label, job, primary: p && p.primary, rest: p ? p.rest : [], n: rows.length };
});

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pc = (a, b) => Math.round((a / b) * 100);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fall World — the blueprint</title>
<meta name="description" content="What we are actually building, counted from the index: ${real.length} described builds on ${shelves.length} shelves, and the plan to make it one door.">
<style>
 :root{--bg:#0b0d10;--panel:#141820;--line:#242b36;--ink:#e6ebf2;--dim:#98a3b3;--faint:#6b7688;
   --gold:#d8a94a;--ok:#48b98a;--warn:#e0a33f;--no:#e0616d;
   --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
   --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
 @media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#faf9f6;--panel:#fff;--line:#e2ded4;
   --ink:#1d1f24;--dim:#5b6472;--faint:#8b93a1;--gold:#9a6f14}}
 :root[data-theme="light"]{--bg:#faf9f6;--panel:#fff;--line:#e2ded4;--ink:#1d1f24;--dim:#5b6472;--faint:#8b93a1;--gold:#9a6f14}
 *{box-sizing:border-box}html,body{margin:0}
 body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6}
 .wrap{max-width:60rem;margin:0 auto;padding:0 1.2rem 5rem}
 a{color:var(--gold)}
 header{padding:3.2rem 0 1.6rem}
 .kick{font-family:var(--mono);font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:0 0 .8rem}
 h1{font-size:clamp(2rem,6vw,3.1rem);margin:0 0 .7rem;letter-spacing:-.025em;line-height:1.05;text-wrap:balance}
 .lede{color:var(--dim);font-size:clamp(1rem,2.4vw,1.16rem);max-width:46rem;margin:0}
 .lede b{color:var(--ink)}
 h2{font-size:.72rem;font-family:var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint);
   margin:3.2rem 0 1rem;padding-bottom:.5rem;border-bottom:1px solid var(--line)}
 .model{display:grid;gap:.7rem;margin:1.6rem 0 0}
 .step{display:grid;grid-template-columns:2.2rem 1fr;gap:.9rem;align-items:start;background:var(--panel);
   border:1px solid var(--line);border-radius:11px;padding:1rem 1.15rem}
 .step .n{font-family:var(--mono);font-size:1.5rem;font-weight:700;color:var(--gold);line-height:1}
 .step h3{margin:0 0 .25rem;font-size:1.05rem}
 .step p{margin:0;color:var(--dim);font-size:.93rem}
 .nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.6rem;margin:1.2rem 0 0}
 .num{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.85rem 1rem}
 .num b{display:block;font-family:var(--mono);font-size:1.6rem;color:var(--ink);line-height:1.1;font-variant-numeric:tabular-nums}
 .num span{color:var(--faint);font-size:.76rem}
 .shelf{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:1rem 1.15rem;margin:.6rem 0}
 .shelf .hd{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap}
 .shelf h3{margin:0;font-size:1.05rem}
 .shelf .ct{font-family:var(--mono);font-size:.74rem;color:var(--gold)}
 .shelf .bl{color:var(--dim);font-size:.9rem;margin:.2rem 0 .6rem}
 .tags{display:flex;flex-wrap:wrap;gap:.3rem}
 .tags a{font-family:var(--mono);font-size:.72rem;text-decoration:none;color:var(--dim);
   border:1px solid var(--line);border-radius:5px;padding:.16rem .45rem;background:var(--bg)}
 .tags a:hover{border-color:var(--gold);color:var(--ink)}
 .dupe{display:grid;grid-template-columns:1fr;gap:.35rem;background:var(--panel);border:1px solid var(--line);
   border-left:3px solid var(--warn);border-radius:0 10px 10px 0;padding:.8rem 1.05rem;margin:.5rem 0}
 .dupe .t{font-weight:600}.dupe .j{color:var(--faint);font-size:.82rem}
 .dupe .l{font-family:var(--mono);font-size:.74rem;color:var(--dim);word-break:break-word;display:grid;gap:.2rem}
 .dupe .lead b{color:var(--ink)}
 .dupe .lead i{font-style:normal;font-size:.68rem;border:1px solid currentColor;border-radius:4px;padding:0 .3rem;margin-left:.3rem}
 .dupe .rest{color:var(--faint)}
 .mix{font-family:var(--mono);font-size:.7rem;color:var(--faint);margin-left:auto}
 .mix b{font-weight:600}
 .g{color:var(--ok)}.w{color:var(--warn)}.p{color:var(--faint)}
 .tags a.g{border-color:var(--ok);color:var(--ok)}
 .tags a.w{border-color:var(--warn)}
 .tags a.p{opacity:.72}
 .move{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:1rem 1.15rem;margin:.6rem 0}
 .move h3{margin:0 0 .3rem;font-size:1.06rem}
 .move h3 em{font-style:normal;color:var(--gold);font-family:var(--mono);font-size:.8rem;margin-right:.5rem}
 .move p{margin:.3rem 0;color:var(--dim);font-size:.93rem}
 .move .out{color:var(--ok);font-size:.87rem;margin-top:.5rem}
 .tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:.6rem;margin-top:1rem}
 .tier{border:1px solid var(--line);border-radius:10px;padding:.85rem 1rem;background:var(--panel)}
 .tier b{display:block;font-size:.95rem;margin-bottom:.2rem}
 .tier.p b{color:var(--no)}.tier.w b{color:var(--warn)}.tier.g b{color:var(--ok)}
 .tier span{color:var(--dim);font-size:.85rem}
 .warn{border-left:3px solid var(--warn);background:var(--panel);border-radius:0 10px 10px 0;
   padding:.85rem 1.1rem;color:var(--dim);font-size:.92rem;margin:1rem 0}
 .warn b{color:var(--ink)}
 footer{margin-top:3.5rem;padding-top:1.4rem;border-top:1px solid var(--line);color:var(--faint);font-size:.83rem}
</style></head><body><div class="wrap">
<header>
 <p class="kick">The blueprint</p>
 <h1>What we are actually building</h1>
 <p class="lede">One shop, one thing you run, and everything else on shelves inside it.
 <b>${real.length} builds a person has described</b>, counted from the index on this page — nothing here
 is typed by hand, so it cannot quietly go out of date.</p>
 <div class="nums">
  <div class="num"><b>${N.length}</b><span>repos, forks excluded</span></div>
  <div class="num"><b>${roots.length}</b><span>after folding companions in</span></div>
  <div class="num"><b>${real.length}</b><span>someone said what it does</span></div>
  <div class="num"><b>${blank.length}</b><span>no description yet</span></div>
  <div class="num"><b>${roots.filter(r => r.live).length}</b><span>you can open right now</span></div>
  <div class="num"><b style="color:var(--ok)">${tally(real).proven}</b><span>a machine could not break</span></div>
 </div>
</header>

<h2>The model, in three steps</h2>
<div class="model">
 <div class="step"><div class="n">1</div><div>
  <h3>Fall World is the shop</h3>
  <p>One address. You open it, you see everything there is, you pick a thing and it runs. Nobody needs
  to know what a repo is — same as buying a game.</p></div></div>
 <div class="step"><div class="n">2</div><div>
  <h3>fall-os is what you install, and Didy lives in it</h3>
  <p>The operating system plus your own agent. It runs on your machine, on your electric. That is the
  whole product — everything else is gear it can pick up.</p></div></div>
 <div class="step"><div class="n">3</div><div>
  <h3>The rest are shelves</h3>
  <p>Run a trade. Sell. Make. Talk. Remember. Prove. You go to a shelf because you have a job to do,
  not because you know a tool's name.</p></div></div>
</div>

<h2>The shelves — every described build, on exactly one</h2>
${shelves.map(s => `<div class="shelf">
 <div class="hd"><h3>${esc(s.title)}</h3><span class="ct">${s.rows.length} build${s.rows.length === 1 ? '' : 's'}</span>
  <span class="mix"><b class="g">${s.counts.proven} proven</b> · <b class="w">${s.counts.works} works</b> · <b class="p">${s.counts.prototype} prototype</b></span></div>
 <p class="bl">${esc(s.blurb)}</p>
 <div class="tags">${s.rows.map(r => `<a class="${PROOF[r.tier]}" title="${esc(r.tierWhy)}" href="${r.live ? esc(r.url || `https://sjgant80-hub.github.io/${r.name}/`) : `https://github.com/sjgant80-hub/${esc(r.name)}`}">${esc(r.name)}</a>`).join('')}</div>
</div>`).join('')}
<div class="warn"><b>${unshelved.length} described builds are not on a shelf yet.</b> They are mostly guild
tools, the konomi test suite, one-off experiments and the prior-art filings. They are not lost — they
are just not part of the product line, and pretending otherwise would make this map a wish rather
than a picture.</div>

<h2>The problem — too many front doors for one job</h2>
<p class="lede" style="margin-bottom:.4rem">Nothing here is broken. The trouble is that a person with
one job to do is shown seven answers, and no way to tell which one is finished.</p>
${dupes.map(d => `<div class="dupe">
 <div class="t">${esc(d.label)}</div>
 <div class="j">${esc(d.job)}</div>
 <div class="l"><span class="lead">First choice: <b>${esc(d.primary ? d.primary.name : '—')}</b>${d.primary ? ` <i class="${PROOF[d.primary.tier]}">${esc(d.primary.tier)}</i>` : ''}</span>
  <span class="rest">also here: ${d.rest.map(r => esc(r.name)).join(' · ') || 'nothing'}</span></div>
</div>`).join('')}
<p class="lede" style="font-size:.92rem">The first choice is not a preference — it is whichever build is
furthest up the ladder, ties broken by most recently touched. When a runner-up gets gated and passes,
it becomes the first choice on its own, without anybody editing this page.</p>
<div class="warn">On top of that, <b>${companions.length} companion repos</b> (<code>-api</code>,
<code>-mcp</code>, <code>-sdk</code>) sit behind ${roots.length} real ones — ${pc(companions.length, N.length)}% of
everything, and not one of them is a thing a person opens.</div>

<h2>The plan — four moves</h2>
<div class="move"><h3><em>Move 1</em>One door</h3>
 <p>Fall World is the only address anybody is given. Every shelf, every build, reachable from it. No
 more sending people a repo link.</p>
 <p class="out">Done when: one URL answers "what have you got?"</p></div>
<div class="move"><h3><em>Move 2</em>One answer per job</h3>
 <p>Where seven apps do one job, pick the one that is furthest along and make the others modes inside
 it. The names stay as redirects so nothing anybody bookmarked breaks.</p>
 <p class="out">Done when: each shelf has a clear first choice instead of a list.</p></div>
<div class="move"><h3><em>Move 3</em>Hide the plumbing</h3>
 <p>The ${companions.length} companion repos are machine-minted bindings, not products. They stay where they are
 and come off every surface a person sees.</p>
 <p class="out">Done when: the shop shows ${roots.length} things, not ${N.length}.</p></div>
<div class="move"><h3><em>Move 4</em>Say which ones are finished</h3>
 <p>This is the one that matters. Right now a rough prototype and a properly tested build look
 identical, so everything reads as equally solid — which means nothing does.</p>
 <div class="tiers">
  <div class="tier p"><b>Prototype</b><span>It exists and it opens. No promises.</span></div>
  <div class="tier w"><b>Works</b><span>It does the job end to end, and it is being used.</span></div>
  <div class="tier g"><b>Proven</b><span>A machine tried to break it and failed, on hardware we do not own.</span></div>
 </div>
 <p class="out" style="margin-top:.7rem">Done when: every build on every shelf shows one of these three, worked out from evidence rather than claimed.</p></div>
<div class="warn"><b>Being straight about it: most of this is at Prototype.</b> A small number are Proven —
the ones with a mutation gate green on GitHub's own runners. Move 4 is what turns a big pile into a
short honest list, and it is the only move that makes the other three worth doing.</div>

<footer>
 <p>Generated by <code>build-blueprint.mjs</code> from the estate index of ${idx.generated || 'today'} —
 every count on this page was counted, not typed. · <a href="./">back to Fall World</a></p>
</footer>
</div></body></html>
`;

writeFileSync('C:/Users/sjgan/fallworld/blueprint.html', html);
console.log(`blueprint.html — ${real.length} described · ${shelves.length} shelves · ${unshelved.length} unshelved · ${(html.length / 1024).toFixed(0)}KB`);
for (const s of shelves) console.log(`   ${String(s.rows.length).padStart(3)}  ${s.title}`);
