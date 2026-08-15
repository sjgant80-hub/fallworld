// build-index.mjs — write the world into the front page from rooms.mjs.
//
// ⚑ GENERATED, NEVER TYPED. The blueprint and the front page read the SAME rooms.mjs. Hand-copying
// the room list into the HTML is how a visitor ends up meeting two different worlds depending which
// link they followed.
import { readFileSync, writeFileSync } from 'node:fs';
import { WINGS, WAY_IN, ROOM_COUNT } from './rooms.mjs';
// ⚑ The price on each wing comes from the GATED kernel, not from this file. What the page tells a
// visitor and what the code enforces are then the same statement — and pass.mjs is the thing a
// mutation gate has already tried to break.
import { WING_PRICE, OWNED_KINDS, FLOW_KINDS } from './pass.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRICE_LABEL = { free: 'free', pass: 'Guild Pass' };

const html = `
<div class="wayin">${WAY_IN.map(w => `
  <a href="${esc(w.u)}"><span class="n">${esc(w.n)}</span><span class="s">${esc(w.s)}</span></a>`).join('')}
</div>
${WINGS.map(w => `
<div class="wing">
  <h3><span class="ic">${esc(w.icon)}</span>${esc(w.title)}<span class="price ${esc(WING_PRICE[w.id] || 'free')}">${esc(PRICE_LABEL[WING_PRICE[w.id]] || 'free')}</span></h3>
  <p class="wb">${esc(w.blurb)}</p>
  <div class="rooms">${w.rooms.map(r => `
    <a class="room${r.first ? ' first' : ''}" href="${esc(r.u)}">
      <span class="n">${esc(r.n)}</span>
      <span class="s">${esc(r.s)}</span>${r.first ? '<span class="tag">start here</span>' : ''}
    </a>`).join('')}
  </div>
</div>`).join('')}
<div class="pricing" id="pricing">
  <h3>What costs money</h3>
  <p class="psub">Most of it doesn't. Here is the whole of it, in three lines.</p>
  <div class="plans">
    <div class="plan">
      <span class="pn">Free</span>
      <span class="pp">£0</span>
      <span class="pd">The games, your notes, your machine, and a say in the rules. Install it, own your didy, play forever. No account needed.</span>
    </div>
    <div class="plan">
      <span class="pn">Buy a tool</span>
      <span class="pp">once</span>
      <span class="pd">Want one premium tool and nothing else? Buy it. It is yours, it works offline, and nobody can switch it off — including us.</span>
    </div>
    <div class="plan featured">
      <span class="pn">Guild Pass</span>
      <span class="pp">monthly</span>
      <span class="pd">Checking that keeps running, build credit each month, and guild standing. The Pass buys the flow, never the things you already have.</span>
    </div>
  </div>
  <p class="cancel"><strong>If you cancel</strong> you keep ${OWNED_KINDS.length} kinds of thing —
  your didy and everything it has learned, every tool you bought, every card you minted, your notes,
  and the $KONO you earned. You stop ${FLOW_KINDS.length}: the monthly credit, the active checking,
  guild standing, and the herd earning while you sleep. Nothing you own is behind the Pass. That is
  the difference, and the code that enforces it is checked by a machine, not promised here.</p>
</div>

<h3 class="gearhead">And everything you carry</h3>
<p class="gearsub">${ROOM_COUNT} places above. Below is the gear — every tool in the estate, and how
finished each one actually is.</p>
`;

const OPEN = '<div class="world" id="world">';
// ⚑ Matched with a pattern rather than a literal string, because the closing marker spans line
// breaks and this repository gets checked out with CRLF on Windows and LF elsewhere. A literal
// '\n\n' silently matches nothing on one of those, and the builder then refuses to run on a page
// that is perfectly fine — which is exactly how it failed the first time this was written.
const CLOSE_RE = /<\/div>\r?\n\r?\n<div class="cols">/;

const page = readFileSync('index.html', 'utf8');
const a = page.indexOf(OPEN);
const m = a < 0 ? null : CLOSE_RE.exec(page.slice(a));
const b = m ? a + m.index : -1;
if (a < 0 || b < 0) throw new Error('the world markers are missing from index.html — refusing to guess where the world goes');

const out = page.slice(0, a + OPEN.length) + html + page.slice(b);
writeFileSync('index.html', out);

// A page that silently rendered no rooms would still look fine at a glance. Check.
const check = readFileSync('index.html', 'utf8');
const rooms = (check.match(/class="room/g) || []).length;
if (rooms < ROOM_COUNT) throw new Error(`only ${rooms} of ${ROOM_COUNT} rooms reached the page`);
console.log(`index.html — ${ROOM_COUNT} rooms in ${WINGS.length} wings, ${(out.length / 1024).toFixed(0)}KB`);
