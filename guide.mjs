// ══════════════════════════════════════════════════════════════════════════════════════════════
// guide.mjs — the character who shows you round, and what is open yet.
//
// HOW THIS IS BUILT, AND WHY. Games do not teach with a manual. You are doing the real thing inside
// ten seconds, on a first move that cannot go wrong, and somebody talks over your shoulder while you
// do it. Half-Life put you on a train. Portal gave you one cube. Nothing is explained before you
// have felt it, one idea at a time, each unlocked by having done the last.
//
// So there is no tutorial here and no help page. There is a person, a question, and a box to type
// in. Everything else appears when you have done the thing that makes it make sense — because a
// screen full of panels you have no reason for yet is the same as a manual, only harder to read.
//
// ⚑ THE FIRST MOVE CANNOT FAIL. It runs with no key, no model, no account and no network. If the
// first thing somebody does needs setting up, most people never do a second thing.
//
// ⚑ THE GUIDE SAYS WHAT HAPPENED, NEVER "WELL DONE". It is the same rule the marker follows: praise
// is what you give somebody instead of information. "That ran on your machine and cost nothing" is
// worth reading. "Great job!" is worth nothing and teaches the reader to skim.
//
// ⚑ AND IT NEVER BLOCKS. Every beat can be walked past. A guide you cannot get rid of is a cage,
// and the person who already knows this stuff is exactly the person you least want to annoy.
//
// Pure and total: no clock, no I/O, no randomness. The state goes in, the next beat comes out.
// ══════════════════════════════════════════════════════════════════════════════════════════════

import { text, num, list, field, isThing } from './safe.mjs';

/**
 * The beats, in order. Each one: what has to be true to be here, what the guide says, what the
 * person can do next, and what the beat opens up.
 *
 * `opens` is cumulative — reaching a beat opens everything that beat and every earlier one opened.
 */
export const BEATS = Object.freeze([
  {
    id: 'arrive',
    reached: () => true,
    says: 'Tell me something you are actually trying to decide. Not a test — a real one. I will lay out the ways it could go.',
    aside: 'I am your didy, powered by fall\u00b7os. No account, no key, nothing to set up — this runs on your own machine.',
    next: 'type it in and press the button',
    opens: ['didy'],
  },
  {
    id: 'thought',
    reached: (s) => s.runs >= 1,
    says: 'That ran on your own machine. No AI, no key, nothing sent anywhere, nothing charged — and it still read your words back and told you which ones counted.',
    aside: 'Everything it scored traces to something you actually typed. If it found nothing, say more about what is at stake.',
    next: 'take one of them, or ignore the lot',
    opens: ['didy'],
  },
  {
    id: 'chose',
    reached: (s) => s.picked >= 1,
    says: 'That was yours. I lay them out and rank them; I never pick. The ones I set aside are kept on purpose — the road you nearly took is the one you want back when the first choice fails.',
    aside: null,
    next: 'now go and get your didy some tools',
    opens: ['didy', 'store'],
  },
  {
    id: 'bought',
    reached: (s) => s.installed >= 1,
    says: 'That is yours now. Everything in the shop is ranked by what it has actually been shown to do, never by what its maker claims — most are not good enough to list at all, and that is the shop working.',
    aside: 'Anything you own turns up beside your didy, ready to drag in.',
    next: 'drag it into one of your didy\u2019s slots',
    opens: ['didy', 'store', 'bags'],
  },
  {
    // ⚑ THE CORE LOOP, and it comes before anything technical. Buy a thing, drag it in, your didy
    // can do that thing. Everything after this is about making it cost less.
    id: 'fitted',
    reached: (s) => s.fitted >= 1,
    says: 'That is the whole shape of it. You buy a thing, you drag it in, and your didy can do that thing — an accountant, a solicitor, an adviser. Pull it back out and it cannot. The more you fit, the more it does on its own.',
    aside: 'That is how this beats one big rented model: yours is assembled out of specialists, and you own them.',
    next: 'try it with a real AI behind it',
    opens: ['didy', 'store', 'bags', 'keys'],
  },
  {
    id: 'keyed',
    reached: (s) => s.keys >= 1,
    says: 'With a key in, I can put those same options into the words of your actual situation. Watch the bar at the top when I do.',
    aside: 'The key stays in this browser and only ever goes to the company that issued it. This site has no server to send it to.',
    next: 'ask for it in your own terms',
    opens: ['didy', 'store', 'bags', 'keys'],
  },
  {
    id: 'rented',
    reached: (s) => s.rented >= 1,
    says: 'The bar moved. That one went out to somebody else\u2019s machine and cost you money — and it will say so every single time, because a cost you stop being shown is one you stop noticing.',
    aside: 'It only put things in better words. It could not change the ranking — that was settled before it was asked.',
    next: 'get that work back onto your own machine',
    opens: ['didy', 'store', 'bags', 'keys'],
  },
  {
    id: 'local',
    reached: (s) => s.localUp,
    says: 'Now the same jobs stay home. That is the point of the whole thing: your bill goes down as you get better, not up. Nothing else you pay for works that way round.',
    aside: null,
    next: 'you have the run of the place now',
    opens: ['didy', 'store', 'bags', 'keys', 'sandbox', 'learn'],
  },
]);

