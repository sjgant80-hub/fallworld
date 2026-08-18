// build-blueprint.mjs — the map of Fall World as a PLACE, not a product catalogue.
//
// ⚑ THE ORDER MATTERS. You buy it, you install it, you walk in. Rooms first; the 600-odd tools are
// gear you carry into them, and they come later. An earlier version of this page led with the tool
// shelves, which read like a software inventory rather than somewhere you go.
//
// Room names and one-liners are read from the real pages in fallkard, and the counts from the estate
// index — nothing on this page is typed by hand, so it cannot quietly go out of date.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tierOf, tally } from './tier.mjs';
// The world is data now, not a module — see rooms.test.mjs for why.
const world_ = JSON.parse(readFileSync(join(here, 'rooms.json'), 'utf8'));
const { wings: WINGS, wayIn: WAY_IN, roomCount: ROOM_COUNT } = world_;

const EVIDENCE = existsSync('tier-evidence.json') ? JSON.parse(readFileSync('tier-evidence.json', 'utf8')) : {};
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
const MINTED = [/minted by mint-all/i, /^\s*\S+\s+(api|mcp|sdk)\s*·\s*@ai-native-solutions/i, /sovereign single-file tool\s*·\s*@ai-native-solutions/i];
const roots = N.filter(n => !companionOf(n));
const real = roots.filter(r => r.desc && !MINTED.some(re => re.test(r.desc)));
for (const r of real) r.tier = tierOf(EVIDENCE[r.name], { live: r.live }).tier;
const counts = tally(real);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const roomCount = ROOM_COUNT;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fall World — the blueprint</title>
<meta name="description" content="One link, one thing to install, and ${roomCount} places to go. The map of Fall World in plain words.">
<style>
 :root{--bg:#0b0a09;--panel:#151210;--line:#2c2721;--ink:#ece2cc;--dim:#a1988a;--faint:#6f675b;
   --gold:#c9a227;--soft:#e6cd72;--ok:#5cb98a;
   --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
   --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
 @media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#fbf8f1;--panel:#fff;--line:#e4dcc9;
   --ink:#22201c;--dim:#5e564a;--faint:#8b8272;--gold:#8a6a13;--soft:#6d5310}}
 :root[data-theme="light"]{--bg:#fbf8f1;--panel:#fff;--line:#e4dcc9;--ink:#22201c;--dim:#5e564a;--faint:#8b8272;--gold:#8a6a13;--soft:#6d5310}
 *{box-sizing:border-box}html,body{margin:0}
 body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16.5px;line-height:1.6}
 .wrap{max-width:56rem;margin:0 auto;padding:0 1.2rem 5rem}
 a{color:var(--soft)}
 header{padding:3.4rem 0 1.4rem;text-align:center}
 h1{font-family:var(--serif);font-size:clamp(2.3rem,8vw,4rem);margin:0 0 .5rem;letter-spacing:.04em;font-weight:500;
   background:linear-gradient(180deg,#f6e8bd,var(--gold) 62%,#8a6c1c);-webkit-background-clip:text;background-clip:text;color:transparent}
 .lede{font-family:var(--serif);font-size:clamp(1.05rem,2.6vw,1.3rem);color:var(--dim);max-width:34rem;margin:0 auto;font-style:italic}
 .steps{display:grid;gap:.7rem;margin:2.4rem 0 0}
 .step{display:grid;grid-template-columns:2.4rem 1fr;gap:1rem;align-items:start;background:var(--panel);
   border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.2rem}
 .step .n{font-family:var(--serif);font-size:1.7rem;color:var(--gold);line-height:1}
 .step h2{margin:0 0 .2rem;font-size:1.12rem;border:0;padding:0;letter-spacing:0;text-transform:none;color:var(--ink)}
 .step p{margin:0;color:var(--dim);font-size:.97rem}
 .step .go{display:inline-block;margin-top:.55rem;font-size:.9rem;font-weight:600;text-decoration:none;
   border:1px solid var(--gold);color:var(--soft);border-radius:8px;padding:.35rem .85rem}
 h2{font-family:var(--serif);font-size:1.5rem;color:var(--gold);margin:2.8rem 0 .2rem;font-weight:500}
 .wingblurb{color:var(--dim);margin:0 0 1rem;font-size:.97rem}
 .rooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(15.5rem,1fr));gap:.7rem}
 .room{display:block;text-decoration:none;background:var(--panel);border:1px solid var(--line);
   border-left:3px solid var(--line);border-radius:10px;padding:.85rem 1rem}
 .room:hover{border-color:#4a4239;border-left-color:var(--gold)}
 .room.first{border-left-color:var(--gold)}
 .room .n{display:block;font-family:var(--serif);font-size:1.12rem;color:var(--ink);margin-bottom:.2rem}
 .room .s{display:block;color:var(--dim);font-size:.9rem;line-height:1.45}
 .room .tag{display:inline-block;margin-top:.45rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
 .note{border-left:3px solid var(--line);padding:.1rem 0 .1rem 1rem;color:var(--dim);margin:1.4rem 0;font-size:.97rem}
 .note b{color:var(--ink)}
 .later{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.3rem;margin-top:1rem}
 .nums{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}
 .num{border:1px solid var(--line);border-radius:999px;padding:.3rem .8rem;font-size:.82rem;color:var(--dim)}
 .num b{color:var(--ink);font-variant-numeric:tabular-nums}
 .num.ok b{color:var(--ok)}
 footer{margin-top:3rem;padding-top:1.3rem;border-top:1px solid var(--line);color:var(--faint);font-size:.85rem;text-align:center}
</style></head><body><div class="wrap">
<header>
 <h1>FALL WORLD</h1>
 <p class="lede">One link. One thing to install. ${roomCount} places to go.</p>
</header>

<div class="steps">
 <div class="step"><div class="n">1</div><div>
  <h2>Get it</h2>
  <p>One address, like buying a game. You do not need to know what any of it is built from.</p>
  <a class="go" href="https://sjgant80-hub.github.io/fallworld/">Open Fall World →</a>
 </div></div>
 <div class="step"><div class="n">2</div><div>
  <h2>Install it, and meet your didy</h2>
  <p>fall-os runs on your own machine, on your own electricity. Your didy is your character — it
  learns what you do and gets better at it. Nothing has to leave the house.</p>
  <a class="go" href="https://sjgant80-hub.github.io/fall-os/">Open fall-os →</a>
 </div></div>
 <div class="step"><div class="n">3</div><div>
  <h2>Walk in</h2>
  <p>Everything below is a place you can go. You do not have to understand any of it up front —
  start at the Duel and the rest opens up.</p>
 </div></div>
</div>

${WINGS.map(w => `<h2>${esc(w.title)}</h2>
<p class="wingblurb">${esc(w.blurb)}</p>
<div class="rooms">${w.rooms.map(r => `
 <a class="room${r.first ? ' first' : ''}" href="${esc(r.u)}">
  <span class="n">${esc(r.n)}</span>
  <span class="s">${esc(r.s)}</span>
  ${r.first ? '<span class="tag">start here</span>' : ''}
 </a>`).join('')}</div>`).join('')}

<div class="note"><b>Every room above is open right now.</b> None of it is a mock-up or a plan — the
links go to the real thing, and it all runs in a browser without an account.</div>

<h2>And the tools?</h2>
<div class="later">
 <p style="margin:0 0 .5rem;color:var(--dim)">There are a few hundred tools in the estate — accounts,
 invoices, notes, a clinic system, a CRM. <b style="color:var(--ink)">They are gear you carry into the
 world, not part of the map.</b> They get sorted onto shelves and tidied up after the world itself is
 finished, so the front door stays simple.</p>
 <div class="nums">
  <span class="num"><b>${real.length}</b> tools described</span>
  <span class="num"><b>${roots.filter(r => r.live).length}</b> you can open today</span>
  <span class="num ok"><b>${counts.proven}</b> a machine could not break</span>
 </div>
</div>

<footer>
 <p>Generated from the real rooms and the estate index — never typed by hand.<br>
 <a href="https://sjgant80-hub.github.io/fallworld/">Fall World</a> ·
 <a href="https://sjgant80-hub.github.io/fallkard/">FallKard</a></p>
</footer>
</div></body></html>
`;

writeFileSync('C:/Users/sjgan/fallworld/blueprint.html', html);
console.log(`blueprint.html — ${WINGS.length} wings · ${roomCount} rooms · ${(html.length / 1024).toFixed(0)}KB`);
for (const w of WINGS) console.log(`   ${String(w.rooms.length).padStart(2)}  ${w.title}`);
