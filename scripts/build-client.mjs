// build-client.mjs — write the game page from the REAL kernels and the REAL index.
//
// ⚑ GENERATED, NEVER TYPED, AND NEVER RE-IMPLEMENTED. The engine is fall-os, vendored into
// vendor/fall-os and checked against upstream by CI. fallworld's job is to make that engine easy to
// use, learn and build on — not to grow a second one beside it. Everything below either comes from
// fall-os, from world.json (which comes from what the estate's CI actually ran), or from rooms.mjs.
//
// ⚑ EACH MODULE GETS ITS OWN SCOPE. Concatenating modules that each declare `const text = …` is a
// redeclaration error that takes the whole page down at parse time — one dead token and the app is
// a screenshot. So every module is wrapped in an IIFE returning its exports, and only the exported
// names reach the top level.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// One level down from the repo now: build tooling is not part of the gated product surface.
const here = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(here, f), 'utf8').split('\r\n').join('\n');

/** Wrap one module so its private helpers cannot collide with anybody else's. `renames`
 *  aliases an export at the PAGE surface only (e.g. two kernels both exporting DOORS) —
 *  the vendored kernel file stays verbatim, so its gate never notices. */
function scope(src, label, renames = {}) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const as = part.split(/\s+as\s+/).pop().trim();
      if (as) names.add(as);
    }
  }
  const body = src
    .replace(/^\s*import\s[^\n]*\n/gm, '')
    .replace(/^export\s+default\s[^\n]*\n/gm, '')
    .replace(/^export\s*\{[^}]*\};?[^\n]*\n/gm, '')
    .replace(/^export\s+(async\s+)?(function|const|let|class)\s/gm, '$1$2 ');
  const list = [...names];
  if (!list.length) throw new Error(`${label} exports nothing — it would vanish from the page`);
  const outer = list.map((n) => renames[n] ? `${n}: ${renames[n]}` : n);
  return `// ── ${label} ──\nconst { ${outer.join(', ')} } = (() => {\n${body}\nreturn { ${list.join(', ')} };\n})();\n`;
}

// Dependency order: the primitives first, then what stands on them.
const MODULES = [
  ['safe.mjs', 'reading things that might not be there'],
  ['vendor/fall-os/core.mjs', 'fall-os · core'],
  ['vendor/fall-os/shadow.mjs', 'fall-os · shadow'],
  ['vendor/fall-os/didy.mjs', 'fall-os · didy'],
  ['vendor/fall-os/walk.mjs', 'fall-os · walk'],
  ['vendor/fall-os/organs/t0.mjs', 'fall-os · t0'],
  ['vendor/fall-os/organs/t1.mjs', 'fall-os · t1'],
  ['ladder.mjs', 'the rungs'],
  ['journey.mjs', 'the levelling spine'],
  ['mind.mjs', 'the studied mind'],
  ['doors.mjs', 'the human doors — the 10% as law'],
  ['render.mjs', 'the seam — intent in, capability out', { DOORS: 'SEAM_DOORS', KAPPA: 'SEAM_KAPPA', collapse: 'seamCollapse' }],
  ['client.mjs', 'the store'],
  ['providers.mjs', 'talking to a paid model'],
  ['runtime.mjs', 'the wall round an addon'],
  ['module.mjs', 'what an addon has to be'],
  ['guide.mjs', 'the one who shows you round'],
  ['trial.mjs', 'the trial of rules'],
  ['grow.mjs', 'how a didy grows'],
  ['deck.mjs', 'the cards'],
];