const ALL = Object.freeze(['didy', 'keys', 'store', 'bags', 'sandbox', 'learn']);


/** Read the player's state into the shape the beats ask about. Total: anything at all goes in. */
export function standing(state) {
  const get = (k) => field(state, k);
  const ran = Array.isArray(get('ran')) ? get('ran') : [];
  const keys = get('keys');
  return Object.freeze({
    runs: ran.length,
    rented: ran.filter(r => r && r.rung === 't2').length,
    keys: (keys && typeof keys === 'object')
      ? Object.keys(keys).filter(p => typeof keys[p] === 'string' && keys[p].trim().length >= 9).length : 0,
    localUp: get('localUp') === true,
    installed: Array.isArray(get('bags')) ? get('bags').length : 0,
    picked: num(get('picked')),
    fitted: Array.isArray(get('slots')) ? get('slots').filter(Boolean).length : 0,
    // Someone who has said they are done is done. See `where`.
    dismissed: get('guideOff') === true,
  });
}

/**
 * Where the person is now: the furthest beat they have actually reached. Not a counter — a reading
 * of what they have really done, so refreshing the page or clearing a panel never rewinds them.
 */
export function where(state) {
  const s = standing(state);
  let at = BEATS[0];
  for (const b of BEATS) { if (b.reached(s)) at = b; }
  return {
    beat: at,
    standing: s,
    // ⚑ Every beat can be walked past. A guide you cannot dismiss is a cage, and the person who
    // already knows all this is exactly the one you least want to trap.
    showing: !s.dismissed,
    // Cumulative: reaching a beat opens everything the earlier ones opened too, so nothing that was
    // once available ever disappears again.
    open: Object.freeze([...new Set(BEATS.filter(b => b.reached(s)).flatMap(b => b.opens))]),
  };
}

/** Is this panel open yet? Unknown panels are closed — a typo must not unlock the whole app. */
export function isOpen(state, panel) {
  return where(state).open.includes(String(panel));
}

/** What is still shut, and what would open it — so nothing is ever mysteriously missing. */
export function locked(state) {
  const open = new Set(where(state).open);
  const shut = ALL.filter(p => !open.has(p));
  const opener = {};
  for (const p of shut) {
    const b = BEATS.find(x => x.opens.includes(p));
    if (b) opener[p] = b.next;
  }
  return { shut, opener };
}

/**
 * The whole line the guide shows, in one call. Returns null when there is nothing to say — silence
 * is a real option and a guide that always has an opinion becomes wallpaper.
 */
export function speak(state) {
  const w = where(state);
  if (!w.showing) return null;
  return {
    id: w.beat.id,
    says: w.beat.says,
    aside: w.beat.aside,
    next: w.beat.next,
    // Where they are along the way, so it is finite and visibly finite.
    step: BEATS.indexOf(w.beat) + 1,
    of: BEATS.length,
    last: BEATS.indexOf(w.beat) === BEATS.length - 1,
  };
}
