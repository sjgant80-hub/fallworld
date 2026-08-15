// build-world.mjs — THE LOOT TABLE, GENERATED. Never typed.
//
// one-kernel-rule: any surface stating estate facts must be GENERATED from the index. A hand-typed
// world drifts the day after it is written; this one is re-run and is true again.
//
// The estate mints companions systematically: <thing>-api, <thing>-mcp, <thing>-sdk. Those are not
// three items, they are ONE item that ships a full SET. Collapsing them is what turns 1,624 rows into
// a world a person can actually walk around.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tierOf, tally as tallyTier } from './tier.mjs';

// What GitHub's own runners recorded about each repo — gathered by scan-workflows.mjs, never edited
// by hand. Missing file means no evidence for anybody, and every build honestly reads as prototype.
const EVIDENCE = existsSync('tier-evidence.json')
  ? JSON.parse(readFileSync('tier-evidence.json', 'utf8'))
  : {};

const IDX = process.argv[2] || 'C:/Users/sjgan/.claude/projects/C--Users-sjgan--claude/memory/estate-index.json';
const idx = JSON.parse(readFileSync(IDX, 'utf8'));
const ORG = idx.org || 'sjgant80-hub';

// ⚑ THREE KINDS OF THING, NEVER BLENDED.
//
//   yours       — you built it.
//   foundations — Thomas's original builds. fall-os stands on these: `regulus` (konomified via
//                 witness_py, the estate's first Python gate) and `JEDI` (konomified in place) are
//                 the documented joins, and the industrial line — PLC, SCADA, HMI — is the same
//                 lineage. They are NOT clutter and they are NOT deleted. They are CREDITED.
//   outside     — wrappers you wrote around services nobody here owns.
//
// Kept apart rather than filtered away, because the honest failure here runs both directions: showing
// someone else's work as yours takes credit you have not earned, and hiding the work your own estate
// was built on erases the person who did it.
const foundation = new Set(idx.nodes.filter(r => r.fork).map(r => r.name));
const all = idx.nodes;

// ── COLLAPSE THE TRIOS ───────────────────────────────────────────────────────────────────────────
const byName = new Map(all.map(r => [r.name, r]));
const suffix = (n) => { const m = /^(.+)-(api|mcp|sdk)$/.exec(n); return m ? { base: m[1], part: m[2] } : null; };

const groups = new Map();   // base → { parts:{}, root }
for (const r of all) {
  const s = suffix(r.name);
  if (s && (byName.has(s.base) || all.some(o => { const t = suffix(o.name); return t && t.base === s.base && o.name !== r.name; }))) {
    if (!groups.has(s.base)) groups.set(s.base, { parts: {}, root: byName.get(s.base) || null });
    groups.get(s.base).parts[s.part] = r;
  }
}
// The SECOND systematic family: fall<vertical> + <vertical>onboard/paper/practice. Ten verticals,
// four repos each — same collapse, different suffixes.
for (const r of all) {
  for (const suf of ['onboard', 'paper', 'practice']) {
    if (!r.name.endsWith(suf)) continue;
    const base = r.name.slice(0, -suf.length);
    if (!byName.has(base)) continue;
    if (!groups.has(base)) groups.set(base, { parts: {}, root: byName.get(base) });
    groups.get(base).parts[suf] = r;
  }
}

const consumed = new Set();
for (const [base, g] of groups) { for (const p of Object.values(g.parts)) consumed.add(p.name); if (g.root) consumed.add(base); }

// ⚑ RECOVERED FROM MEMORY. These repos carry NO GitHub description, so every search — including the
// estate's own — is blind to them, and several are crown jewels. The text below is what the estate's
// MEMORY records, not what the repo says about itself, and it is flagged `recovered` on the item so
// the two can never be confused.
const RECOVERED = {
  'proof-of-play':  'The anti-lemons gate: no listing without a reproducible, un-forgeable pass.',
  'konomify':       'Eat a real repo and gate its real code IN PLACE — never a clean-room sibling.',
  'regulus':        'Health engine konomified via witness_py, the first Python gate. Locks the maths, not the physiology.',
  'the-room':       'Five-seat multi-agent room: estate → debate → witness → execute → confirm.',
  'si-didy-loop':   'The si-didy control loop organ — bounded iteration over the estate.',
  'sididy-govern':  'The governance organ: what si-didy may do, decided before it acts.',
  'sididy-mesh':    'The mesh organ: si-didy meeting other Didys.',
  'sididy-run':     'The run organ: si-didy executing bounded work.',
  'sididy-wisp':    'The wisp organ: si-didy collapsing a spec into something runnable.',
  'fallmortgage':   'Sovereign mortgage organ for the estate.',
  'fallmesh':       'Mesh transport for the estate.',
  'ring-assessor':  'Ring-discipline assessor — sibling of acg-assessor.',
  'konomesh':       'Konomi mesh — the konomi suite meeting the mesh.',
  'konomi-forge':   'Forge organ of the konomi suite.',
  'fallsignal':     'Signal bus for the estate, over BroadcastChannel("fall-signal").',
  'mesh-sings':     'The mesh made audible — sound as the mesh carrier.',
  'wishwood-keeper-data': 'Data organ for the wishwood keeper board.',
};