// ── the catalogue, from what the estate's CI actually ran ─────────────────────────────────────
const world = JSON.parse(read('world.json'));
const KNOWN = {
  witness: { reach: ['read', 'run'] },
  'proof-of-play': { reach: ['read', 'run', 'publish'] },
  'acg-assessor': { reach: ['read'] },
  'kcc-mint': { reach: ['read', 'publish'] },
  'fall-remember': { reach: ['read', 'write'], mind: 1 },
  'sovereign-browser': { reach: ['net', 'run'], mind: 1 },
  agora: { reach: ['spend', 'net'] },
  'the-toll': { reach: ['net'] },
  earned: { reach: ['read', 'publish'] },
  falljustice: { reach: ['read'] },
  divorcerbot: { reach: ['read'], mind: 1 },
  'konomium-vault': { reach: ['read', 'write'] },
  'fallkard-forge': { reach: ['read', 'write'] },
  'didy-raid': { reach: [] },
  falllearn: { reach: [] },
  'fall-os': { reach: [], mind: 1 },
};
// ⚑ PRODUCT-SURFACE RULE. The hub must not quote what the estate CHARGES for its own builds, nor state
// an unverifiable superlative as fact — that stays true however world.json is regenerated, so the scrub
// lives here, at the one place a description reaches the page, not in the (regenerated) data. Value
// framing (free / sovereign / own it / 0% fee) and tools that COMPUTE a comparison for the reader are
// kept untouched; only a quoted figure and the "obsoletes X" claim are neutralised.
function scrubSurface(text) {
  if (!text) return text;
  let s = text;
  // 1) "obsoletes X" — a superlative about a competitor stated as fact → a neutral comparison.
  s = s.replace(/\bobsoletes\b/gi, 'a sovereign alternative to');
  // 2) "for £0 / $0 / €0" — free framing → plain words, never a price label.
  s = s.replace(/\bfor\s*[£$€]0\b/gi, 'for free');
  // 3) a competitor figure quoted inside a sentence → drop the figure, keep the comparison
  //    ("a £20k consultant" → "a consultant", "the £1M deck" → "the deck").
  s = s.replace(/[£$€]\d[\d.,]*\s*[kKmMbB]?\s+(?=[A-Za-z])/g, '');
  // 4) drop any mid-dot segment that is still an estate price — a per-unit / per-period fee or a tier
  //    range. Anything surviving rules 2–3 while still carrying a currency figure is a pure price.
  s = s.split(/\s*·\s*/).filter(seg => !/[£$€]\s?\d/.test(seg)).join(' · ');
  // 5) tidy any doubled or dangling mid-dots the edits may have left.
  s = s.replace(/(?:\s*·\s*){2,}/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
  return s;
}

const catalogue = world.items.filter(i => i && !i.private).map(i => {
  const p = (i.proof && typeof i.proof === 'object') ? i.proof : {};
  const k = KNOWN[i.name] || {};
  return {
    id: i.name, name: i.title || i.name, does: scrubSurface(i.desc || ''), url: i.url || null,
    tier: p.tier || null,
    evidence: p.workflow ? `${p.workflow}${p.sha ? ' @ ' + String(p.sha).slice(0, 7) : ''}` : null,
    reach: k.reach || [], mind: k.mind || 0, price: k.price || 0,
    // ⚑ The estate already grades its own things the way a loot game does — normal, magic, rare,
    // set, unique — and that grading is in world.json, computed, not typed. Carrying it through is
    // what makes the shop read like a loot list instead of a spreadsheet.
    rarity: i.tier || 'normal', label: i.label || '',
    // what a CARD shows beyond the shop: why it is the colour it is, where it sits, and who made it
    why: i.why || '', seat: i.seat || 'work', kind: i.kind || 'mine', by: i.by || '', live: i.live === true,
  };
});

// ⚑ rooms.json is the ONE source for where the fall products live — read, never restated. It is
// JSON rather than a module because it is data, and a mutation gate handed a file of pure data
// correctly reports that there was nothing in it to break, so it was never really tested. Data goes
// in data files, checked by integrity tests; only things with behaviour sit in the gated surface.
const world_ = JSON.parse(read('rooms.json'));
const roomBlock = `const WINGS = ${JSON.stringify(world_.wings)};\n`
  + `const WAY_IN = ${JSON.stringify(world_.wayIn)};\n`
  + `const ROOM_COUNT = ${world_.roomCount};`;

// ── THE LIVING WORLD: the cards, the growth, the creatures, and what the NFT wave got right ──────
// Every one of these is read from a file that is itself generated or sealed: the sizer's ladder and
// the creatures' record are vendored from their repos at pinned commits (scripts/sync-sources.mjs,
// checked in CI), the trial is sealed before any model is asked (scripts/grow-trial.mjs), and the
// page re-grades the trial's recorded replies itself with the inlined trial.mjs. Nothing here is typed.
const jsonIf = (f) => { try { return JSON.parse(read(f)); } catch { return null; } };
const vLadder = JSON.parse(read('vendor/fallforgemint/ladder.json'));
const vCreatures = JSON.parse(read('vendor/kard-evolve/creatures.json'));
const vOrgans = JSON.parse(read('vendor/pattern-organs/organs.json'));
const vTongue = JSON.parse(read('vendor/konomi-tongue/tongue.json'));
const vSentinel = JSON.parse(read('vendor/sentinel/sentinel.json'));
const nft = JSON.parse(read('nft.json'));
const gPre = jsonIf('data/grow-prereg.json'), gRun = jsonIf('data/grow-run.json');
const kit = read('vendor/fall-kit/fall-kit.js');
const hatch = /'llama-1b':\s*\{\s*id:\s*'([^']+)',\s*size:\s*'([^']+)',\s*label:\s*'([^']+)'/.exec(kit);
const lib = /import\('(https:\/\/esm\.run\/@mlc-ai\/web-llm@[^']+)'\)/.exec(kit);
if (!hatch || !lib) throw new Error('the hatchling is not where fall-kit keeps it — the in-tab hatch would point at nothing');
const mean = (xs) => xs.reduce((a, x) => a + x, 0) / xs.length;
const GROW = {
  ladder: vLadder.ladder, taskTier: vLadder.taskTier,
  source: { sha: vLadder.source.sha.slice(0, 7), version: vLadder.version, note: vLadder.note },
  overhead: 0.2,
  webllm: { id: hatch[1], size: hatch[2], label: hatch[3], lib: lib[1] },
  prereg: gPre && {
    seed: gPre.trial.seed, cards: gPre.trial.cards, bar: gPre.bar, stages: gPre.stages, rules: gPre.rules,
    predictions: gPre.predictions, sizer: gPre.sizer, notMeasured: gPre.notMeasured, generated: gPre.trial.from.generated,
  },
  run: gRun && {
    sealedIn: gRun.sealedIn.slice(0, 7), memoryGB: Math.round(gRun.machine.memoryBytes / 1e8) / 10, cpu: gRun.machine.cpu,
    models: gRun.models, replies: Object.fromEntries(Object.entries(gRun.runs).map(([k, rs]) => [k, rs.map((r) => r.reply)])),
    speed: Object.fromEntries(Object.entries(gRun.runs).map(([k, rs]) => [k, {
      secPerAnswer: Math.round(mean(rs.map((r) => r.totalMs)) / 100) / 10,
    }])),
  },
};
const CREATURES_ = {
  champion: vCreatures.champion, gen0: vCreatures.gen0, line: vCreatures.line, generations: vCreatures.generations,
  judged: vCreatures.judged, observer: { passed: vCreatures.observer.passed, of: vCreatures.observer.of, medians: vCreatures.observer.medians },
  source: { sha: vCreatures.source.sha.slice(0, 7), sealedIn: vCreatures.source.run.sealedIn.slice(0, 7) },
};
const ORGANS_ = {
  passed: vOrgans.passed, of: vOrgans.of, medians: vOrgans.medians, wins: vOrgans.wins, sure: vOrgans.sure, reference: vOrgans.reference,
  seeds: vOrgans.seeds, medianSeed: vOrgans.medianSeed, source: { sha: vOrgans.source.sha.slice(0, 7), sealedIn: vOrgans.source.sealedIn.slice(0, 7) },
};
const livingBlock = `const GROW = ${JSON.stringify(GROW)};\nconst CREATURES = ${JSON.stringify(CREATURES_)};\nconst ORGANS = ${JSON.stringify(ORGANS_)};\nconst TONGUE = ${JSON.stringify({ passed: vTongue.passed, of: vTongue.of, text: vTongue.text, textGlyphs: vTongue.textGlyphs, json: vTongue.json, combined: vTongue.combined, bestPicture: vTongue.bestPicture, bestText: vTongue.bestText, source: { sha: vTongue.source.sha.slice(0, 7), sealedIn: vTongue.source.sealedIn.slice(0, 7) } })};\nconst SENTINEL = ${JSON.stringify({ passed: vSentinel.passed, of: vSentinel.of, hard: vSentinel.hard, grown: vSentinel.grown, source: { sha: vSentinel.source.sha.slice(0, 7), sealedIn: vSentinel.source.sealedIn.slice(0, 7) } })};\nconst NFT = ${JSON.stringify(nft.rows)};`;

