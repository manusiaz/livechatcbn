// Server referensi untuk kontrak API Talita (docs/API.md). Tanpa dependensi, Node >= 18.
//
//   node mock-server/server.js
//   → http://localhost:8787/        demo widget
//   → http://localhost:8787/api/talita/*   endpoint
//
// Tanpa env apa pun, balasan chat berupa jawaban dummy (mode mock).
// Untuk meneruskan ke AI sungguhan (endpoint kompatibel OpenAI /chat/completions):
//   UPSTREAM_URL=https://ai.cbn.id/v1/chat/completions UPSTREAM_KEY=sk-... UPSTREAM_MODEL=qwen-plus node mock-server/server.js
//
// Semua payload masuk dicatat ke mock-server/data/*.jsonl supaya bentuk datanya bisa dicek
// (dan dipakai sebagai contoh ingest untuk dashboard).

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');
const SITE_KEYS = (process.env.SITE_KEYS || 'pk_test_demo').split(',');
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const { UPSTREAM_URL, UPSTREAM_KEY, UPSTREAM_MODEL = 'qwen-plus' } = process.env;

fs.mkdirSync(DATA, { recursive: true });
const log = (file, obj) => fs.appendFileSync(path.join(DATA, file + '.jsonl'), JSON.stringify(obj) + '\n');
const id = (p) => p + '_' + crypto.randomBytes(8).toString('hex');

// System prompt dibangun DI SERVER dari context yang dikirim widget (jangan pernah dari browser).
const SCOPE = {
  utama: 'ekosistem AI CBN: KoderU (Digital Worker, AI agent untuk tugas rutin), Ganatoken (platform token AI multi-model: Chinese Model seperti Qwen dari Alibaba Cloud, Western Model, Local Token; tagihan Rupiah, Pay As You Go), dan KoderPro (infrastruktur & platform AI: LLM as a Service, GPU as a Service, Lab as a Service, Custom AI Solution, Agentic Coding Platform)',
  koderpro: 'KoderPro dari CBN: LLM as a Service, GPU as a Service, Lab as a Service, Custom AI Solution, dan Agentic Coding Platform',
  ganatoken: 'Ganatoken / CBN AI Gateway: satu API untuk Chinese Model (Qwen dari Alibaba Cloud), Western Model, dan Local Token di infrastruktur CBN; smart routing, caching, fallback; tagihan Rupiah dengan Pay As You Go, Monthly Commitment, Enterprise Package, Dedicated Private Deployment',
  koderu: 'KoderU, Digital Worker dari CBN: AI agent untuk Customer Service Automation, Internal Helpdesk, HR Assistant, Finance Assistant, dan Workflow Automation'
};
const SUB = { utama: 'Asisten AI CBN', koderpro: 'KoderPro AI assistant', ganatoken: 'Asisten CBN AI Gateway', koderu: 'Asisten KoderU' };

function systemPrompt(variant, ctx = {}) {
  const p = ctx.profile || {};
  const rec = ctx.recommendations || {};
  return 'Kamu Talita, ' + (SUB[variant] || SUB.utama) + '. Kamu live agent di website, menjelaskan ' + (SCOPE[variant] || SCOPE.utama) + '. ' +
    'Profil pengunjung: industri ' + (p.industry || 'belum diketahui') + '; kebutuhan ' + (p.need || '-') + '; tahap AI ' + (p.ai_stage || '-') + '. ' +
    (rec.selected && rec.selected.length ? 'Layanan yang diminati: ' + rec.selected.join(', ') + '. ' : '') +
    'Jawab dalam Bahasa Indonesia yang hangat, ringkas, dan konkret, maksimal 4 kalimat, tanpa emoji, tanpa markdown. ' +
    'Jangan menyebut AI Factory. Jangan mengarang harga, SLA, nama pelanggan, atau angka. Untuk pertanyaan komersial, sarankan jadwalkan demo.';
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Talita-Key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) {
  return new Promise((ok, bad) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 64 * 1024) { bad(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
  });
}