const items = [];
// Repos that are not part of any trio stand alone.
for (const r of all) if (!consumed.has(r.name)) items.push({ root: r, base: r.name, set: [] });
// ⚑ A COMPANION CANNOT ALSO BE A BASE. mint-all was once pointed at a companion, so `fallpx-sdk`
// grew its own -api/-mcp/-sdk and ended up heading a group while already being a part of fallpx's.
// It therefore surfaced as its own item — a piece of plumbing shown as a product. A group whose base
// is itself somebody else's part is folded into that parent instead.
const partNames = new Set();
for (const g of groups.values()) for (const p of Object.values(g.parts)) partNames.add(p.name);

// Each trio becomes one item. If no root repo exists, the trio ITSELF is the item.
for (const [base, g] of groups) {
  if (partNames.has(base)) continue;                 // it is plumbing under another build
  const parts = Object.keys(g.parts).sort();
  const root = g.root || g.parts.sdk || g.parts.api || g.parts.mcp;
  // ⚑ COLLAPSE, NOT HIDE. Thirty of the folded names are REAL hand-described tools — clinic practice
  // management, SRA-shaped onboarding — not minted plumbing. Folding them stops the double count
  // (they were showing both inside the vertical AND as their own item), but the names have to travel
  // on the parent or a search for "practice management" stops finding anything.
  const members = Object.values(g.parts).map(p => p.name).sort();
  // Their DESCRIPTIONS travel too, for search only. Names alone still lost "practice management",
  // which is how a person actually looks for fallclinicpractice.
  const memberText = Object.values(g.parts).map(p => p.name + " " + (p.desc || "")).join(" ");
  items.push({ root, base, set: parts, members, memberText, synthetic: !g.root });
}

// ── THE NINE SEATS. First hit wins, so specific patterns come first. ─────────────────────────────
const SEATS = [
  { id:'gateway', name:'Gateways',            blurb:'Doors to services outside the estate — the outside world, reachable.',
    re:/sovereign (api |mcp |sdk )?wrapper|real bindings|wrapper for target/i },
  { id:'trust',   name:'Proof & identity',    blurb:'Signing what was done, and proving it later.',
    re:/witness|proof-of-play|ed25519|attest|assessor|earned|konomi-(rubric|clean|judge|redteam|regress|export)|wallet|toll|mutation-gated/i },
  { id:'brain',   name:'The brain',           blurb:'Which model thinks, and where it runs.',
    re:/llm|slm|webllm|ollama|inference|femto|cube|lora|\brag\b|on-prem|cascade|\bmind\b|brain|conductor|didy|wisp|dream|memory|recall|off-?ramp|embed|prompt/i },
  { id:'money',   name:'Money & accounts',    blurb:'Invoices, books, what came in and what went out.',
    re:/ledger|invoice|account|vault|econom|agora|\bpay\b|kcc|royalt|\bmtd\b|\btax\b|payroll|expense|budget|bookkeep/i },
  { id:'legal',   name:'Legal & compliance',  blurb:'Letters, rights, and staying the right side of the rules.',
    re:/justice|legal|\blaw\b|divorce|redress|dsar|clause|compliance|gdpr|contract|court|tribunal/i },
  { id:'people',  name:'People & hiring',     blurb:'Who works with you, and proving they can do the job.',
    re:/hire|hiring|staff|guild|recruit|interview|\bcv\b|resume|clinic|health|acg\b/i },
  { id:'sales',   name:'Sales & pipeline',    blurb:'Finding work and keeping track of who wants what.',
    re:/\bcrm\b|sales|pipeline|\blead\b|reach|market|outreach|\bseo\b|campaign|copy|brand|showroom|pitch|prospect/i },
  { id:'admin',   name:'Office & admin',      blurb:'Notes, mail, minutes — the paperwork of a day.',
    re:/\bnote|mail|\bdoc|scribe|minute|calendar|sheet|report|\bform|print|asset|audio|image|photo|video|mage\b|\bfile/i },
  { id:'work',    name:'The work itself',     blurb:'The thing the business actually does for its customers.', re:/./ },
];
const seatOf = (hay) => (SEATS.find(s => s.re.test(hay)) || SEATS[8]).id;

