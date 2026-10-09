// Server lokal: logika API yang sama dengan Vercel Functions (lib/talita.js) + file statis demo.
//
//   node mock-server/server.js   → http://localhost:8787
//
// Tanpa SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, payload dicatat ke mock-server/data/*.jsonl.
// Tanpa UPSTREAM_URL, balasan chat berupa mock. Daftar env lengkap ada di lib/talita.js.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApi } = require('../lib/talita');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');

const api = createApi({
  fallbackWrite(kind, row) {
    fs.mkdirSync(DATA, { recursive: true });
    for (const r of [].concat(row)) fs.appendFileSync(path.join(DATA, kind + '.jsonl'), JSON.stringify({ received_at: new Date().toISOString(), ...r }) + '\n');
  }
});

function readBody(req) {
  return new Promise((ok) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 64 * 1024) req.destroy(); });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (_) { ok(null); } });
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8' };
const STATIC = [path.join(ROOT, 'widget'), path.join(ROOT, 'demo')];

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/talita/')) {
    const body = req.method === 'POST' ? await readBody(req) : {};
    return api.handle(url.pathname.slice('/api/talita/'.length), req, res, body);
  }
  const file = path.join(ROOT, path.normalize(url.pathname === '/' ? '/demo/index.html' : url.pathname));
  if (!STATIC.some((d) => file.startsWith(d + path.sep))) { res.writeHead(404); return res.end('not found'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Talita → http://localhost:' + PORT + ' · storage: ' + api.storeName + ' · AI: ' + (process.env.UPSTREAM_URL || 'mock')));
