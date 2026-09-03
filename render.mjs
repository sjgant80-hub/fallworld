// end-of-software · render.mjs — THE SEAM LAW.
//
// Software was a workaround: frozen intent, pre-decided by someone else, rented back as a
// cage. This law is the alternative, runnable: the estate is not products, it is the SHADOW —
// a possibility-space of crystallized folds — and the seam COLLAPSES capability to the lit ON
// INTENT, lets it be used, then FOLDS IT BACK with the learning retained. Five laws:
//
//   · INTENT   — a natural ask becomes checkable tokens, and the FOUR DOORS are detected
//                before anything renders: money, legal, irreversible, external. What lands on
//                a door is never auto-collapsed — the human key turns first.
//   · COLLAPSE — the resolution, in κ arithmetic: REUSE when one crystallized fold already
//                covers the intent (check-the-estate-first as law, not discipline);
//                RECOMBINE when two folds together cover what neither does alone;
//                GENERATE only when the shadow holds no answer — and then the brief names
//                exactly the gap and the nearest folds to imitate.
//   · PERSIST  — fold-back is the DEFAULT. Persistence is a CHOICE, and a choice needs an
//                argument: freezing a render without a reason a reviewer could dispute is
//                refused. (The exemption law, applied to existence itself.)
//   · FOLD-BACK— the render dissolves; what remains is a learning record keyed by the
//                intent's tokens. The lit surface stays cheap; the shadow gets richer.
//   · RECALL   — the same intent asked again is answered from the ledger first: the shadow
//                remembers its own renders. Learning retained is not a slogan, it is a lookup.
//
// Pure and total: garbage in → { ok:false, why }, never a throw mid-collapse.

export const KAPPA = 0.618;
export const DOORS = {
  money: ['pay', 'payment', 'charge', 'invoice', 'buy', 'sell', 'refund', 'price', 'subscribe', 'billing', 'transfer', 'wallet'],
  legal: ['contract', 'lawsuit', 'sue', 'gdpr', 'compliance', 'liability', 'terms', 'court', 'legal'],
  irreversible: ['delete', 'destroy', 'wipe', 'erase', 'drop', 'purge', 'revoke'],
  external: ['post', 'publish', 'tweet', 'email', 'broadcast', 'announce', 'dm'],
  // the fifth door is sididy's, from the seam brainstorm: capability that touches credentials
  // or personal data must never auto-render — a leak cannot be folded back.
  private: ['password', 'passwords', 'credential', 'credentials', 'token', 'secret', 'secrets', 'ssn', 'passport', 'personal'],
};

