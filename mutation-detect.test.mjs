import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMutationGate, stripComments } from './mutation-detect.mjs';

// the EXACT real phrasing pulled live from fallforgemint's actual gate.yml — the fixture that
// proves this genuinely fixes the reported bug, not a synthetic stand-in.
const FALLFORGEMINT_REAL = `
      - name: the mutation gate is CLEAN (kernel.mjs is not test-theatre)
        run: |
          node tools/witness.mjs mutate kernel.mjs --timeout 30000 --cap 500 --test node --test kernel.test.mjs | tee gate.out || true
          node -e "const b=require('fs').readFileSync('gate.out','utf8');const j=JSON.parse(b.slice(b.indexOf('{'),b.lastIndexOf('}')+1));if(j.clean!==true){console.error('GATE NOT CLEAN');process.exit(1)}console.log('CLEAN '+j.killed+'/'+j.total)"
`;

// the OLD phrasing this estate's older gates use — must still be recognised, not just the new one.
const FALLBRAIN_OLD_STYLE = `
      - name: witness — try to break the tier law (must be CLEAN)
        run: |
          node /tmp/witness/witness.mjs mutate brain.mjs --timeout 60000 --cap 800 --test node --test brain.test.mjs
`;

test('isMutationGate recognises fallforgemint\'s REAL phrasing (the exact bug this fixes)', () => {
  assert.equal(isMutationGate(FALLFORGEMINT_REAL), true);
});

test('isMutationGate still recognises the OLDER clean:/exit-1 style gates — the fix is additive, not a swap', () => {
  assert.equal(isMutationGate(FALLBRAIN_OLD_STYLE), true);
});

test('isMutationGate recognises a witness Action reference (uses: ...witness...)', () => {
  assert.equal(isMutationGate('      - uses: sjgant80-hub/witness-action@v1\n'), true);
});

test('isMutationGate recognises stryker/pitest/mutmut invocations too', () => {
  assert.equal(isMutationGate('run: stryker run'), true);
  assert.equal(isMutationGate('run: pitest'), true);
  assert.equal(isMutationGate('run: mutmut run'), true);
});

test('isMutationGate is FALSE for a workflow that never invokes a mutation tool at all', () => {
  assert.equal(isMutationGate('      - run: node --test *.test.mjs\n'), false);
  assert.equal(isMutationGate('      - run: npm run build\n'), false);
});

// ---- the false-positive guard: a MENTION must never count as an invocation ----

test('isMutationGate is FALSE when the only mention is inside a full-line comment', () => {
  assert.equal(isMutationGate('      # remember to run witness.mjs mutate kernel.mjs before shipping\n      - run: echo hi\n'), false);
});

test('isMutationGate is FALSE for a comment-only file even with the real phrase present, but TRUE once a real line is added', () => {
  const commentOnly = '# node witness.mjs mutate kernel.mjs\n# stryker run\n';
  assert.equal(isMutationGate(commentOnly), false);
  const withRealLine = commentOnly + 'run: node witness.mjs mutate kernel.mjs\n';
  assert.equal(isMutationGate(withRealLine), true);
});

test('isMutationGate handles indented comment lines (YAML often indents them), not just column-0', () => {
  assert.equal(isMutationGate('        # witness.mjs mutate kernel.mjs — do this before every release\n'), false);
});

// ---- boundary/hostile input ----

test('isMutationGate is total: non-string input returns false, never throws', () => {
  assert.equal(isMutationGate(null), false);
  assert.equal(isMutationGate(undefined), false);
  assert.equal(isMutationGate(42), false);
  assert.equal(isMutationGate({}), false);
  assert.equal(isMutationGate([]), false);
  assert.equal(isMutationGate(''), false);
});

// ---- stripComments (exported, checked directly) ----

test('stripComments removes only full-line comments, keeps real code lines intact', () => {
  const input = '# a comment\nrun: node x.mjs\n  # an indented comment\nrun: node y.mjs\n';
  const out = stripComments(input);
  assert.doesNotMatch(out, /# a comment/);
  assert.doesNotMatch(out, /# an indented comment/);
  assert.match(out, /run: node x\.mjs/);
  assert.match(out, /run: node y\.mjs/);
});

test('stripComments is total on non-string input', () => {
  assert.equal(stripComments(null), '');
  assert.equal(stripComments(42), '');
});
