// build-client.mjs — write the client page from the gated kernel and the REAL index.
//
// ⚑ GENERATED, NEVER TYPED. The catalogue is built from world.json, which is built from what the
// estate's CI actually ran. Hand-writing a shop list is how a storefront ends up advertising a tier
// nothing earned — the exact lie this whole client exists to refuse.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');
const inline = (src) => src
  .replace(/^\s*import\s[^\n]*\n/gm, '')
  .replace(/^export\s+(const|function|class|let|async)\s/gm, '$1 ')
  .replace(/^export\s+default\s[^\n]*\n/gm, '')
  .replace(/^export\s*\{[^}]*\};?[^\n]*\n/gm, '');

const world = JSON.parse(read('world.json'));
const items = world.items.filter(i => i && !i.private);

// The rig ladder, shared with the Armoury so one character means one thing everywhere.
const RIG = `const RIG = [
  { level: 0, name: 'Renting',   holds: 0, blurb: 'no model of your own yet — every piece of thinking is rented' },
  { level: 1, name: 'Own Forge', holds: 1, blurb: 'a small model running locally: the grunt work comes home' },
  { level: 2, name: 'Sovereign', holds: 2, blurb: 'a large model of your own: nothing has to leave unless you send it' },
];`;

// What these actually touch, and what the trust rail costs. Declared only for the builds whose
// behaviour is genuinely known — everything else declares nothing, and the client shows "asks for
// nothing" rather than inventing a permission nobody checked. Guessing here would make the shadow
// a decoration, and the shadow is the one thing this store has that others do not.
const KNOWN = {
  'witness':          { reach: ['read', 'run'], price: 12 },
  'proof-of-play':    { reach: ['read', 'run', 'publish'], price: 9 },
  'acg-assessor':     { reach: ['read'], price: 9 },
  'kcc-mint':         { reach: ['read', 'publish'] },
  'fall-remember':    { reach: ['read', 'write'], mind: 1 },
  'sovereign-browser':{ reach: ['net', 'run'], mind: 1 },
  'agora':            { reach: ['spend', 'net'] },
  'the-toll':         { reach: ['net'] },
  'earned':           { reach: ['read', 'publish'] },
  'falljustice':      { reach: ['read'] },
  'divorcerbot':      { reach: ['read'], mind: 1 },
  'konomium-vault':   { reach: ['read', 'write'] },
  'fallkard-forge':   { reach: ['read', 'write'] },
  'didy-raid':        { reach: [] },
  'falllearn':        { reach: [] },
};

const catalogue = items.map(i => {
  const p = (i.proof && typeof i.proof === 'object') ? i.proof : {};
  return {
    id: i.name, name: i.title || i.name, does: i.desc || '', url: i.url || null,
    tier: p.tier || null,
    evidence: p.workflow ? `${p.workflow}${p.sha ? ' @ ' + String(p.sha).slice(0, 7) : ''}` : null,
    // Unstated is unstated. An addon nobody has read declares nothing rather than being guessed at.
    reach: (KNOWN[i.name] || {}).reach || [],
    mind: (KNOWN[i.name] || {}).mind || 0,
    price: (KNOWN[i.name] || {}).price || 0,
  };
});

const rooms = read('rooms.mjs');
const kernel = [
  inline(read('client.mjs')),
  RIG,
  inline(rooms).replace(/^const K = .*$/m, m => m).trim(),
  `const CATALOGUE = ${JSON.stringify(catalogue)};`,
].join('\n\n');

const out = read('client.html').replace('/*__KERNEL__*/', () => kernel);
if (out.includes('/*__KERNEL__*/')) throw new Error('the kernel never went in');
if (!out.includes('function store(')) throw new Error('store() is missing — the shop would list nothing');
const script = out.slice(out.indexOf('<script type="module">'), out.lastIndexOf('</script>'));
const stray = script.match(/^\s*(export|import)\s/m);
if (stray) throw new Error(`a module keyword survived: ${stray[0].trim()}`);
try { new (await import('node:vm')).Script(script.replace('<script type="module">', '')); }
catch (e) { throw new Error(`the client does not parse: ${e.message}`); }

writeFileSync(join(here, 'index.html'), out);

writeFileSync(join(here, 'manifest.webmanifest'), JSON.stringify({
  name: 'FALL WORLD', short_name: 'FALLWORLD', start_url: '.', scope: '.',
  display: 'standalone', background_color: '#0a0c10', theme_color: '#0a0c10',
  description: 'Install it like a game. Your character, your bags, and a shop where nothing gets listed on somebody saying it is good.',
  icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
}, null, 2));

writeFileSync(join(here, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0a0c10"/>` +
  `<circle cx="64" cy="64" r="34" fill="none" stroke="#dcb264" stroke-width="7"/>` +
  `<circle cx="64" cy="64" r="11" fill="#54d199"/></svg>`);

// One file list, one version. A cache that lists a file the page no longer loads serves a ghost.
const SHELL = ['.', 'index.html', 'manifest.webmanifest', 'icon.svg'];
writeFileSync(join(here, 'sw.js'), `// Generated by build-client.mjs — offline shell for the client.
// Versioned by content: a new build means a new cache, so an old page can never be served over a
// new one. Everything the client needs is inlined into index.html, so the shell is the whole app.
const V = 'fallworld-${Buffer.from(out).length}';
const SHELL = ${JSON.stringify(SHELL)};
self.addEventListener('install', (e) => { self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => { e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  // Never cache the realm: a stale fleet board is the exact lie this client refuses to tell.
  if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return;
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
`);

const listed = catalogue.filter(a => a.tier && a.evidence && a.does).length;
console.log(`client built — ${(out.length / 1024).toFixed(0)}kb · ${catalogue.length} public builds, ${listed} listable, ${catalogue.length - listed} refused for want of evidence`);