const S = (v) => (typeof v === 'string' ? v : '');
const round3 = (x) => Math.round(x * 1000) / 1000;
const tokens = (s) => (String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
const STOP = new Set(['the', 'and', 'was', 'were', 'are', 'has', 'had', 'have', 'this', 'that', 'with', 'for', 'its', 'does', 'did', 'will', 'you', 'your', 'can', 'need', 'want', 'make', 'build', 'tool', 'app', 'something', 'them', 'they', 'from', 'which', 'what', 'into', 'onto']);
const meat = (s) => [...new Set(tokens(s).filter((w) => !STOP.has(w)))];

/** INTENT — checkable tokens + the doors it touches. An intent with no meat is refused. */
export function intentOf(text) {
  if (!S(text)) return { ok: false, why: 'no intent — the seam collapses nothing from silence' };
  const t = meat(text);
  if (t.length === 0) return { ok: false, why: 'the intent carries no checkable words — say what the capability must DO' };
  const doors = Object.keys(DOORS).filter((d) => t.some((w) => DOORS[d].includes(w)));
  return { ok: true, tokens: t, key: [...t].sort().join(' '), doors };
}

/**
 * COLLAPSE — resolve an intent against the shadow. shadow = [{ name, desc, url }].
 * Modes, in decision order:
 *   door      — any door touched: the seam refuses to auto-render; the human key turns first.
 *   reuse     — one fold covers the intent at κ: the estate already holds this.
 *   recombine — the best two folds each hold ≥ κ/2 and TOGETHER cover ≥ κ of the intent.
 *   generate  — the shadow has no answer; the brief names the uncovered tokens and the
 *               nearest folds worth imitating. Generation is the LAST resort, by law.
 */
export function collapse(text, shadow) {
  const it = intentOf(text);
  if (!it.ok) return it;
  if (!Array.isArray(shadow) || shadow.length === 0) return { ok: false, why: 'an empty shadow renders nothing — bring the estate index' };
  for (const f of shadow) {
    if (!f || !S(f.name) || typeof f.desc !== 'string') return { ok: false, why: 'a shadow fold is { name, desc, url? }' };
  }
  if (it.doors.length > 0) {
    return { ok: true, mode: 'door', doors: it.doors,
      why: 'the intent touches ' + it.doors.join(' + ') + ' — ' + (it.doors.length > 1 ? 'these are human doors' : 'a human door') + '; the seam does not auto-render what a human must answer for' };
  }
  const scored = shadow.map((f) => {
    const ft = new Set(meat(f.name.replace(/[-_]/g, ' ') + ' ' + f.desc));
    const hit = it.tokens.filter((w) => ft.has(w));
    return { fold: f, support: round3(hit.length / it.tokens.length), hit };
  }).sort((a, b) => b.support - a.support || a.fold.name.localeCompare(b.fold.name));
  const [best, second] = scored;
  if (best.support >= KAPPA) {
    return { ok: true, mode: 'reuse', fold: best.fold, support: best.support,
      why: 'the estate already holds this — "' + best.fold.name + '" covers the intent at ' + best.support + '; rendered as the existing fold, zero new software' };
  }
  if (second && best.support >= KAPPA / 2 && second.support >= KAPPA / 2) {
    const union = new Set([...best.hit, ...second.hit]);
    const coverage = round3(union.size / it.tokens.length);
    if (coverage >= KAPPA) {
      return { ok: true, mode: 'recombine', folds: [best.fold, second.fold], coverage,
        why: '"' + best.fold.name + '" + "' + second.fold.name + '" together cover ' + coverage + ' of the intent — a composition, not a new cage' };
    }
  }
  const covered = new Set(scored.slice(0, 3).flatMap((s) => s.hit));
  const gaps = it.tokens.filter((w) => !covered.has(w));
  const nearest = scored.slice(0, 2).filter((s) => s.support > 0).map((s) => s.fold.name);
  return { ok: true, mode: 'generate', gaps, nearest,
    brief: 'GENERATE (last resort — the shadow holds no fold for: ' + (gaps.join(', ') || 'this combination') + ').'
      + (nearest.length ? ' Imitate the shape of: ' + nearest.join(', ') + '.' : '')
      + ' Render minimal, use it, fold it back — persistence is a choice that needs an argument.' };
}

/** PERSIST — fold-back is the default; freezing needs an argument a reviewer could dispute. */
export function persist(mode, keepReason) {
  if (!['reuse', 'recombine', 'generate'].includes(mode)) return { ok: false, why: 'persistence applies to rendered modes — doors never rendered' };
  if (mode === 'reuse') return { ok: true, policy: 'keep-frozen', why: 'already crystallized — the fold earned its persistence before this intent arrived' };
  if (keepReason === undefined || keepReason === null || keepReason === '') {
    return { ok: true, policy: mode === 'recombine' ? 'hold-live' : 'render-and-fold',
      why: mode === 'recombine' ? 'the composition lives while it is used, then the parts return to the shadow' : 'used once, folded back — the lit surface stays cheap' };
  }
  if (!S(keepReason) || meat(keepReason).length < 3)
    return { ok: false, why: 'persistence is a choice, and a choice needs an argument — a shrug does not freeze a fold' };
  return { ok: true, policy: 'keep-frozen', why: 'frozen by argument: ' + keepReason };
}

/** FOLD-BACK — dissolve the render, keep the learning. Returns a NEW ledger; never mutates. */
export function foldBack(ledger, intentText, outcome) {
  if (!Array.isArray(ledger)) return { ok: false, why: 'the ledger must be a list' };
  const it = intentOf(intentText);
  if (!it.ok) return it;
  const o = outcome && typeof outcome === 'object' && !Array.isArray(outcome) ? outcome : null;
  if (!o || !['reuse', 'recombine', 'generate'].includes(o.mode)) return { ok: false, why: 'outcome needs the mode that rendered' };
  const folds = Array.isArray(o.folds) ? o.folds.filter(S) : [];
  const record = { key: it.key, mode: o.mode, folds, renders: 1 };
  const i = ledger.findIndex((r) => r && r.key === it.key);
  if (i >= 0) {
    const grown = ledger.map((r, j) => j === i ? { ...r, renders: r.renders + 1, mode: o.mode, folds } : { ...r });
    return { ok: true, ledger: grown };
  }
  return { ok: true, ledger: [...ledger.map((r) => ({ ...r })), record] };
}

/** RECALL — the shadow remembers: a known intent answers from the ledger before re-resolving. */
export function recallOf(intentText, ledger) {
  if (!Array.isArray(ledger)) return { ok: false, why: 'the ledger must be a list' };
  const it = intentOf(intentText);
  if (!it.ok) return it;
  const r = ledger.find((x) => x && x.key === it.key);
  if (!r) return { ok: true, remembered: false, why: 'the shadow has not rendered this before — collapse it fresh' };
  return { ok: true, remembered: true, mode: r.mode, folds: r.folds, renders: r.renders,
    why: 'the shadow remembers — rendered ' + r.renders + ' time(s) before as ' + r.mode + (r.folds.length ? ' via ' + r.folds.join(' + ') : '') };
}
