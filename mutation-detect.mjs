// mutation-detect.mjs — does this workflow file genuinely INVOKE a mutation gate?
//
// THE BUG THIS FIXES (found live: fallforgemint/fallforgecell/agent-proof/post-proof all
// genuinely run `witness.mjs mutate` and still scored WORKS, not PROVEN). scan-tiers.mjs used to
// require TWO things: an invocation AND a verdict-check phrased a specific way (`clean:`/`exit 1`).
// The verdict-check varies repo to repo — some gates read `j.clean!==true` then
// `process.exit(1)` (no space before the 1) — and a regex tied to ONE phrasing silently
// misclassified every gate that used another. That is not a robust signal; it is a coincidence of
// how one author happened to write the check.
//
// THE FIX: the real, robust signal is simpler — did the workflow actually INVOKE a mutation tool
// at all. That invocation IS the mutation gate; how the exit code gets read afterward is an
// implementation detail with no fixed vocabulary. Comment lines are stripped first, so a MENTION
// ("# remember to run witness mutate before shipping") can never count as running one — the
// false-positive guard the verdict-check used to (incidentally) provide, done properly instead.
//
// Pure and total: garbage in -> false, never a throw.

const INVOKE = /witness(\.mjs)?\s+mutate\b|uses:\s*\S*witness|stryker\s+run|pitest|mutmut\s+run/i;
const COMMENT_LINE = /^\s*#/;

/** stripComments(text) — removes every full-line comment (YAML/shell '#' lines) so a mention of
 *  the gate inside a comment can never be read as running it. Exported so the guard is itself
 *  checkable, not just an internal implementation step. */
export function stripComments(text) {
  if (typeof text !== 'string') return '';
  return text.split('\n').filter((line) => !COMMENT_LINE.test(line)).join('\n');
}

/** isMutationGate(text) — text: a workflow file's raw source. True only if a real mutation-tool
 *  invocation appears OUTSIDE a comment line. Never inspects how the verdict gets read afterward —
 *  that phrasing is not this function's business, and requiring one specific phrasing is exactly
 *  the bug this file exists to remove. */
export function isMutationGate(text) {
  if (typeof text !== 'string') return false;
  return INVOKE.test(stripComments(text));
}
