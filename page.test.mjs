// page.test.mjs — the page explains itself, and keeps doing so. The gate already rebuilds index.html and fails
// if it differs; this fails if the rebuilt page has quietly lost a part of its explanation, its credits or the
// buyer's sourced figures. It reads the committed page, the way a visitor gets it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL('./' + f, import.meta.url), 'utf8').split('\r\n').join('\n');
const page = read('index.html');
const BASIS = JSON.parse(read('vendor/sovereign-enterprise/data/basis.json'));
const EXPLAIN = JSON.parse(/const EXPLAIN = (\{.*?\});\n/.exec(page)[1]);

test('page · every part of the explanation is there, and linkable', () => {
  for (const id of ['start', 'how', 'blueprint', 'team', 'buyers', 'paper']) {
    assert.match(page, new RegExp(`\\.id = 'x-${id}'`), `the ${id} section is gone`);
  }
  assert.match(page, /const EX_IDS = \['start', 'how', 'blueprint', 'team', 'buyers', 'paper'\];/);
  assert.match(page, /addEventListener\('hashchange', exHash\)/, 'a link to #buyers would land nowhere');
  assert.match(page, /role="img" aria-label=/, 'the diagram lost its text alternative');
});

test('page · the buyer’s figures are the sourced basis, byte for byte, and the case is the gated kernel', () => {
  assert.ok(EXPLAIN.basis && Object.keys(EXPLAIN.basis).length > 0);
  for (const [k, v] of Object.entries(EXPLAIN.basis)) assert.deepEqual(v, BASIS[k], k + ' is not what the basis says');
  assert.equal(EXPLAIN.basisAbout, BASIS.currency);
  assert.match(page, /\/\/ ── what the rent costs, and what owning it costs ──\nconst \{ [^}]*costCase[^}]* \} = \(\(\) => \{/);
  assert.ok(page.includes(read('costcase.mjs').split('\n').find((l) => l.includes('const openApi = '))), 'the page runs a different cost case');
});

test('page · the blueprint is read off the gate, part for part', () => {
  const gate = read('.github/workflows/gate.yml');
  const gated = [.../const KERNELS = \[([^\]]*)\]/.exec(gate)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(EXPLAIN.parts.map((p) => p.file), gated);
  for (const p of EXPLAIN.parts) assert.ok(p.what && p.test && (p.cases || p.checks), p.file + ' has no line or no tests on the page');
});

test('page · the supplier, the licence and the credits, as the rules set them', () => {
  assert.ok(page.includes('href="https://www.ai-nativesolutions.com"'));
  assert.ok(page.includes('Powered by the Konomi architecture, created by Thomas Frumkin.'));
  assert.ok(page.includes('Gary W. Floyd, Lumiea Systems Research Division — ThunderStruck Service LLC — “Dream State Architecture: GEP-Guided Memory Consolidation and Entropy Regulation in Artificial Consciousness Systems,” 2025.'));
  assert.match(page, /MIT, with no licence fee/);
  assert.match(page, /agreed per deployment/);
});

test('page · nothing promised for later', () => {
  for (const w of [/coming soon/i, /not in yet/i, /not built yet/i, /\bTODO\b/]) assert.doesNotMatch(page, w, String(w));
});
