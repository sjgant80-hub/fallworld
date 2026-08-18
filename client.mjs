// ══════════════════════════════════════════════════════════════════════════════════════════════
// client.mjs — fallworld as a game you install, and the estate as addons you install into it.
//
// The client is free and runs on your machine. The tools are addons. An addon is not a link to
// somebody else's website; it is a thing that declares what it does, what it is allowed to touch,
// and how much model it needs — and the client holds it to all three.
//
// ⚑ NOTHING GETS LISTED ON SOMEBODY SAYING IT IS GOOD.
// Every store on earth has the same hole: the listings cannot be trusted. Stars get bought, reviews
// get written by the seller, "works great" means nothing. So a listing here carries a tier that was
// COMPUTED from what the thing's own CI actually ran — never set by whoever wrote it — and an addon
// with no evidence at all cannot be listed, at any price.
//
// ⚑ AND A PAID ADDON MUST BE PROVEN. Charging for something that cannot pass its own gate is the
// exact trade this whole estate exists to make impossible. It is enforced here, not promised.
//
// ⚑ THE ONE PEOPLE GET WRONG: PERMISSIONS ARE JUDGED TOGETHER, NEVER ONE AT A TIME.
// Every permission system fails the same way — each addon looks reasonable on its own screen, you
// approve them one by one over six months, and nobody ever sees the pile. One addon that reads your
// memory is fine. One that writes to a repo is fine. One that reaches the network is fine. All three
// installed is a thing that can read your memory and post it somewhere, and no single approval
// screen ever showed you that. So the client computes the COMBINED grant of everything installed,
// and names the reaches that only exist because of the combination.
//
// Pure and total. No clock, no I/O, no randomness.
// ══════════════════════════════════════════════════════════════════════════════════════════════

/** What a thing has actually been shown to do. Computed from its CI, never declared. */
export const TIER = Object.freeze({ prototype: 'prototype', works: 'works', proven: 'proven' });
const LADDER = [TIER.prototype, TIER.works, TIER.proven];
export const tierRank = (t) => LADDER.indexOf(String(t));

export const TIER_MEANS = Object.freeze({
  prototype: 'nothing runs a check on it — it may be perfect, but nobody has shown that',
  works: 'something runs and passes, so it does what it says on a good day',
  proven: 'its own gate breaks it on purpose and the tests catch it',
});

/** What an addon may touch. Deliberately few and blunt: a permission nobody can read is one nobody can refuse. */
export const REACH = Object.freeze({
  read: 'read your notes and memory',
  write: 'change files on your machine',
  net: 'reach the internet',
  spend: 'spend from your budget',
  publish: 'put things where other people can see them',
  run: 'run other programs',
});
const REACHES = Object.keys(REACH);

// Pairs that are quiet apart and loud together. This is the whole point of judging the pile.
const TOGETHER = Object.freeze([
  { needs: ['read', 'net'], say: 'read your private notes AND send them out — nothing installed alone could do that' },
  { needs: ['read', 'publish'], say: 'read your private notes AND publish them where others can see' },
  { needs: ['write', 'run'], say: 'write a program to your machine AND then run it' },
  { needs: ['net', 'run'], say: 'fetch something off the internet AND run it' },
  { needs: ['net', 'spend'], say: 'reach the internet AND spend your money' },
  { needs: ['write', 'publish'], say: 'change your files AND publish the result' },
]);

const text = (v) => { try { return String(v ?? ''); } catch { return ''; } };
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

/**
 * Declare an addon. `tier` and `evidence` are not the author's opinion — they come from what the
 * thing's CI ran, which is why they are read here rather than argued about.
 */
export function addon(spec) {
  // Read every field through one shield. A getter that throws would otherwise take the shop down
  // at the property access, before any check could run — and the shield also makes a type-guard in
  // front of it dead code, since a number or a string simply yields undefined.
  const get = (k) => { try { return spec[k]; } catch { return undefined; } };
  const id = text(get('id'));
  const price = num(get('price'), 0);
  const rawTier = text(get('tier'));
  return Object.freeze({
    id: id || null,
    name: text(get('name')) || id || 'unnamed',
    does: text(get('does')),
    wing: text(get('wing')) || null,
    url: text(get('url')) || null,
    // Unknown tier names are NOT quietly the bottom rung — they are unknown, which is a different
    // and more alarming thing than "not proven yet".
    tier: LADDER.includes(rawTier) ? rawTier : null,
    evidence: text(get('evidence')) || null,
    reach: list(get('reach')).filter(r => REACHES.includes(r)),
    mind: [0, 1, 2].includes(get('mind')) ? get('mind') : 0,
    price: Math.max(0, price),
    needs: list(get('needs')),
  });
}

/**
 * May this be listed in the store at all, and at this price? Returns the refusal in words a seller
 * could argue with, because a store that silently drops a listing teaches nobody anything.
 */
export function listable(a) {
  if (!a || !a.id) return { ok: false, why: 'it has no id, so nothing could install it' };
  if (!a.does) return { ok: false, why: 'it does not say what it does' };
  if (a.tier === null) return { ok: false, why: 'nothing has been computed about whether it works — an unranked thing cannot be listed' };
  if (!a.evidence) return { ok: false, why: 'its rank has nothing behind it: no run, no sha, nothing anybody could re-check' };
  if (a.price > 0 && a.tier !== TIER.proven) {
    return { ok: false, why: `it is priced but only ${a.tier}. Nothing gets charged for until its own gate breaks it on purpose and the tests catch it.` };
  }
  return { ok: true, why: a.price > 0 ? 'proven, with a run anybody can re-run' : `listed as ${a.tier}` };
}