async function upstreamReply(body, onDelta) {
  const messages = [{ role: 'system', content: systemPrompt(body.variant, body.context) }]
    .concat((body.history || []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })))
    .concat({ role: 'user', content: String(body.message || '') });
  const r = await fetch(UPSTREAM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + UPSTREAM_KEY },
    body: JSON.stringify({ model: UPSTREAM_MODEL, messages, stream: !!onDelta, temperature: 0.4, max_tokens: 400 })
  });
  if (!r.ok) throw new Error('upstream ' + r.status + ' ' + (await r.text()).slice(0, 200));
  if (!onDelta) { const j = await r.json(); return j.choices?.[0]?.message?.content || ''; }
  const dec = new TextDecoder(); let buf = '', full = '';
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      const d = line.replace(/^data:\s*/, '').trim();
      if (!line.startsWith('data:') || !d || d === '[DONE]') continue;
      try { const t = JSON.parse(d).choices?.[0]?.delta?.content || ''; if (t) { full += t; onDelta(t); } } catch (_) { /* skip */ }
    }
  }
  return full;
}

function mockReply(body) {
  const p = (body.context && body.context.profile) || {};
  return 'Ini balasan mock untuk: "' + String(body.message).slice(0, 80) + '". ' +
    (p.industry ? 'Saya catat Anda di industri ' + p.industry + '. ' : '') +
    'Set UPSTREAM_URL supaya dijawab AI sungguhan. Untuk detail komersial, sebaiknya kita jadwalkan demo.';
}

const routes = {
  async session(body) {
    const session_id = id('s');
    log('sessions', { session_id, received_at: new Date().toISOString(), ...body });
    return { session_id };
  },
  async event(body) { log('events', { received_at: new Date().toISOString(), ...body }); return null; },
  async lead(body) {
    const l = body.lead || {};
    if (!l.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(l.email || '') || !l.phone) { const e = new Error('invalid lead'); e.code = 422; throw e; }
    const lead_id = id('l');
    log('leads', { lead_id, received_at: new Date().toISOString(), ...body });
    return { lead_id };
  }
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/talita/')) {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    if (!SITE_KEYS.includes(req.headers['x-talita-key'])) return send(res, 401, { error: 'invalid_site_key' });
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, 400, { error: 'bad_json' }); }
    const name = url.pathname.slice('/api/talita/'.length);

    if (name === 'message') {
      if (!body.session_id || !String(body.message || '').trim()) return send(res, 422, { error: 'message_required' });
      const message_id = id('m');
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream');
      const done = (reply, error) => log('messages', { received_at: new Date().toISOString(), request: body, reply_message_id: message_id, reply, error: error || undefined });
      try {
        if (wantsStream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          const write = (o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
          let reply;
          if (UPSTREAM_URL) reply = await upstreamReply(body, (t) => write({ delta: t }));
          else { reply = mockReply(body); for (const w of reply.match(/\S+\s*/g)) { write({ delta: w }); await new Promise((r) => setTimeout(r, 25)); } }
          write({ message_id, done: true }); res.write('data: [DONE]\n\n'); res.end();
          return done(reply);
        }
        const reply = UPSTREAM_URL ? await upstreamReply(body) : mockReply(body);
        send(res, 200, { reply, message_id });
        return done(reply);
      } catch (e) {
        done(null, e.message);
        if (res.headersSent) return res.end();
        return send(res, 502, { error: 'upstream_failed' });
      }
    }

    if (!routes[name]) return send(res, 404, { error: 'not_found' });
    try {
      const out = await routes[name](body);
      if (out == null) { res.writeHead(204); return res.end(); }
      return send(res, 200, out);
    } catch (e) { return send(res, e.code || 500, { error: e.message }); }
  }

  // Static: demo + widget
  const rel = url.pathname === '/' ? '/demo/index.html' : url.pathname;
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(ROOT + path.sep) || file.startsWith(DATA)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Talita mock API → http://localhost:' + PORT + (UPSTREAM_URL ? ' (upstream: ' + UPSTREAM_URL + ')' : ' (mode mock)')));
