// ══════════════════════════════════════════════════════════════════════════════════════════════
// safe.mjs — reading things that might not be there, in one place.
//
// Every kernel in this repo has to survive a half-written save, a feed written by somebody else, or
// an object whose getter throws. That produced the same four helpers copy-pasted into six files —
// which the structural assessor caught as repeated blocks, correctly. Six copies of a guard is six
// places for it to drift, and the day one of them loses its try/catch nobody finds out until a
// screen goes blank.
//
// ⚑ THE POINT OF ALL OF THESE IS THE SAME: reading a value must never be the thing that fails. A
// getter can throw. A toString can throw. A number can be NaN. None of that is exotic — it is what
// arrives when the input came from a file, a URL, another program, or an older version of this one.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** Anything to text, including things that refuse to become text. */
export const text = (v) => { try { return String(v ?? ''); } catch { return ''; } };

/** A finite number or the fallback. NaN and Infinity are not numbers you can act on. */
export const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

/** A finite number that is not negative, or the fallback. */
export const nonneg = (v, d = 0) => (Number.isFinite(v) && v >= 0 ? v : d);

/** An array of text, from anything. Never throws, never returns a non-array. */
export const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

/** Read one field off anything at all — including an object whose getter throws. */
export const field = (o, k) => { try { return o[k]; } catch { return undefined; } };

/** A reader bound to one object, for the common case of pulling several fields off it. */
export const reader = (o) => (k) => field(o, k);

/** True only for a real object — not null, not an array, not a string. */
export const isThing = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** One of the allowed values, or the first as a default. Refuses unknown names rather than passing them. */
export const oneOf = (v, allowed, d) => (allowed.includes(v) ? v : (d !== undefined ? d : allowed[0]));