/** The store: only what may honestly be sold, plus the refusals, said out loud. */
export function store(specs) {
  const all = (Array.isArray(specs) ? specs : []).map(addon);
  const listed = [], refused = [];
  for (const a of all) {
    const v = listable(a);
    (v.ok ? listed : refused).push({ ...a, why: v.why });
  }
  listed.sort((x, y) => tierRank(y.tier) - tierRank(x.tier) || x.price - y.price || String(x.name).localeCompare(String(y.name)));
  return {
    listed, refused,
    counts: Object.fromEntries(LADDER.map(t => [t, listed.filter(a => a.tier === t).length])),
    paid: listed.filter(a => a.price > 0).length,
    free: listed.filter(a => a.price === 0).length,
    // A storefront that hides what it turned away is a storefront you cannot audit.
    verdict: !all.length ? 'Nothing in the catalogue yet.'
      : `${listed.length} listed, ${refused.length} refused for want of evidence.`,
  };
}

/**
 * What one addon can and cannot do — the lit ring and its shadow, before you install it.
 * No app store on earth tells you the second half.
 */
export function inspect(a) {
  const can = a.reach.map(r => ({ reach: r, means: REACH[r] }));
  const cannot = REACHES.filter(r => !a.reach.includes(r)).map(r => ({ reach: r, means: REACH[r] }));
  return {
    can, cannot,
    // An addon that asks for nothing is not suspicious — it is the good case, and saying so plainly
    // is how a person learns to notice the one that asks for everything.
    say: can.length === 0 ? 'It asks for nothing at all: it cannot read, change, send or spend anything.'
      : `It can ${can.map(c => c.means).join(', ')}. It cannot ${cannot.map(c => c.means).join(', ')}.`,
  };
}

/** Refuse the install rather than trusting the addon to behave. */
export function install(a, installedIds, catalogue) {
  const have = new Set(Array.isArray(installedIds) ? installedIds.map(text) : []);
  const by = new Map((Array.isArray(catalogue) ? catalogue : []).map(addon).map(x => [x.id, x]));
  if (!a || !a.id) return { ok: false, why: 'there is nothing here to install' };
  if (have.has(a.id)) return { ok: false, why: `${a.name} is already installed` };
  const v = listable(a);
  if (!v.ok) return { ok: false, why: `it cannot be installed: ${v.why}` };
  const missing = a.needs.filter(n => !have.has(n));
  if (missing.length) {
    // Installing it anyway would put a dead thing in your bags that looks exactly like a live one.
    return { ok: false, why: `it needs ${missing.map(m => (by.get(m) || { name: m }).name).join(', ')}, which you do not have`, missing };
  }
  return { ok: true, why: `${a.name} installed`, gained: a.reach };
}

/**
 * ⚑ THE PILE. What everything you have installed can do BETWEEN them — including the reaches that
 * exist only because of the combination, which no single install screen ever showed you.
 */
export function held(installed) {
  const all = (Array.isArray(installed) ? installed : []).map(addon).filter(a => a.id);
  const reach = new Map();
  for (const a of all) for (const r of a.reach) {
    if (!reach.has(r)) reach.set(r, []);
    reach.get(r).push(a.name);
  }
  const combined = TOGETHER
    .filter(c => c.needs.every(n => reach.has(n)))
    .map(c => ({
      needs: c.needs,
      say: c.say,
      // Naming who brought each half is what makes it fixable: you can see which one to remove.
      by: c.needs.map(n => ({ reach: n, from: reach.get(n) })),
      // Only worth alarming about when no single addon already had the whole combination anyway.
      emergent: !all.some(a => c.needs.every(n => a.reach.includes(n))),
    }));
  const spent = all.reduce((t, a) => t + a.price, 0);
  const rented = all.filter(a => a.mind > 0);
  return {
    count: all.length,
    reach: [...reach.keys()].sort(),
    who: Object.fromEntries(reach),
    combined,
    // Said separately: an addon needing a model is not a fault, it is a running cost and a
    // dependency on somebody else's machine unless you built one.
    needsModel: rented.map(a => ({ name: a.name, mind: a.mind })),
    spent,
    verdict: !all.length ? 'Nothing installed. The client on its own reaches nothing.'
      : combined.filter(c => c.emergent).length
        ? `Together, what you have installed can do ${combined.filter(c => c.emergent).length} thing(s) no single one of them could.`
        : `${all.length} installed, and nothing they can do together that they could not do apart.`,
  };
}

/** Build the whole catalogue out of the estate's real index — never a typed list. */
export function fromEstate(items, wings) {
  const rows = Array.isArray(items) ? items : [];
  const wingOf = new Map();
  for (const w of (Array.isArray(wings) ? wings : [])) {
    if (!w || typeof w !== 'object') continue;
    for (const r of (Array.isArray(w.rooms) ? w.rooms : [])) {
      const u = (() => { try { return text(r.u); } catch { return ''; } })();
      if (u) wingOf.set(u, text(w.id) || null);
    }
  }
  return rows.filter(r => r && typeof r === 'object' && !r.private).map(r => {
    const proof = (() => { try { return (r.proof && typeof r.proof === 'object') ? r.proof : {}; } catch { return {}; } })();
    return addon({
      id: text(r.name),
      name: text(r.title) || text(r.name),
      does: text(r.desc),
      url: text(r.url) || null,
      wing: wingOf.get(text(r.url)) || null,
      tier: text(proof.tier),
      // The evidence IS the workflow that ran. No run, no evidence, no listing.
      evidence: proof.workflow ? `${proof.workflow}${proof.sha ? ' @ ' + String(proof.sha).slice(0, 7) : ''}` : null,
      reach: list(r.reach),
      mind: r.mind,
      price: r.price,
    });
  });
}
