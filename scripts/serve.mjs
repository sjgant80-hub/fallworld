// Local preview only. GitHub Pages serves these files directly — this exists so the page can be
// checked before it ships, because fetch('world.json') cannot work from a file:// URL.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.mjs': 'text/javascript', '.css': 'text/css' };

createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(DIR, path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
  if (!file.startsWith(DIR) || !existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8123, () => console.log('fallworld preview on http://localhost:8123'));
