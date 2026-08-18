// The world is data, so the risk is not a wrong branch — it is a door that leads nowhere.
// A room with a dead link looks perfectly fine on the map and wastes the one visit somebody makes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ⚑ THE WORLD IS DATA, AND IT LIVES IN A DATA FILE. It used to be a .mjs, which put it in the gated
// module surface — where a mutation gate correctly reports that a file of pure data has nothing in
// it to break, and therefore was never tested. Data belongs in JSON, checked by the integrity tests
// below; only things with behaviour belong in the surface that gets mutated.
const world = JSON.parse(readFileSync(new URL('./rooms.json', import.meta.url), 'utf8'));
const { wings: WINGS, wayIn: WAY_IN, roomCount: ROOM_COUNT } = world;

const rooms = WINGS.flatMap(w => w.rooms.map(r => ({ ...r, wing: w.id })));

test('the world is not empty, and it counts itself honestly', () => {
  assert.ok(WINGS.length >= 4, 'only ' + WINGS.length + ' wings');
  assert.equal(ROOM_COUNT, rooms.length, 'the stated room count is not the number of rooms');
});

test('EVERY ROOM HAS A DOOR THAT GOES SOMEWHERE', () => {
  for (const r of rooms) {
    assert.ok(r.u && /^https?:\/\//.test(r.u), `${r.n} has no real link: ${r.u}`);
    assert.doesNotMatch(r.u, /undefined|null|__/, `${r.n} has a broken link: ${r.u}`);
  }
});

test('no two rooms are the same door', () => {
  const urls = rooms.map(r => r.u);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  assert.deepEqual([...new Set(dupes)], [], 'the same place appears twice on the map');
});

test('every room says what a person DOES there, in plain words', () => {
  // The map is the one place estate vocabulary must never appear: somebody reading it has not
  // agreed to learn anything yet.
  const jargon = /\b(kernel|organ|conductor|κ|kappa|mutation|witness|konomi|shard|chamber)\b/i;
  for (const r of rooms) {
    assert.ok(r.n && r.n.length > 2, 'a room with no name');
    assert.ok(r.s && r.s.length > 25, `${r.n} describes itself in ${(r.s || '').length} characters`);
    const hit = r.s.match(jargon);
    assert.equal(hit, null, hit ? `${r.n} uses in-house words: "${hit[0]}"` : '');
  }
});

test('every wing says what it is for', () => {
  for (const w of WINGS) {
    assert.ok(w.id && w.icon && w.title, 'a wing missing its basics');
    assert.ok(w.blurb && w.blurb.length > 20, `${w.title} has no real blurb`);
    assert.ok(w.rooms.length > 0, `${w.title} is empty`);
  }
});

test('exactly one room is marked as where to start', () => {
  // Two "start here" markers is no marker at all, and none leaves a newcomer guessing.
  const first = rooms.filter(r => r.first);
  assert.equal(first.length, 1, first.length + ' rooms claim to be the starting point');
});

test('the way in is real too', () => {
  assert.ok(Array.isArray(WAY_IN) && WAY_IN.length > 0, 'there is no way in');
  for (const w of WAY_IN) {
    assert.ok(w.u && /^https?:\/\//.test(w.u), `${w.n} has no real link`);
    assert.ok(w.s && w.s.length > 15, `${w.n} says nothing about itself`);
  }
});
