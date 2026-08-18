// ══════════════════════════════════════════════════════════════════════════════════════════════
// ladder.mjs — the rung above fall-os, and the rule for coming down it.
//
// fall-os already has the bottom two rungs and they are gated: t0 is the conductor with no model at
// all, t1 is a real model running in your own tab. What it does not have is the rung everybody
// actually starts on — somebody else's frontier model, reached with a key you pay for.
//
// That rung matters because of the direction of travel. A tool that demands you install a model
// before it does anything never gets past the download. So: paste a key, it works today, and every
// job tells you it cost money. Then you build, and the same jobs start staying home. The bill going
// DOWN as you get better is the whole product, and it is the one thing a subscription cannot copy.
//
// ⚑ THE ROUTING IS NOT REIMPLEMENTED HERE. Choosing between rungs is exactly what fall-os's walk.mjs
// already does — nodes with a worth and a price, a purse that may never go negative, the price paid
// on arrival. This file builds the nodes and hands them to `walk`. Writing a second router beside a
// gated one is how the copy becomes the version people read.
//
// ⚑ AND IT NEVER SILENTLY ESCALATES. Asking for your own machine and not getting it is an answer,
// not a reason to spend your money. Escalation is offered in words and taken by the caller.
//
// Pure and total: no clock, no I/O, no randomness.
// ══════════════════════════════════════════════════════════════════════════════════════════════
import { node, walk } from './vendor/fall-os/walk.mjs';
import { text, num, list, field, isThing } from './safe.mjs';

/** The rungs, bottom (cheapest to you) first. `holds` is the largest job the rung can carry. */
export const RUNGS = Object.freeze([
  { id: 't0', name: 'no model', holds: 0, yours: true, price: 0,
    blurb: 'plain deterministic code on your machine — free forever, and it never guesses' },
  { id: 't1', name: 'your own model', holds: 1, yours: true, price: 0,
    blurb: 'a real model running in your tab or on your box — free after you build it' },
  { id: 't2', name: 'a frontier model', holds: 2, yours: false, price: 1,
    blurb: 'somebody else\'s big model, reached with a key you pay for — where everybody starts' },
]);

export const rungOf = (id) => RUNGS.find(r => r.id === id) || null;

// What a run may spend before it has to ask. Finite on purpose — see the note in route().
export const DEFAULT_PURSE = 20;

// Shorter than this is somebody testing the box, not a key. Both providers' keys are far longer.
export const KEY_MIN = 9;


/**
 * What you can actually reach right now. Deliberately blunt: a model you own but have not started
 * holds nothing, and a key you have not pasted is not a key.
 */
export function reach(state) {
  // Every field read through one shield: a getter that throws must not take the client down, and
  // the shield also makes a type-guard in front of it dead code — a number or a string just yields
  // undefined either way.
  const get = (k) => field(state, k);
  const keys = (() => {
    const k = get('keys');
    if (!k || typeof k !== 'object') return [];
    // A key is a key when it is a string somebody actually pasted. Nothing here is inferred.
    // Long enough to be a real key rather than a placeholder somebody typed to see what happened.
    return Object.keys(k).filter(p => typeof k[p] === 'string' && k[p].trim().length >= KEY_MIN).sort();
  })();
  return Object.freeze({
    t0: true,                                   // always: it is just code, and it is already here
    t1: get('localUp') === true,
    t2: keys.length > 0,
    keys: Object.freeze(keys),
  });
}

/**
 * Route one job of size `mind`. Built as a walk over the rungs: reaching a rung costs its price,
 * and its worth is how much of the job it can actually carry. walk() does the choosing.
 */
