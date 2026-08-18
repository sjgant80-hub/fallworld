// Tests for the client and the store.
//
// A storefront fails in one direction: it lists things that should not be listed. So most of what
// is below is about refusing to sell — and about the permission pile, which is the failure every
// app store on earth still has.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIER, TIER_MEANS, REACH, tierRank, addon, listable, store, inspect, install, held, fromEstate } from './client.mjs';

const proven = (over = {}) => ({
  id: 'witness', name: 'Witness', does: 'breaks your code on purpose to find tests that only pretend to check it',
  tier: TIER.proven, evidence: 'gate @ 09a7e59', reach: ['read', 'run'], mind: 0, price: 0, ...over,
});

// ─────────────────────────── nothing gets listed on a claim ───────────────────────────

test('AN ADDON WITH NO EVIDENCE CANNOT BE LISTED, AT ANY PRICE', () => {
  // The hole every store has. A listing has to stand on something anyone can re-run.
  assert.equal(listable(addon(proven({ evidence: null }))).ok, false);
  assert.match(listable(addon(proven({ evidence: null }))).why, /re-check|no run/);
  assert.equal(listable(addon(proven({ tier: null }))).ok, false, 'an unranked thing was listed');
});

test('an unknown tier name is unknown, not quietly the bottom rung', () => {
  // A typo silently becoming a real grade is how a ladder stops meaning anything.
  assert.equal(addon(proven({ tier: 'gold' })).tier, null);
  assert.equal(addon(proven({ tier: 'Proven' })).tier, null, 'a near-miss was accepted as a rank');
  assert.equal(tierRank('gold'), -1, 'an unknown rank sat on the ladder at ' + tierRank('gold'));
  assert.equal(tierRank(TIER.prototype), 0, 'the bottom rung must be a real rung');
});

test('A PAID ADDON MUST BE PROVEN — you cannot charge for something that fails its own gate', () => {
  for (const t of [TIER.prototype, TIER.works]) {
    const v = listable(addon(proven({ tier: t, price: 9 })));
    assert.equal(v.ok, false, `a ${t} addon was listed at a price`);
    assert.match(v.why, /priced but only/);
  }
  assert.equal(listable(addon(proven({ tier: TIER.proven, price: 9 }))).ok, true);
  // Free is allowed at any rank: adoption is the point of the free tier.
  assert.equal(listable(addon(proven({ tier: TIER.prototype, price: 0 }))).ok, true);
});

test('an addon that will not say what it does is not listed', () => {
  assert.equal(listable(addon(proven({ does: '' }))).ok, false);
  assert.equal(listable(addon(proven({ id: '' }))).ok, false);
});

test('THE STORE SHOWS WHAT IT TURNED AWAY — a storefront you cannot audit is not one', () => {
  const s = store([proven(), proven({ id: 'a', tier: TIER.works, price: 5 }), proven({ id: 'b', evidence: null })]);
  assert.equal(s.listed.length, 1);
  assert.equal(s.refused.length, 2);
  for (const r of s.refused) assert.ok(r.why.length > 20, r.id + ' was refused with a shrug: ' + r.why);
  assert.match(s.verdict, /2 refused/);
});

test('the best-proven come first, and free before paid at the same rank', () => {
  const s = store([
    proven({ id: 'c', name: 'cheap', tier: TIER.prototype }),
    proven({ id: 'a', name: 'paid', price: 9 }),
    proven({ id: 'b', name: 'free' }),
  ]);
  assert.deepEqual(s.listed.map(a => a.name), ['free', 'paid', 'cheap']);
  assert.equal(s.paid, 1);
  assert.equal(s.free, 2);
});

test('an empty catalogue says so rather than looking like a healthy empty shop', () => {
  const s = store([]);
  assert.match(s.verdict, /Nothing in the catalogue/);
  assert.deepEqual(s.listed, []);
});

// ─────────────────────────── what it cannot do ───────────────────────────

test('EVERY ADDON SHOWS ITS SHADOW — what it cannot do, which no app store tells you', () => {
  const i = inspect(addon(proven({ reach: ['read'] })));
  assert.deepEqual(i.can.map(c => c.reach), ['read']);
  assert.ok(i.cannot.length >= 4, 'the shadow was nearly empty');
  assert.ok(!i.cannot.some(c => c.reach === 'read'), 'something was both allowed and refused');
  assert.match(i.say, /It cannot/);
});

test('an addon that asks for nothing is called out as the good case', () => {
  const i = inspect(addon(proven({ reach: [] })));
  assert.deepEqual(i.can, []);
  assert.match(i.say, /asks for nothing/);
});

