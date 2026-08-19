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

/** Wrap one module so its private helpers cannot collide with anybody else's. */
function scope(src, label) {
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
  return `// ── ${label} ──\nconst { ${list.join(', ')} } = (() => {\n${body}\nreturn { ${list.join(', ')} };\n})();\n`;
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
  ['client.mjs', 'the store'],
  ['providers.mjs', 'talking to a paid model'],
  ['runtime.mjs', 'the wall round an addon'],
  ['module.mjs', 'what an addon has to be'],
  ['guide.mjs', 'the one who shows you round'],
];

// ── the catalogue, from what the estate's CI actually ran ─────────────────────────────────────
const world = JSON.parse(read('world.json'));
const KNOWN = {
  witness: { reach: ['read', 'run'], price: 12 },
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
const catalogue = world.items.filter(i => i && !i.private).map(i => {
  const p = (i.proof && typeof i.proof === 'object') ? i.proof : {};
  const k = KNOWN[i.name] || {};
  return {
    id: i.name, name: i.title || i.name, does: i.desc || '', url: i.url || null,
    tier: p.tier || null,
    evidence: p.workflow ? `${p.workflow}${p.sha ? ' @ ' + String(p.sha).slice(0, 7) : ''}` : null,
    reach: k.reach || [], mind: k.mind || 0, price: k.price || 0,
    // ⚑ The estate already grades its own things the way a loot game does — normal, magic, rare,
    // set, unique — and that grading is in world.json, computed, not typed. Carrying it through is
    // what makes the shop read like a loot list instead of a spreadsheet.
    rarity: i.tier || 'normal', label: i.label || '',
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

const kernel = [
  ...MODULES.map(([f, label]) => scope(read(f), label)),
  '// ── the world, from rooms.mjs ──\n' + roomBlock,
  `// ── the catalogue, from world.json ──\nconst CATALOGUE = ${JSON.stringify(catalogue)};`,
].join('\n');

const out = read('client.html').replace('/*__KERNEL__*/', () => kernel);
if (out.includes('/*__KERNEL__*/')) throw new Error('the kernel never went in');
for (const must of ['function conduct(', 'function t0Organ(', 'function route(', 'function store(',
                    'function buildCall(', 'function judge(', 'function phrase(', 'function speak(', 'const WINGS']) {
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
  description: 'Install it like a game. Learn to use AI by using it — starting on a key you already have, ending on your own machine.',
  icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
}, null, 2));

writeFileSync(join(here, 'icon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0a0c10"/>'
  + '<circle cx="64" cy="64" r="34" fill="none" stroke="#dcb264" stroke-width="7"/>'
  + '<circle cx="64" cy="64" r="11" fill="#54d199"/></svg>');

// ⚑ Versioned by CONTENT, line-endings normalised. A byte count differs between a Windows checkout
// and a Linux runner, so the "is the published page stale" check could never pass.
const stamp = createHash('sha256').update(out).digest('hex').slice(0, 12);
const SHELL = ['.', 'index.html', 'manifest.webmanifest', 'icon.svg'];
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
