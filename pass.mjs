// pass.mjs — what the Guild Pass buys, and what it must never be able to take away.
//
// ⚑ THE ONE RULE THIS FILE EXISTS TO ENFORCE
//
// A subscription that can withhold something you already own is the hostage model. This world runs a
// subscription anyway, and the only thing separating it from that model is a single invariant:
//
//     CANCELLING LOSES FLOW, STANDING AND SERVICE. IT NEVER LOSES ANYTHING OWNED.
//
// Everything below is arranged so that invariant is checkable by a machine rather than promised in
// marketing copy — because the day a cancelled member loses a tool they bought or a didy they
// trained, this is the model it claims to be killing, and nobody would notice from the prose.
//
// The wings are the world's real six. Access is per ROOM, not per wing: the fight zone is entirely
// free because it is the door, and the checking zone is the Pass because checking is continuous work.

export const WINGS = ['fight', 'build', 'think', 'rules', 'proof', 'earn'];

// ─────────────────────────────────────────────────────────────────────────────
// OWN vs FLOW — the whole distinction, written once
// ─────────────────────────────────────────────────────────────────────────────

/** Things a member HAS. Free or bought once; never revocable, never gated behind the Pass. */
export const OWNED_KINDS = Object.freeze([
  'fallos',    // the operating system itself, installed on their hardware
  'didy',      // their agent AND its trained state — the thing most worth taking hostage
  'tool',      // anything bought à la carte: forge-pro, watchtower, a premium organ
  'card',      // minted cards
  'notes',     // the Garden and the Vault — their own writing
  'kono',      // $KONO already earned
]);

/** Things the Pass supplies while it runs. Stopping these is honest; they are new-make, not property. */
export const FLOW_KINDS = Object.freeze([
  'credit',    // the monthly build/mint allowance — meters new-make, never rents what was bought
  'checking',  // the Clinic and the Proving Ground: continuous verification, so honestly recurring
  'standing',  // guild pedigree, verified-ring membership, Coliseum entry
  'herd',      // the Herd and Bloodline earning for you while you are away
]);

const isOwned = (k) => OWNED_KINDS.includes(k);
const isFlow = (k) => FLOW_KINDS.includes(k);

/**
 * Every holding is one or the other. A kind that is neither is a bug in the catalogue, not a thing to
 * guess about — guessing is how something owned quietly ends up on the revocable side of the line.
 */
export function classify(kind) {
  if (isOwned(kind)) return 'own';
  if (isFlow(kind)) return 'flow';
  throw new Error(`unclassified holding "${kind}": every holding must be OWN or FLOW, and a new one must be decided deliberately`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIERS — earned, not bought
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Pass tiers on the member's earned didy rung, not on what they pay.
 *
 * ⚑ SOVEREIGN CANNOT BE PURCHASED. The amber rungs are the ones that need somebody who is not you to
 * confirm them, so a tier that could be bought would be a tier you can self-grade — which is the
 * pay-for-position model this is differentiating from, rebuilt by accident.
 */
export const TIERS = Object.freeze([
  { id: 'neuron', rungs: [0, 3], purchasable: true },
  { id: 'cortex', rungs: [4, 6], purchasable: true },
  { id: 'sovereign', rungs: [7, 10], purchasable: false },
]);

export function tierForRung(rung) {
  if (!Number.isInteger(rung) || rung < 0 || rung > 10)
    throw new Error(`rung must be a whole number from 0 to 10, got ${JSON.stringify(rung)}`);
  return TIERS.find(t => rung >= t.rungs[0] && rung <= t.rungs[1]).id;
}

/** Refuses to sell what has to be earned. */
export function grantTier({ rung, paid = false, externallyVerified = false }) {
  const earned = tierForRung(rung);
  const tier = TIERS.find(t => t.id === earned);
  if (!tier.purchasable && !externallyVerified)
    throw new Error(`${earned} is an amber rung: it cannot be granted without an external check, and paying is not a check`);
  if (!tier.purchasable && paid && !externallyVerified)
    throw new Error(`${earned} cannot be bought`);
  return earned;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE CANCEL TEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancel the Pass.
 *
 * Returns the member's holdings afterwards. Everything OWNED is carried across untouched; everything
 * the Pass was supplying stops. The function is written to make the invariant obvious on sight, and
 * the tests then prove it over arbitrary holdings rather than over the examples I happened to pick.
 */
export function cancel(holdings = []) {
  for (const h of holdings) classify(h.kind);       // refuse to act on a holding nobody classified
  return {
    kept: holdings.filter(h => isOwned(h.kind)),
    stopped: holdings.filter(h => isFlow(h.kind)),
  };
}

/**
 * The invariant itself, as a function anything can call.
 *
 * ⚑ This is the SaaS-hostage test. It is exported so a page, a test and a CI step can all ask the
 * same question, rather than three of them each deciding what "still owns it" means.
 */
/**
 * Two holdings are the same holding only if they are the same KIND and the same ONE.
 *
 * ⚑ Exported so it can be checked on its own. Inside cancelIsHonest it is unreachable while cancel()
 * is correct — nothing is ever missing, so a wrong matcher there would sit unnoticed until the day
 * something DID go missing, which is the one day it has to work. Matching on kind alone would make
 * owning any tool look like owning every tool, and losing one of three bought tools would report as
 * honest.
 */
export const sameHolding = (a, b) => a.kind === b.kind && a.id === b.id;

export function cancelIsHonest(before = []) {
  const after = cancel(before);
  const ownedBefore = before.filter(h => isOwned(h.kind));
  const missing = ownedBefore.filter(o => !after.kept.some(k => sameHolding(k, o)));
  return {
    honest: missing.length === 0,
    missing,
    reason: missing.length === 0
      ? 'cancelling stopped only flow, standing and service'
      : `cancelling would take ${missing.length} owned thing(s): ${missing.map(m => `${m.kind}:${m.id}`).join(', ')}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT A ROOM COSTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚑ The fight wing is never gated. It is the door, the demonstration and the thing that grows the
 * mesh — every free player is another sovereign node. Charging at the door would trade the engine
 * for the first month's revenue.
 */
export const WING_PRICE = Object.freeze({
  fight: 'free',
  build: 'free',        // base build is free; individual premium tools are pay-once, not Pass-gated
  think: 'free',        // their notes and their machine — charging for these would be charging for their own data
  rules: 'free',        // governance. charging for a say in the rules is not a business model
  proof: 'pass',        // the Clinic and Proving Ground: continuous work, honestly recurring
  earn: 'free',         // free to participate; the estate takes position, not a cut of each trade
});

export function priceOfWing(wing) {
  if (!WINGS.includes(wing)) throw new Error(`unknown wing "${wing}"`);
  return WING_PRICE[wing];
}

/** What a member can reach right now. Owned things ignore the Pass entirely — that is the point. */
export function access({ wing, hasPass = false, owns = [] }) {
  const price = priceOfWing(wing);
  if (price === 'free') return { allowed: true, why: 'free' };
  if (owns.some(o => o.kind === 'tool' && o.wing === wing)) return { allowed: true, why: 'owned outright' };
  return hasPass
    ? { allowed: true, why: 'Guild Pass' }
    : { allowed: false, why: 'the Guild Pass covers the checking zone' };
}