export function route(job, state, opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};
  const mind = [0, 1, 2].includes(o.mind) ? o.mind : 1;
  const insist = text(o.insist) || null;
  const have = reach(state);

  const usable = RUNGS.filter(r => have[r.id] && r.holds >= mind);
  const yoursOnly = insist === 'yours' || insist === 'local';

  if (!usable.length) {
    return {
      rung: null, yours: null, mind, cost: 0, provider: null,
      refused: have.t2
        ? `nothing available can carry a job this size (needs ${mind})`
        : have.t1
          ? `this needs more model than your own can carry (${mind} > 1), and there is no key to fall back on`
          : 'your own model is not running and no key has been added, so there is nowhere to run this',
      couldEscalate: false,
    };
  }

  const yours = usable.filter(r => r.yours);
  if (yoursOnly && !yours.length) {
    // ⚑ THE STOP. Asked to stay home, cannot stay home: that is the answer. Spending the visitor's
    // money to keep the screen moving is the silent bill this whole ladder exists to make visible.
    return {
      rung: null, yours: null, mind, cost: 0, provider: null,
      refused: have.t1
        ? `you asked for this to stay on your machine, and it needs more model than yours carries (${mind} > 1)`
        : 'you asked for this to stay on your machine, and your own model is not running',
      couldEscalate: usable.some(r => !r.yours),
    };
  }

  const pool = yoursOnly ? yours : usable;

  // Hand the choice to fall-os. Its graph is { edges, nodes }: edges name where you can go from a
  // node, nodes carry the worth and the price. Worth is how much of the job a rung can carry; price
  // is what it costs you. walk's own rule — pay on arrival, never dip below nothing — does the rest.
  const graph = {
    edges: { here: pool.map(r => r.id), ...Object.fromEntries(pool.map(r => [r.id, []])) },
    // ⚑ WORTH FALLS AS THE RUNG GETS BIGGER. The pool is already only rungs that CAN carry this
    // job, so the best one is the SMALLEST of them — using a language model for something plain
    // deterministic code does perfectly is the exact waste this ladder exists to remove, and it is
    // waste even when the model is free. Scoring by capability instead sent every trivial job to
    // the largest thing available, which is how "it's local so it's fine" quietly becomes a habit.
    nodes: {
      here: node('here', 0, 0),
      ...Object.fromEntries(pool.map(r => [r.id, node(r.id, RUNGS.length - r.holds, r.price)])),
    },
  };
  // ⚑ THE PURSE MUST BE A REAL NUMBER. fall-os's affordable() refuses an infinite one outright —
  // "unlimited" is not a budget, it is the absence of one, and a router handed Infinity would
  // cheerfully route everything to the most expensive rung forever. Passing Infinity here made
  // every single route unaffordable, including the free one, which is the strictness working.
  const seen = walk(graph, 'here', { purse: num(o.purse, DEFAULT_PURSE), depth: 1 });
  const chosen = seen.best && seen.best.path.length ? seen.best.path[seen.best.path.length - 1] : null;
  const picked = pool.find(r => r.id === chosen) || null;

  if (!picked) {
    return {
      rung: null, yours: null, mind, cost: 0, provider: null,
      // walk says exactly why, and repeating it beats inventing a friendlier sentence that is vaguer.
      // walk always says exactly why, and repeating it beats a friendlier sentence that is vaguer.
      refused: seen.finding,
      couldEscalate: false,
    };
  }

  return {
    rung: picked.id,
    name: picked.name,
    yours: picked.yours,
    mind,
    cost: picked.price,
    provider: picked.yours ? null : (have.keys[0] ?? null),
    why: picked.blurb,
    // Said on every single job, not once at setup. A cost you stop being shown is one you stop
    // noticing, and feeling it is the point of the ladder.
    note: picked.yours ? null
      : have.t1 ? 'your own model is running but cannot carry a job this size'
                : 'your own model is not running, so this went out to a paid one',
  };
}

/**
 * ⚑ WHAT ACTUALLY RAN WHERE. The only honest source for the number on the bar. A percentage
 * computed from what you have installed is a statement about intentions; this one you can check
 * against your card.
 */
export function tally(entries) {
  const rows = (Array.isArray(entries) ? entries : [])
    .filter(e => e && typeof e === 'object' && rungOf(text(e.rung)));
  const mine = rows.filter(e => rungOf(e.rung).yours);
  const spent = rows.reduce((t, e) => t + num(e.cost, 0), 0);
  return {
    runs: rows.length,
    yours: mine.length,
    rented: rows.length - mine.length,
    spent,
    byRung: Object.fromEntries(RUNGS.map(r => [r.id, rows.filter(e => e.rung === r.id).length])),
    // ⚑ Nothing run is NO SCORE. An untouched client reading 100% sovereign would score best on the
    // day you had done nothing at all, which is the badge that cannot fail.
    sovereignty: rows.length === 0 ? null : mine.length / rows.length,
    verdict: rows.length === 0 ? 'Nothing has run yet, so there is nothing to be sovereign about.'
      : mine.length === rows.length ? `All ${rows.length} ran on your own machine.`
      : `${mine.length} of ${rows.length} on your machine · ${rows.length - mine.length} rented · ${spent} spent.`,
  };
}

/** What the next rung would ACTUALLY have saved, read off what you really ran. Never a promise. */
export function wouldSave(entries, rungId) {
  const r = rungOf(text(rungId));
  const rented = (Array.isArray(entries) ? entries : [])
    .filter(e => e && typeof e === 'object' && rungOf(text(e.rung)) && !rungOf(e.rung).yours);
  if (!r || !r.yours) return { runs: 0, spent: 0, say: 'That rung is not yours to build.' };
  const back = rented.filter(e => num(e.mind, 1) <= r.holds);
  return {
    runs: back.length,
    spent: back.reduce((t, e) => t + num(e.cost, 0), 0),
    say: back.length === 0
      ? 'Nothing you have run so far would have stayed home on that rung.'
      : `${back.length} of the ${rented.length} job(s) you paid for would have run on your own machine.`,
  };
}

/** The line under the chat box, so the cost is never out of sight. */
export function readout(d) {
  const x = (d && typeof d === 'object') ? d : {};
  if (x.refused) return `refused — ${x.refused}`;
  if (!x.rung) return 'nowhere to run this';
  return x.yours ? `ran on your machine (${x.name}) · free`
                 : `ran on ${x.provider || 'a paid model'} · ${x.note || 'rented'}`;
}
