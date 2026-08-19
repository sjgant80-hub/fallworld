// fallworld · journey.mjs — the levelling spine: five cores, one next thing, nothing shut.
//
// The world starts SO simple: core 1 is your didy, core 2 is learning to ask, core 3 is the game
// (which teaches what a card is), then the forge and the market, then everything else. The level
// is COMPUTED from what this person actually did — never chosen, never bought — and it stages the
// PRESENTATION only. Every door in the world stays open at level 1; the journey just lights the
// next one. (The old mistake, made once and written down: "gradual" implemented as locks turned
// the testimonial into a place mostly shut. Levels narrate. They do not bar.)
//
// Pure and total: any input yields a well-formed journey; garbage state reads as a fresh start.

export const CORES = [
  { id: 'didy',  name: 'your didy',  do: 'type a real decision below and press the button — it works before you set anything up' },
  { id: 'learn', name: 'learning',   do: 'open Learn, then bring your didy three real decisions — asking properly is the one skill' },
  { id: 'game',  name: 'the game',   do: 'open the Duel and play a hand — the game is how you learn what a card is' },
  { id: 'cards', name: 'cards',      do: 'visit the Forge, or drop a card in the store — a picture that openly carries a real build' },
  { id: 'rig',   name: 'assembled',  do: 'fit a tool into one of your didy’s slots — anything you own becomes something it can do' },
  { id: 'power', name: 'powered',    do: 'add a key you already have, or find your own model — the ladder ends on your machine' },
];

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const arr = (v) => Array.isArray(v) ? v : [];

/** What this state has actually demonstrated, core by core. Observable acts only. */
export function progress(me) {
  const m = obj(me);
  const runs = arr(m.ran).length;
  const visited = obj(m.visited);
  const cards = arr(m.cards).length;
  const fitted = arr(m.slots).filter(Boolean).length;
  const keyed = Object.keys(obj(m.keys)).length > 0;
  return {
    didy: runs >= 1,
    learn: visited.learn === true && runs >= 3,
    game: visited.duel === true,
    cards: cards >= 1 || visited.forge === true,
    rig: fitted >= 1,
    power: m.localUp === true || keyed,
  };
}

/**
 * The journey: level 1 + one per core demonstrated; the next core is the FIRST not yet done, so
 * the order Simon set (didy → learning → game → cards → assembled → powered) is the order the
 * world suggests itself in. `next` is null only when everything is done — the whole world level.
 */
export function journey(me) {
  const done = progress(me);
  const level = 1 + CORES.filter(c => done[c.id]).length;
  const next = CORES.find(c => !done[c.id]) || null;
  return {
    level,
    top: level >= 1 + CORES.length,
    title: next === null ? 'the whole world'
      : level === 1 ? 'newcomer'
      : CORES.filter(c => done[c.id]).slice(-1)[0].name,
    next: next === null ? null : { id: next.id, name: next.name, do: next.do },
    cores: CORES.map(c => ({ id: c.id, name: c.name, done: !!done[c.id] })),
    // the standing invariant, carried in the data so the page can SAY it rather than imply it
    nothingShut: true,
  };
}

export default journey;