const kernel = [
  ...MODULES.map(([f, label, renames]) => scope(read(f), label, renames)),
  '// ── the world, from rooms.mjs ──\n' + roomBlock,
  '// ── the living world: ladder, creatures, trial, the NFT map ──\n' + livingBlock,
  `// ── the catalogue, from world.json ──\nconst CATALOGUE = ${JSON.stringify(catalogue)};`,
].join('\n');

// ── what answer engines read: schema.org, with every number computed by the same kernels ─────────
const { cardOf, rarityTable } = await import('../deck.mjs');
const { stagesFrom } = await import('../grow.mjs');
const { scoreStage, judgeTrial } = await import('../trial.mjs');
const deckN = catalogue.map(cardOf).filter(Boolean);
const rt = rarityTable(deckN);
const stagesN = stagesFrom(vLadder.ladder);
const trialN = gPre && gRun ? (() => {
  const sc = gPre.stages.map((s) => ({ id: s.id, paramsB: s.paramsB, right: scoreStage(gPre.trial.cards, gRun.runs[s.id].map((r) => r.reply)).right, n: gPre.trial.cards.length }));
  return { sc, j: judgeTrial(sc, gPre.bar.right) };
})() : null;
const nameOf = (id) => stagesN.find((s) => s.id === id).name;
const faq = [
  ['What is Fall World?', 'The whole estate as one game you install. You hatch a didy, your character, in your browser; it grows one measured stage at a time on your own machine; and every public build in the estate is a card you can collect, whose rarity is earned from what actually ran.'],
  ['Where are the cards?', `In the Deck: ${deckN.length} cards, one per public build — ` + [...rt].reverse().map((r) => r.count + ' ' + r.label).join(', ') + '. A card\'s rarity is computed from what GitHub\'s own runners did to that build, never assigned, and its art is grown from that evidence.'],
  ['How does a didy grow?', `From an egg that needs no model, through ${stagesN.length - 1} stages from ${stagesN[1].band} to ${stagesN[stagesN.length - 1].band}. It grows only when a measured bar says the job needs it, and shrinks when a smaller stage will do.`
    + (trialN && trialN.j.ok ? ` In the sealed trial of rules, ${trialN.sc.map((s) => nameOf(s.id) + ' ' + s.right + '/' + s.n).join(', ')}; ${trialN.j.chosen ? 'the smallest stage to clear the bar of ' + gPre.bar.right + ' was the ' + nameOf(trialN.j.chosen) : 'no measured stage cleared the bar of ' + gPre.bar.right}.` : '')],
  ['How is a card here different from an NFT?', 'An NFT usually held a link to a picture, and its rarity came from its creator\'s script. A card here carries the build itself inside the picture, its rarity is computed from evidence anyone can re-run, its creatures breed into ones that measurably work better, and in battle a bigger model does not win.'],
];
const ld = [
  { '@context': 'https://schema.org', '@type': ['VideoGame', 'SoftwareApplication'], name: 'Fall World', url: 'https://sjgant80-hub.github.io/fallworld/',
    applicationCategory: 'GameApplication', operatingSystem: 'Any (runs in the browser, installs as an app)',
    description: 'Hatch a didy in your browser, grow it on your own machine one measured stage at a time, and collect the whole estate as cards whose rarity is earned from what actually ran.',
    author: { '@type': 'Person', name: 'Simon Gant' }, license: 'https://opensource.org/licenses/MIT', codeRepository: 'https://github.com/sjgant80-hub/fallworld' },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
];
const LD_OPEN = '<!-- ⟦LD-BEGIN⟧ generated by scripts/build-client.mjs -->', LD_CLOSE = '<!-- ⟦LD-END⟧ -->';
const ldBlock = ld.map((x) => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('\n');
const page = read('client.html');
if (!page.includes(LD_OPEN) || !page.includes(LD_CLOSE)) throw new Error('the schema markers are missing from client.html');
const withLd = page.slice(0, page.indexOf(LD_OPEN) + LD_OPEN.length) + '\n' + ldBlock + '\n' + page.slice(page.indexOf(LD_CLOSE));

const out = withLd.replace('/*__KERNEL__*/', () => kernel);
if (out.includes('/*__KERNEL__*/')) throw new Error('the kernel never went in');
for (const must of ['function conduct(', 'function t0Organ(', 'function route(', 'function store(',
                    'function buildCall(', 'function judge(', 'function phrase(', 'function speak(', 'const WINGS',
                    'function nextDecision(', 'function collapse(', 'function cardOf(', 'function stagesFrom(', 'function judgeTrial(', 'function kcard(', 'function hatchInTab(']) {
  if (!out.includes(must)) throw new Error(`${must.trim()} is missing — the page would be a drawing of the product`);
}
const script = out.slice(out.indexOf('<script type="module">'), out.lastIndexOf('</script>'));
const stray = script.match(/^\s*(export|import)\s/m);
if (stray) throw new Error(`a module keyword survived: ${stray[0].trim()}`);
try { new (await import('node:vm')).Script(script.replace('<script type="module">', '')); }
catch (e) { throw new Error(`the client does not parse: ${e.message}`); }

writeFileSync(join(here, 'index.html'), out);

writeFileSync(join(here, 'manifest.webmanifest'), JSON.stringify({
  name: 'FALL WORLD', short_name: 'FALLWORLD', start_url: '.', scope: '.',
  display: 'standalone', background_color: '#0a0c10', theme_color: '#0a0c10',
  description: 'Install it like a game. Hatch a didy in your browser, grow it on your own machine one measured stage at a time, and collect the whole estate as cards.',
  icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
}, null, 2));

writeFileSync(join(here, 'icon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0a0c10"/>'
  + '<circle cx="64" cy="64" r="34" fill="none" stroke="#dcb264" stroke-width="7"/>'
  + '<circle cx="64" cy="64" r="11" fill="#54d199"/></svg>');

// ⚑ Versioned by CONTENT, line-endings normalised. A byte count differs between a Windows checkout
// and a Linux runner, so the "is the published page stale" check could never pass.
const stamp = createHash('sha256').update(out).digest('hex').slice(0, 12);
const SHELL = ['.', 'index.html', 'ecosystem.html', 'manifest.webmanifest', 'icon.svg'];
writeFileSync(join(here, 'sw.js'), `// Generated by build-client.mjs — the offline shell.
const V = 'fallworld-${stamp}';
const SHELL = ${JSON.stringify(SHELL)};
self.addEventListener('install', (e) => { self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => { e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  // Never cache a model provider or the local realm: a stale answer is worse than no answer.
  if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return;
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
`);

const listed = catalogue.filter(a => a.tier && a.evidence && a.does).length;
console.log(`client built — ${(out.length / 1024).toFixed(0)}kb · engine: ${MODULES.length} kernels`);
console.log(`  ${catalogue.length} public builds · ${listed} listable · ${catalogue.length - listed} refused for want of evidence`);
