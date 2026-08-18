// check-workflows.mjs — catch the YAML mistake that reports itself as nothing.
//
// ⚑ A LINE PASTED INTO A `run: |` BLOCK AT THE WRONG INDENTATION ENDS THE BLOCK. GitHub then reports
// only "a workflow file issue" and lists the run by FILENAME instead of by name — no line, no
// column, no step. It cost two round trips to see it twice in one afternoon, and the whole time the
// repo looked like it had a working scheduled job that had in fact never parsed once.
import { readFileSync, readdirSync } from 'node:fs';

const DIR = '.github/workflows';
let bad = 0;

for (const f of readdirSync(DIR)) {
  if (!/\.ya?ml$/.test(f)) continue;
  const lines = readFileSync(`${DIR}/${f}`, 'utf8').split(/\r?\n/);
  let need = 0;
  lines.forEach((l, i) => {
    const opens = l.match(/^(\s*)[\w-]+:\s*[|>][-+]?\s*$/);
    if (opens) { need = opens[1].length + 1; return; }
    if (!need || !l.trim()) return;
    const ind = l.match(/^\s*/)[0].length;
    if (ind >= need) return;
    // Legally out of the block: a new key, a new list item, or a comment sitting between them.
    if (/^\s*(#|-\s|[\w-]+:)/.test(l)) { need = 0; return; }
    console.error(`${f}:${i + 1} — this line is indented ${ind} inside a block that needs ${need}, so the block ends here and the file stops meaning what it looks like:\n    ${l.trim().slice(0, 90)}`);
    bad += 1;
  });
}

if (bad) { console.error(`\n${bad} line(s) fall out of their own block.`); process.exit(1); }
console.log('workflow blocks ok — every run: | line stays inside its block');
