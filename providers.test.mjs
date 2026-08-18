// Tests for talking to a paid model with your own key.
//
// One failure here is worse than every other failure in this repo put together: a key going
// somewhere it was not issued by. Most of what follows is about that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDERS, providerOf, looksRight, buildCall, readReply, goingTo, explainStatus } from './providers.mjs';

const AKEY = 'sk-ant-api03-abcdefghijklmnop';
const GKEY = 'AIzaSyABCDEFGHIJKLMNOPQRSTUV';

// ─────────────────────────── the key goes to its own provider or nowhere ───────────────────────────

test('A KEY IS ONLY EVER SENT TO THE HOST THAT ISSUED IT', () => {
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const key = id === 'anthropic' ? AKEY : GKEY;
    const { url } = buildCall(id, key, { user: 'hello' });
    assert.equal(new URL(url).host, p.host, `${id} was about to post to ${new URL(url).host}`);
    assert.equal(new URL(url).protocol, 'https:', `${id} was about to send a key over plain http`);
    assert.equal(goingTo(id, url).ok, true);
  }
});

test('and the check refuses any other host, however plausible', () => {
  for (const bad of ['https://api.anthropic.com.evil.test/v1/messages', 'https://generativelanguage.googleapis.co/x',
    'http://api.anthropic.com/v1/messages'.replace('http', 'https').replace('anthropic', 'anthropiic'),
    'https://localhost/v1/messages', 'https://api.openai.com/v1/messages']) {
    const v = goingTo('anthropic', bad);
    assert.equal(v.ok, false, 'a Claude key was cleared to go to ' + bad);
    assert.match(v.why, /refusing to send/);
  }
  assert.equal(goingTo('anthropic', 'not a url').ok, false);
  assert.equal(goingTo('nobody', 'https://api.anthropic.com/').ok, false);
});

test('the caller cannot choose where a key goes — the host is not an input', () => {
  // Everything a caller controls goes into the BODY or a header. If a caller could influence the
  // URL's host, every other rule here would be decoration.
  const { url } = buildCall('anthropic', AKEY, { user: 'https://evil.test x', system: 'https://evil.test' });
  assert.equal(new URL(url).host, PROVIDERS.anthropic.host);
});

test('an unknown provider is refused rather than guessed at', () => {
  for (const bad of ['openai', '', null, undefined, 'ANTHROPIC', 7]) {
    assert.throws(() => buildCall(bad, AKEY, { user: 'x' }), /no such provider|no .* key/);
  }
  assert.equal(providerOf('nope'), null);
});

test('a missing key is refused before anything is built', () => {
  for (const empty of ['', '   ', null, undefined]) {
    assert.throws(() => buildCall('anthropic', empty, { user: 'x' }), /key/);
  }
});

// ─────────────────────────── the calls themselves ───────────────────────────

test('the Claude call carries the header a browser needs, or it will never leave the tab', () => {
  const { init } = buildCall('anthropic', AKEY, { user: 'hello', system: 'be brief' });
  assert.equal(init.headers['x-api-key'], AKEY);
  assert.equal(init.headers['anthropic-version'], '2023-06-01');
  assert.equal(init.headers['anthropic-dangerous-direct-browser-access'], 'true',
    'without this the browser call is refused by CORS and looks like a network fault');
  const body = JSON.parse(init.body);
  assert.equal(body.system, 'be brief');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hello' }]);
  assert.ok(body.max_tokens > 0);
});

test('the Gemini call puts the key where Google wants it, and encodes it', () => {
  const odd = 'AIza+needs/encoding=';
  const { url, init } = buildCall('google', odd, { user: 'hello', system: 'be brief' });
  assert.ok(url.includes(encodeURIComponent(odd)), 'the key went into the URL unencoded');
  assert.ok(!url.includes('+needs/'), 'an unencoded key would break the request or leak oddly');
  const body = JSON.parse(init.body);
  assert.equal(body.systemInstruction.parts[0].text, 'be brief');
  assert.equal(body.contents[0].parts[0].text, 'hello');
});

test('no system line means no system field, rather than an empty one', () => {
  assert.equal(JSON.parse(buildCall('anthropic', AKEY, { user: 'x' }).init.body).system, undefined);
  assert.equal(JSON.parse(buildCall('google', GKEY, { user: 'x' }).init.body).systemInstruction, undefined);
});

// ─────────────────────────── reading the reply ───────────────────────────

test('a real reply comes back as text', () => {
  assert.deepEqual(readReply('anthropic', { content: [{ type: 'text', text: 'hello there' }] }), { ok: true, text: 'hello there' });
  assert.deepEqual(readReply('google', { candidates: [{ content: { parts: [{ text: 'hello there' }] } }] }), { ok: true, text: 'hello there' });
});

test('AN ERROR BODY IS AN ERROR, even when the transport said everything was fine', () => {
  // Reading past it and returning an empty string shows a blank answer and no reason for it.
  const a = readReply('anthropic', { error: { message: 'invalid x-api-key' }, content: [] });
  assert.equal(a.ok, false);
  assert.match(a.why, /invalid x-api-key/);
  assert.equal(readReply('google', { error: { message: 'API key not valid' } }).ok, false);
});

