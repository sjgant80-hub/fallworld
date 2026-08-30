// fallworld · doors.mjs — THE HUMAN DOORS, vendored from simon-op (the private seat).
// The LAW is public — finance/taste/counsel, clocks outrank money — the QUEUE is not: it lives
// in the player's browser (localStorage), device-local like the mind. witness 28/29 + 1 argued.
//               then finance, then counsel, then taste; within a class, first-in first-out.
//               An empty queue is not an error — it is the machine saying "rest".
//   · DECIDE  — yes / no / later. A decision is a record (append-only in spirit); "later"
//               re-queues at the back and counts how often it has been deferred, so a
//               decision that keeps sliding becomes visible instead of invisible.
//
// Pure and total: garbage in → { ok:false, why }, never a throw at the door.

export const DOORS = ['finance', 'taste', 'counsel'];

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const str = (v) => typeof v === 'string' && v.length > 0;

/** ENQUEUE — admit one item to the human queue. Returns a NEW queue; never mutates. */
export function enqueue(queue, item) {
  if (!Array.isArray(queue)) return { ok: false, why: 'queue must be a list' };
  const it = obj(item);
  if (!it) return { ok: false, why: 'item must be an object' };
  if (!str(it.id)) return { ok: false, why: 'item id required' };
  if (!DOORS.includes(it.kind)) return { ok: false, why: `"${it.kind}" is not a human door — the machine handles it. Doors: ${DOORS.join(', ')}` };
  if (!str(it.what)) return { ok: false, why: `item "${it.id}": what is being decided?` };
  if (it.clockDays !== undefined && !(Number.isInteger(it.clockDays) && it.clockDays >= 0))
    return { ok: false, why: `item "${it.id}": clockDays must be a non-negative integer (days until a statutory deadline)` };
  if (queue.some((q) => q && q.id === it.id)) return { ok: false, why: `item "${it.id}" is already queued — one decision, one slot` };
  return { ok: true, queue: [...queue, { id: it.id, kind: it.kind, what: it.what, clockDays: it.clockDays, deferred: 0 }] };
}

const CLASS_ORDER = { finance: 0, counsel: 1, taste: 2 };

/** NEXT — the one item Simon should look at now, with the reason. */
export function nextDecision(queue) {
  if (!Array.isArray(queue)) return { ok: false, why: 'queue must be a list' };
  const items = queue.filter(obj);
  if (items.length !== queue.length) return { ok: false, why: 'the queue holds a malformed item' };
  if (items.length === 0) return { ok: false, why: 'the queue is empty — the machine is handling everything. Rest.' };
  let best = null, bestIdx = -1;
  items.forEach((q, i) => {
    if (!best) { best = q; bestIdx = i; return; }
    const qClock = q.clockDays !== undefined, bClock = best.clockDays !== undefined;
    if (qClock !== bClock) { if (qClock) { best = q; bestIdx = i; } return; }         // clocks outrank everything
    if (qClock && bClock) { if (q.clockDays < best.clockDays) { best = q; bestIdx = i; } return; }  // nearer deadline wins; tie → earlier in queue
    const qc = CLASS_ORDER[q.kind], bc = CLASS_ORDER[best.kind];
    if (qc < bc) { best = q; bestIdx = i; }                                            // class order; tie → FIFO (keep earlier)
  });
  const reason = best.clockDays !== undefined
    ? `"${best.id}" — a statutory clock at ${best.clockDays} day(s). Clocks outrank money.`
    : `"${best.id}" — the nearest ${best.kind} door, first in.`;
  return { ok: true, pick: best.id, index: bestIdx, reason };
}

/** DECIDE — spend the decision. yes/no remove the item; later re-queues it at the back. */
export function decide(queue, id, verdict) {
  if (!Array.isArray(queue)) return { ok: false, why: 'queue must be a list' };
  if (!str(id)) return { ok: false, why: 'which item? id required' };
  if (!['yes', 'no', 'later'].includes(verdict)) return { ok: false, why: `verdict must be yes, no or later — "${String(verdict)}" decides nothing` };
  const i = queue.findIndex((q) => obj(q) && q.id === id);
  if (i < 0) return { ok: false, why: `item "${id}" is not in the queue` };
  const item = queue[i];
  const rest = queue.filter((_, j) => j !== i);
  if (verdict === 'later') {
    const deferred = (item.deferred || 0) + 1;
    return { ok: true, queue: [...rest, { ...item, deferred }], decision: { id, verdict, deferred },
      note: deferred >= 3 ? `"${id}" has slid ${deferred} times — a decision that keeps sliding is a decision being made by default` : undefined };
  }
  return { ok: true, queue: rest, decision: { id, verdict, kind: item.kind, what: item.what } };
}