test('a made-up permission is dropped, not granted', () => {
  assert.deepEqual(addon(proven({ reach: ['read', 'telepathy', 'launch-missiles'] })).reach, ['read']);
});

// ─────────────────────────── installing ───────────────────────────

test('an addon that cannot be listed cannot be installed either', () => {
  const r = install(addon(proven({ evidence: null })), [], []);
  assert.equal(r.ok, false);
  assert.match(r.why, /cannot be installed/);
});

test('an addon needing something you do not have is REFUSED, not installed dead', () => {
  // Installing it anyway puts a thing in your bags that looks live and does nothing.
  const r = install(addon(proven({ id: 'offramp', needs: ['fall-remember'] })), [], [proven({ id: 'fall-remember', name: 'The Library' })]);
  assert.equal(r.ok, false);
  assert.match(r.why, /The Library/, 'the missing piece was named by id instead of by name: ' + r.why);
  assert.deepEqual(r.missing, ['fall-remember']);
  const ok = install(addon(proven({ id: 'offramp', needs: ['fall-remember'] })), ['fall-remember'], []);
  assert.equal(ok.ok, true);
});

test('installing the same thing twice is refused rather than doubled', () => {
  assert.equal(install(addon(proven()), ['witness'], []).ok, false);
});

// ─────────────────────────── THE PILE ───────────────────────────

test('PERMISSIONS ARE JUDGED TOGETHER — the reach that only exists because of the combination', () => {
  // ⚑ The failure every permission system still has. Each screen looked fine; nobody saw the pile.
  const notes = proven({ id: 'notes', name: 'Notekeeper', reach: ['read'] });
  const poster = proven({ id: 'poster', name: 'Poster', reach: ['net'] });

  assert.deepEqual(held([notes]).combined, [], 'one addon alone raised a combination');
  assert.deepEqual(held([poster]).combined, [], 'one addon alone raised a combination');

  const both = held([notes, poster]);
  const c = both.combined.find(x => x.needs.includes('read') && x.needs.includes('net'));
  assert.ok(c, 'read + net together was not noticed');
  assert.equal(c.emergent, true, 'it was not marked as something neither could do alone');
  assert.match(c.say, /nothing installed alone could do that/);
  // And it names who brought each half, so you know which one to remove.
  assert.deepEqual(c.by.find(b => b.reach === 'read').from, ['Notekeeper']);
  assert.deepEqual(c.by.find(b => b.reach === 'net').from, ['Poster']);
  assert.match(both.verdict, /no single one of them could/);
});

test('a combination one addon already had on its own is not called emergent', () => {
  // Crying wolf here trains people to click through the warning that mattered.
  const both = proven({ id: 'both', name: 'Both', reach: ['read', 'net'] });
  const h = held([both]);
  const c = h.combined.find(x => x.needs.includes('read') && x.needs.includes('net'));
  assert.ok(c, 'the pair was not reported at all');
  assert.equal(c.emergent, false, 'a pair one addon already had was called newly created');
  assert.match(h.verdict, /nothing they can do together that they could not do apart/);
});

test('nothing installed means nothing reached, and it says so', () => {
  const h = held([]);
  assert.deepEqual(h.reach, []);
  assert.deepEqual(h.combined, []);
  assert.match(h.verdict, /reaches nothing/);
});

test('the pile reports what needs a model, separately from what it can reach', () => {
  // Needing a model is a running cost and a dependency on somebody else's machine — not a fault,
  // and mixing it in with the permission warnings would make both easier to ignore.
  const h = held([proven({ id: 'a', name: 'Big', mind: 2 }), proven({ id: 'b', name: 'Small', mind: 1 }), proven({ id: 'c', name: 'Code', mind: 0 })]);
  assert.deepEqual(h.needsModel.map(x => x.name).sort(), ['Big', 'Small']);
  assert.ok(!h.needsModel.some(x => x.name === 'Code'), 'plain code was listed as needing a model');
});

test('what you have spent is the sum of what you actually installed', () => {
  assert.equal(held([proven({ id: 'a', price: 9 }), proven({ id: 'b', price: 5 }), proven({ id: 'c' })]).spent, 14);
});

// ─────────────────────────── built from the real estate ───────────────────────────

