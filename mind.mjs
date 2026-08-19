// fallworld · mind.mjs — reading si-didy's studied mind, the kernel.
//
// si-didy studies nightly (the deepening loop: fan → gate → remember over the estate, the chats,
// the world's own map) and distills what it learned into a MIND file. That file is LOCAL-ONLY —
// it carries private names — so the world never fetches it: the player LOADS it, the way a card
// is dropped, and it lives in their browser and nowhere else.
//
// This kernel judges and reads; the page wires. Pure, total, no I/O:
//   validMind      — is this file actually a si-didy mind, said with a reason
//   associatesFor  — what the mind remembers about THIS question and THIS didy's fitted tools,
//                    every association carrying its provenance (the via-path and the study date)
//   wondersOf      — what the dreams are holding open, clearly marked unconfirmed

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const arr = (v) => Array.isArray(v) ? v : [];

/** Is this a mind? Refusals carry the reason — a wrong file should never half-load. */
export function validMind(m) {
  const f = obj(m);
  if (!f) return { ok: false, why: 'not a file this page can read' };
  if (f.kind !== 'sididy-mind') return { ok: false, why: 'not a si-didy mind — the kind field says ' + JSON.stringify(f.kind ?? null) };
  if (!obj(f.mind)) return { ok: false, why: 'a mind with no associations is a label, not a mind' };
  const n = Object.keys(f.mind).length;
  if (n === 0) return { ok: false, why: 'the mind is empty — study first, then export' };
  return { ok: true, why: `${n} studied node(s) · exported ${typeof f.exported === 'string' ? f.exported : '(undated)'}` };
}

/**
 * What the mind remembers about this moment: nodes whose ids appear in the question (ids shorter
 * than 5 characters match too easily and are skipped), plus the didy's fitted tool ids exactly.
 * Associations come back strongest-first, deduped by target, capped — each with its via-path so
 * the player can see WHERE si-didy learned it. No match is an honest empty list, never a guess.
 */
export function associatesFor(m, text, fittedIds, cap) {
  const f = obj(m);
  const mind = f && obj(f.mind);
  if (!mind) return [];
  const hay = typeof text === 'string' ? text.toLowerCase() : '';
  const fitted = new Set(arr(fittedIds).map(String));
  const roots = [];
  for (const id of Object.keys(mind)) {
    if (fitted.has(id) || (id.length >= 5 && hay.includes(id.toLowerCase()))) roots.push(id);
  }
  const seen = new Set(roots);
  const out = [];
  for (const root of roots) {
    for (const a of arr(mind[root])) {
      const o = obj(a);
      if (!o || typeof o.to !== 'string' || seen.has(o.to)) continue;
      seen.add(o.to);
      out.push({
        from: root,
        to: o.to,
        w: Number.isFinite(o.w) ? o.w : 0,
        via: typeof o.via === 'string' ? o.via : '',
        at: typeof o.at === 'string' ? o.at : '',
      });
    }
  }
  out.sort((a, b) => b.w - a.w || a.to.localeCompare(b.to));
  const k = Number.isFinite(cap) && cap >= 1 ? Math.floor(cap) : 6;
  return out.slice(0, k);
}

/** What the dreams hold open — unconfirmed by design, and said so wherever the page shows them. */
export function wondersOf(m, k) {
  const f = obj(m);
  const list = f ? arr(f.wonders) : [];
  const n = Number.isFinite(k) && k >= 1 ? Math.floor(k) : 3;
  return list
    .map(obj).filter(Boolean)
    .filter(w => typeof w.root === 'string' && typeof w.node === 'string')
    .slice(-n);
}

export default associatesFor;