test('an empty answer is reported as empty, never as a successful blank', () => {
  for (const body of [{}, { content: [] }, { content: [{ type: 'image' }] }, { candidates: [] }, null, 'reply', 7]) {
    const r = readReply('anthropic', body);
    assert.equal(r.ok, false, JSON.stringify(body) + ' read as a successful reply');
    assert.ok(r.why.length > 10);
  }
});

test('a reply the model cut short says WHY it stopped', () => {
  const r = readReply('google', { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] });
  assert.equal(r.ok, false);
  assert.match(r.why, /SAFETY/, 'a filtered reply looked like an empty one: ' + r.why);
});

test('several text parts are joined, not just the first', () => {
  const r = readReply('anthropic', { content: [{ type: 'text', text: 'one ' }, { type: 'text', text: 'two' }] });
  assert.equal(r.text, 'one two');
});

// ─────────────────────────── saying what went wrong ───────────────────────────

test('a bad key is explained as a bad key, with where to get another', () => {
  for (const s of [401, 403]) {
    const say = explainStatus('anthropic', s);
    assert.match(say, /did not accept that key/);
    assert.match(say, /console\.anthropic\.com/);
  }
  assert.match(explainStatus('google', 429), /rate-limit/);
  assert.match(explainStatus('google', 500), /their end/);
  assert.match(explainStatus('anthropic', 400), /this client's fault/, 'a client bug was blamed on the user');
});

test('a rate limit says nothing was charged, because nothing was', () => {
  assert.match(explainStatus('anthropic', 429), /nothing was charged/);
});

test('a key that looks like the wrong provider warns without refusing', () => {
  // Formats change. Refusing a valid key because it did not match a pattern is worse than a note.
  const w = looksRight('anthropic', GKEY);
  assert.equal(w.ok, true);
  assert.match(w.warn, /usually start differently/);
  assert.equal(looksRight('anthropic', AKEY).warn, undefined);
  assert.equal(looksRight('anthropic', 'short').ok, false);
  assert.equal(looksRight('nobody', AKEY).ok, false);
});

test('every provider says where to get a key and what it is called', () => {
  for (const p of Object.values(PROVIDERS)) {
    assert.ok(p.name && p.where && p.model && p.host);
    assert.ok(!p.host.includes('/'), 'a host with a path in it would break the goingTo check');
  }
});


// ─── the boundaries the mutation gate proved nothing was holding ───

test('the shortest thing that counts as a key is exact', () => {
  assert.equal(looksRight('anthropic', 'x'.repeat(9)).ok, true, 'a key of exactly nine was refused');
  assert.equal(looksRight('anthropic', 'x'.repeat(8)).ok, false, 'eight characters counted as a key');
});

test('a reply part that is not a text part is skipped, not crashed on', () => {
  const r = readReply('anthropic', { content: [null, 7, { type: 'text', text: 'real' }, { type: 'tool_use' }] });
  assert.deepEqual(r, { ok: true, text: 'real' });
});

test('a Gemini reply with a broken shape is reported, not crashed on', () => {
  for (const cand of [{ content: null }, { content: 'text' }, { content: { parts: 'no' } }, {}, null]) {
    const r = readReply('google', { candidates: [cand] });
    assert.equal(r.ok, false, JSON.stringify(cand) + ' read as a good reply');
  }
});

test('a finish reason only speaks up when there is no text — a complete answer is a complete answer', () => {
  const done = readReply('google', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'all good' }] } }] });
  assert.deepEqual(done, { ok: true, text: 'all good' }, 'a finished reply was reported as stopped');
});

test('an error with no message still comes back as an error, not as a blank success', () => {
  for (const err of [{ status: 'PERMISSION_DENIED' }, { code: 401 }, {}, 'nope', true]) {
    const r = readReply('anthropic', { error: err, content: [{ type: 'text', text: 'ignore me' }] });
    assert.equal(r.ok, false, 'error ' + JSON.stringify(err) + ' was read past');
    assert.ok(r.why.length > 5, 'an error came back with nothing to say');
  }
});


test('an error names the most human field it has, in order', () => {
  // Providers send some mixture of message, status and code. A person can act on the first and
  // barely on the last, so the order matters and is asserted rather than assumed.
  const both = readReply('anthropic', { error: { status: 'PERMISSION_DENIED', code: 403 } });
  assert.match(both.why, /PERMISSION_DENIED/, 'a readable status was passed over for a bare number: ' + both.why);
  assert.doesNotMatch(both.why, /403/);
  const all = readReply('anthropic', { error: { message: 'your credit balance is too low', status: 'X', code: 400 } });
  assert.match(all.why, /credit balance/, 'the sentence lost to a status code: ' + all.why);
  const only = readReply('google', { error: { code: 429 } });
  assert.match(only.why, /429/, 'the last resort was dropped too');
  assert.match(only.why, /Gemini returned an error/, 'a bare code was shown with no sentence round it');
});