test('THE CATALOGUE IS BUILT FROM THE INDEX, never typed', () => {
  const items = [
    { name: 'witness', title: 'Witness', desc: 'breaks your code on purpose', url: 'https://x/witness/',
      proof: { tier: 'proven', workflow: 'gate', sha: '09a7e5947694' } },
    { name: 'secret', title: 'Secret', desc: 'private', private: true, proof: { tier: 'proven', workflow: 'ci' } },
    { name: 'bare', title: 'Bare', desc: 'nothing runs it', proof: { tier: 'prototype', workflow: null } },
  ];
  const cat = fromEstate(items, [{ id: 'proof', rooms: [{ u: 'https://x/witness/' }] }]);
  assert.equal(cat.length, 2, 'a private repo reached the public catalogue');
  assert.ok(!cat.some(a => a.id === 'secret'), 'a private repo was listed');
  const w = cat.find(a => a.id === 'witness');
  assert.equal(w.tier, TIER.proven);
  assert.equal(w.evidence, 'gate @ 09a7e59', 'the evidence lost its run: ' + w.evidence);
  assert.equal(w.wing, 'proof', 'the room was not placed in its wing');
  // Nothing ran it, so it has no evidence, so the store must refuse it.
  assert.equal(listable(cat.find(a => a.id === 'bare')).ok, false);
});

test('the estate catalogue survives a half-written index', () => {
  for (const junk of [null, undefined, 'items', 7, [null, 7, {}, { name: 'x' }]]) {
    const cat = fromEstate(junk, junk);
    assert.ok(Array.isArray(cat));
    assert.ok(Array.isArray(store(cat).listed));
  }
});

// ─────────────────────────── total ───────────────────────────

test('every rung of the ladder is explained in words a person could argue with', () => {
  for (const t of Object.values(TIER)) assert.ok(TIER_MEANS[t].length > 30, t + ' explains itself in a shrug');
  for (const r of Object.keys(REACH)) assert.ok(REACH[r].length > 10, r + ' has no plain meaning');
});

test('the whole client is total — a broken catalogue does not blank the shop', () => {
  const junk = [null, undefined, 7, 'addon', [], {}, true, { toString() { throw new Error('no'); } },
    { id: 'x', reach: 'everything', mind: 9, price: -5, tier: 99 }];
  for (const j of junk) {
    assert.doesNotThrow(() => addon(j));
    assert.doesNotThrow(() => listable(addon(j)));
    assert.doesNotThrow(() => inspect(addon(j)));
    assert.doesNotThrow(() => install(addon(j), j, j));
  }
  assert.doesNotThrow(() => store(junk));
  assert.doesNotThrow(() => held(junk));
  assert.equal(addon({ id: 'x', price: -5 }).price, 0, 'a negative price was accepted');
  assert.equal(addon({ id: 'x', mind: 9 }).mind, 0, 'an off-ladder mind was accepted');
});

