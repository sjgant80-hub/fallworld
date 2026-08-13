// build-index.mjs — write the world into the front page from rooms.mjs.
//
// ⚑ GENERATED, NEVER TYPED. The blueprint and the front page read the SAME rooms.mjs. Hand-copying
// the room list into the HTML is how a visitor ends up meeting two different worlds depending which
// link they followed.
import { readFileSync, writeFileSync } from 'node:fs';
import { WINGS, WAY_IN, ROOM_COUNT } from './rooms.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const html = `
<div class="wayin">${WAY_IN.map(w => `
  <a href="${esc(w.u)}"><span class="n">${esc(w.n)}</span><span class="s">${esc(w.s)}</span></a>`).join('')}
</div>
${WINGS.map(w => `
<div class="wing">
  <h3><span class="ic">${esc(w.icon)}</span>${esc(w.title)}</h3>
  <p class="wb">${esc(w.blurb)}</p>
  <div class="rooms">${w.rooms.map(r => `
    <a class="room${r.first ? ' first' : ''}" href="${esc(r.u)}">
      <span class="n">${esc(r.n)}</span>
      <span class="s">${esc(r.s)}</span>${r.first ? '<span class="tag">start here</span>' : ''}
    </a>`).join('')}
  </div>
</div>`).join('')}
<h3 class="gearhead">And everything you carry</h3>
<p class="gearsub">${ROOM_COUNT} places above. Below is the gear — every tool in the estate, and how
finished each one actually is.</p>
`;

const OPEN = '<div class="world" id="world">';
const CLOSE = '</div>\n\n<div class="cols">';

const page = readFileSync('index.html', 'utf8');
const a = page.indexOf(OPEN);
const b = page.indexOf(CLOSE, a);
if (a < 0 || b < 0) throw new Error('the world markers are missing from index.html — refusing to guess where the world goes');

const out = page.slice(0, a + OPEN.length) + html + page.slice(b);
writeFileSync('index.html', out);

// A page that silently rendered no rooms would still look fine at a glance. Check.
const check = readFileSync('index.html', 'utf8');
const rooms = (check.match(/class="room/g) || []).length;
if (rooms < ROOM_COUNT) throw new Error(`only ${rooms} of ${ROOM_COUNT} rooms reached the page`);
console.log(`index.html — ${ROOM_COUNT} rooms in ${WINGS.length} wings, ${(out.length / 1024).toFixed(0)}KB`);