// ── RARITY IS PROOF-STRENGTH, NOT SCARCITY ───────────────────────────────────────────────────────
// Every tier is computed from evidence in the index. None of it is a taste judgement, and the reason
// is carried on the item so a person can see WHY it is gold rather than being told that it is.
// ⚑ `gated` USED TO BE READ OFF THE REPOSITORY'S OWN DESCRIPTION — a regex for the words "witness",
// "gated", "CI green" in text the author wrote about himself. The gold tier then carried the sentence
// "a machine tried to break it and it held", which is a claim about a machine derived from a claim by
// a person. That is precisely the thing this ladder exists to refuse: rarity is proof-strength, and a
// description is not proof of anything.
//
// It now comes from `proven` — computed by tier.mjs from what GitHub's runners actually recorded, and
// passed in by the caller. A repository can say whatever it likes about itself and the badge will not
// move.
function rarity(desc, live, setCount, proven) {
  if (!desc.trim())  return { tier:'unknown', label:'Unidentified', why:'this exists and nothing anywhere says what it does' };
  if (!live)         return { tier:'normal',  label:'Normal',       why:'described, but there is nothing live to open' };
  const gated = proven === true;
  if (gated && setCount >= 3) return { tier:'set',    label:'Set',    why:'gated AND ships the full api/mcp/sdk set — it combos' };
  if (gated)                  return { tier:'unique', label:'Unique', why:'a machine tried to break it and it held' };
  if (setCount >= 3)          return { tier:'rare',   label:'Rare',   why:'live, and ships the full api/mcp/sdk set' };
  return { tier:'magic', label:'Magic', why:'live, described, and you can open it right now' };
}

const out = items.map(({ root, base, set, members, memberText, synthetic }) => {
  const own = (root.desc || '').trim();
  const proofTier = tierOf(EVIDENCE[root.name], { live: root.live === true });
  const recovered = !own && RECOVERED[base] ? RECOVERED[base] : null;
  const desc = own || recovered || '';
  const live = !!root.live;
  return {
    name: base, title: base.replace(/[-_]/g, ' '),
    desc, recovered: !!recovered, live, private: !!root.private, lang: root.lang || null,
    url: root.url || (live ? `https://sjgant80-hub.github.io/${root.name}/` : null),
    repo: `https://github.com/${ORG}/${root.name}`,
    set, members: members || [], find: ((members||[]).length ? (memberText||"") : ""), synthetic: !!synthetic,
    seat: seatOf(base + ' ' + desc),
    // Which of the three this is, and who to credit for it. `by` travels ON the item so no surface
    // can render one of these without the attribution attached.
    kind: foundation.has(root.name) ? 'foundation'
        : /sovereign (api |mcp |sdk )?wrapper|real bindings|wrapper for target/i.test(desc) ? 'external'
        : 'mine',
    by: foundation.has(root.name) ? 'Thomas' : 'Simon Gant',
    // ⚑ ONE COMPUTATION, READ TWICE. `proof` is the tier a runner earned; rarity now reads that same
    // value instead of pattern-matching the author's own description. Computed once here so the two
    // cannot drift into disagreeing about the same repository.
    ...rarity(desc, live, set.length, proofTier.tier === 'proven'),
    // ⚑ HOW FINISHED IS IT — nested under `proof` on purpose, because rarity() already spreads a
    // `tier` of its own, and two different meanings sharing one key is a bug waiting for a reader.
    // Rarity says how much evidence the build carries; proof says whether a machine checked the code.
    proof: proofTier,
    pushed: root.pushed || null,
  };
}).sort((a, b) => a.name.localeCompare(b.name));

// Counts are over YOUR builds only, so the headline is never inflated by other people's work or by
// wrappers around other people's services. The other two are tallied in their own right.
const of = (k) => out.filter(i => i.kind === k);
const mine = of('mine');
const tally = (list, k) => list.reduce((m, i) => (m[i[k]] = (m[i[k]] || 0) + 1, m), {});
const world = {
  generated: idx.generated, org: ORG, built: 'regenerate with: node build-world.mjs',
  counts: { indexed: all.length, items: mine.length, live: mine.filter(i => i.live).length,
            unidentified: mine.filter(i => i.tier === 'unknown').length,
            collapsed: all.length - out.length,
            external: of('external').length, foundation: of('foundation').length,
            // Move 4: how many of your builds a machine has actually checked. Every rung is reported
            // even at zero, so "none proven yet" can never be mistaken for "not measured".
            proof: tallyTier(mine.map(i => ({ tier: i.proof.tier }))) },
  credits: {
    mine:       { by: 'Simon Gant', label: 'Your builds',        n: mine.length },
    foundation: { by: 'Thomas',     label: 'Foundations',        n: of('foundation').length,
                  note: 'Thomas’s original builds. fall-os stands on these — the industrial line (PLC, SCADA, HMI), regulus and JEDI among them.' },
    external:   { by: 'Simon Gant', label: 'Outside services',   n: of('external').length,
                  note: 'Wrappers you wrote around services nobody here owns.' },
  },
  byTier: tally(mine, 'tier'), bySeat: tally(mine, 'seat'),
  byTierExternal: tally(of('external'), 'tier'),
  byTierFoundation: tally(of('foundation'), 'tier'),
  bySeatFoundation: tally(of('foundation'), 'seat'),
  seats: SEATS.map(({ re, ...s }) => s), items: out,
};
writeFileSync(new URL('./world.json', import.meta.url), JSON.stringify(world));
console.log(`indexed ${all.length} → ITEMS ${out.length} (collapsed ${world.counts.collapsed}) · live ${world.counts.live} · unidentified ${world.counts.unidentified}`);
console.log('rarity:', JSON.stringify(world.byTier));
console.log('seats :', JSON.stringify(world.bySeat));