test('the same catalogue always builds the same shop', () => {
  const c = [proven(), proven({ id: 'b', tier: TIER.works })];
  assert.deepEqual(store(c), store(c));
  assert.deepEqual(held(c), held(c));
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('a price of zero is free, and a negative price is not a discount', () => {
  assert.equal(addon({ id: 'x', price: 0 }).price, 0);
  assert.equal(addon({ id: 'x', price: -9 }).price, 0, 'a negative price survived');
  // Free must be listable at any rank; that is the whole free tier.
  assert.equal(listable(addon(proven({ tier: TIER.prototype, price: 0 }))).ok, true);
  // And a price of exactly zero must not be treated as "priced" and dragged through the proven rule.
  const v = listable(addon(proven({ tier: TIER.works, price: 0 })));
  assert.equal(v.ok, true, 'a free addon was held to the paid rule: ' + v.why);
  assert.match(v.why, /listed as works/, 'a free listing described itself as sold: ' + v.why);
});

test('the reason a listing passed says which case it passed under', () => {
  assert.match(listable(addon(proven({ price: 9 }))).why, /proven, with a run/);
  assert.match(listable(addon(proven({ price: 0 }))).why, /listed as proven/);
});

test('the shop counts each rung separately, and does not fold two rungs into one', () => {
  const s = store([
    proven({ id: 'a' }),
    proven({ id: 'b', tier: TIER.works }),
    proven({ id: 'c', tier: TIER.works }),
    proven({ id: 'd', tier: TIER.prototype }),
  ]);
  assert.equal(s.counts.proven, 1);
  assert.equal(s.counts.works, 2);
  assert.equal(s.counts.prototype, 1);
  assert.equal(Object.values(s.counts).reduce((a, b) => a + b, 0), s.listed.length,
    'the rung counts do not add up to what is on the shelf');
});

test('two addons at the same rank and price still come back in a fixed order', () => {
  // Two looks at one shop must agree, or nobody can screenshot it or link to a position in it.
  const s = store([proven({ id: 'z', name: 'zeta' }), proven({ id: 'a', name: 'alpha' })]);
  assert.deepEqual(s.listed.map(a => a.name), ['alpha', 'zeta']);
});

test('a nameless addon falls back to its id, and only then to a placeholder', () => {
  assert.equal(addon({ id: 'witness' }).name, 'witness', 'a missing name did not fall back to the id');
  assert.equal(addon({}).name, 'unnamed');
  assert.equal(addon({ id: 'w', name: 'Witness' }).name, 'Witness');
});

test('an addon with no page is null, never the string "undefined" in a link', () => {
  assert.equal(addon({ id: 'x' }).url, null);
  assert.equal(addon({ id: 'x', url: '' }).url, null, 'an empty url became a link');
  assert.equal(addon({ id: 'x', url: 'https://a/' }).url, 'https://a/');
});

test('installing nothing at all is refused with a sentence, not a crash', () => {
  for (const nothing of [null, undefined, {}, addon({})]) {
    const r = install(nothing, [], []);
    assert.equal(r.ok, false);
    assert.ok(r.why.length > 15, 'refused with a shrug: ' + r.why);
  }
});

test('a catalogue entry that is not an object is skipped, not turned into a row', () => {
  const cat = fromEstate([null, 7, 'witness', { name: 'real', title: 'Real', desc: 'a real one', proof: { tier: 'works', workflow: 'ci' } }], []);
  assert.equal(cat.length, 1);
  assert.equal(cat[0].id, 'real');
});

test('an item with no proof block at all is unranked rather than assumed', () => {
  const cat = fromEstate([{ name: 'x', title: 'X', desc: 'does a thing' }], []);
  assert.equal(cat[0].tier, null, 'an item with no proof was ranked anyway');
  assert.equal(cat[0].evidence, null);
  assert.equal(listable(cat[0]).ok, false, 'an unproved item reached the shelf');
});

test('an item titled by nothing falls back to its repo name', () => {
  const cat = fromEstate([{ name: 'fall-remember', desc: 'stores what was said', proof: { tier: 'works', workflow: 'ci' } }], []);
  assert.equal(cat[0].name, 'fall-remember', 'a missing title left the row nameless');
});

test('an addon spec that is not an object at all becomes an empty addon, not a crash', () => {
  for (const junk of [null, undefined, 7, 'addon', true, []]) {
    const a = addon(junk);
    assert.equal(a.id, null);
    assert.equal(a.name, 'unnamed');
    assert.deepEqual(a.reach, []);
  }
});


test('a wing full of holes does not stop the catalogue being built', () => {
  const cat = fromEstate(
    [{ name: 'w', title: 'W', desc: 'a thing', url: 'https://x/w/', proof: { tier: 'works', workflow: 'ci' } }],
    [null, 7, { id: 'a' }, { id: 'b', rooms: [null, 7, {}, { u: 'https://x/w/' }] }],
  );
  assert.equal(cat.length, 1);
  assert.equal(cat[0].wing, 'b', 'the room was not placed despite its wing being there');
});

test('an item whose proof block is not a block is unranked, not a crash', () => {
  for (const bad of [null, 7, 'proven', [], true]) {
    const cat = fromEstate([{ name: 'x', title: 'X', desc: 'does a thing', proof: bad }], []);
    assert.equal(cat.length, 1);
    assert.equal(cat[0].tier, null, 'proof:' + JSON.stringify(bad) + ' produced a rank');
    assert.equal(listable(cat[0]).ok, false);
  }
});

test('a real title wins over the repo name, not the other way round', () => {
  const cat = fromEstate([{ name: 'fall-remember', title: 'The Library', desc: 'stores what was said', proof: { tier: 'works', workflow: 'ci' } }], []);
  assert.equal(cat[0].name, 'The Library', 'the pretty name was thrown away for the repo slug');
  assert.equal(cat[0].id, 'fall-remember', 'the id must stay the repo name — it is what needs points at');
});

test('an estate item with a real page keeps its link, and one without gets none', () => {
  const withUrl = fromEstate([{ name: 'a', title: 'A', desc: 'x', url: 'https://x/a/', proof: { tier: 'works', workflow: 'ci' } }], []);
  assert.equal(withUrl[0].url, 'https://x/a/');
  const without = fromEstate([{ name: 'b', title: 'B', desc: 'x', url: null, proof: { tier: 'works', workflow: 'ci' } }], []);
  assert.equal(without[0].url, null, 'a missing page became the link "null"');
});
