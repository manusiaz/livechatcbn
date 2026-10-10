// Logika API Talita, dipakai bersama oleh Vercel Functions (api/talita/[action].js)
// dan server lokal (mock-server/server.js). Kontrak: docs/API.md.
//
// Env:
//   SITE_KEYS                  daftar site key publik, dipisah koma (default: pk_test_demo)
//   ALLOW_ORIGIN               origin yang boleh memanggil API, dipisah koma, atau * (default)
//   SUPABASE_URL               https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  secret key (sb_secret_... atau JWT service_role lama). Tanpa ini data hanya di-log.
//   UPSTREAM_URL               endpoint kompatibel OpenAI /chat/completions. Tanpa ini balasan mock.
//   UPSTREAM_KEY, UPSTREAM_MODEL
//   DASHBOARD_URL              API dashboard yang menerima setiap record (POST JSON). Opsional.
//   DASHBOARD_KEY              dikirim sebagai `Authorization: Bearer <key>` ke DASHBOARD_URL

const crypto = require('crypto');

const env = (k, d) => (process.env[k] == null || process.env[k] === '' ? d : process.env[k]);
const id = (p) => p + '_' + crypto.randomBytes(8).toString('hex');
const nowIso = () => new Date().toISOString();
const VARIANTS = ['utama', 'koderpro', 'ganatoken', 'koderu'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{8,15}$/;
const str = (v, max = 2000) => (v == null ? null : String(v).slice(0, max));

// ── System prompt (dibangun di server, bukan dari browser) ────────────────
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
    (Array.isArray(rec.selected) && rec.selected.length ? 'Layanan yang diminati: ' + rec.selected.join(', ') + '. ' : '') +
    'Jawab dalam Bahasa Indonesia yang hangat, ringkas, dan konkret, maksimal 4 kalimat, tanpa emoji, tanpa markdown. ' +
    'Jangan menyebut AI Factory. Jangan mengarang harga, SLA, nama pelanggan, atau angka. Untuk pertanyaan komersial, sarankan jadwalkan demo.';
}

// ── AI upstream ───────────────────────────────────────────────────────────
async function upstreamReply(body, onDelta) {
  const messages = [{ role: 'system', content: systemPrompt(body.variant, body.context) }]
    .concat((Array.isArray(body.history) ? body.history : []).slice(-20).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: str(m.content, 4000) || '' })))
    .concat({ role: 'user', content: str(body.message, 4000) });
  const r = await fetch(env('UPSTREAM_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env('UPSTREAM_KEY', '') },
    body: JSON.stringify({ model: env('UPSTREAM_MODEL', 'qwen-plus'), messages, stream: !!onDelta, temperature: 0.4, max_tokens: 400 }),
    signal: AbortSignal.timeout(45000)
  });
  if (!r.ok) throw new Error('upstream ' + r.status + ' ' + (await r.text()).slice(0, 200));
  if (!onDelta) { const j = await r.json(); return j.choices?.[0]?.message?.content || ''; }
  const dec = new TextDecoder(); let buf = '', full = '';
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const d = line.slice(5).trim();
      if (!d || d === '[DONE]') continue;
      try { const t = JSON.parse(d).choices?.[0]?.delta?.content || ''; if (t) { full += t; onDelta(t); } } catch (_) { /* baris bukan JSON */ }
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

// ── Penyimpanan ───────────────────────────────────────────────────────────
// Supabase lewat REST (PostgREST), tanpa dependensi. Kalau env belum di-set, pakai fallback (log).
function supabaseStore() {
  const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key; // JWT service_role lama
  async function insert(table, rows, prefer = 'return=minimal', query = '') {
    const r = await fetch(url.replace(/\/+$/, '') + '/rest/v1/' + table + query, {
      method: 'POST', headers: { ...headers, Prefer: prefer }, body: JSON.stringify(rows), signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error('supabase ' + table + ' ' + r.status + ' ' + (await r.text()).slice(0, 300));
  }
  return {
    name: 'supabase',
    upsertSession: (row) => insert('talita_sessions', row, 'resolution=merge-duplicates,return=minimal', '?on_conflict=id'),
    // Session minimal untuk id yang belum pernah tercatat (mis. widget memakai id lokal karena /session gagal).
    touchSession: (row) => insert('talita_sessions', row, 'resolution=ignore-duplicates,return=minimal', '?on_conflict=id'),
    insertLead: (row) => insert('talita_leads', row),
    insertMessages: (rows) => insert('talita_messages', rows),
    insertEvent: (row) => insert('talita_events', row)
  };
}

// Teruskan setiap record ke API dashboard milik tim lain: POST DASHBOARD_URL {type, record, sent_at}.
function dashboardStore() {
  const url = env('DASHBOARD_URL'), key = env('DASHBOARD_KEY');
  if (!url) return null;
  const post = (type) => async (record) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
      body: JSON.stringify({ type, record, sent_at: nowIso() }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error('dashboard ' + type + ' ' + r.status);
  };
  const messages = post('message');
  return {
    name: 'dashboard',
    upsertSession: post('session'), touchSession: async () => {}, insertLead: post('lead'),
    insertMessages: async (rows) => { for (const row of rows) await messages(row); },
    insertEvent: post('event')
  };
}

// Tulis ke semua tujuan yang aktif. Satu tujuan gagal tidak menggagalkan yang lain;
// request hanya gagal kalau semua tujuan gagal.
function multiStore(stores) {
  if (stores.length === 1) return stores[0];
  const all = (fn) => async (row) => {
    const res = await Promise.allSettled(stores.map((st) => st[fn](row)));
    res.forEach((r, i) => { if (r.status === 'rejected') console.error('[talita]', stores[i].name, fn, r.reason.message); });
    if (res.every((r) => r.status === 'rejected')) throw res[0].reason;
  };
  return { name: stores.map((st) => st.name).join('+'), upsertSession: all('upsertSession'), touchSession: all('touchSession'), insertLead: all('insertLead'), insertMessages: all('insertMessages'), insertEvent: all('insertEvent') };
}

function logStore(write) {
  const w = (kind) => async (row) => write(kind, row);
  return { name: 'log', upsertSession: w('sessions'), touchSession: async () => {}, insertLead: w('leads'), insertMessages: w('messages'), insertEvent: w('events') };
}

// ── Handler ───────────────────────────────────────────────────────────────
function httpError(code, msg) { const e = new Error(msg); e.status = code; return e; }

function createApi(opts = {}) {
  const targets = [supabaseStore(), dashboardStore()].filter(Boolean);
  const store = targets.length ? multiStore(targets) : logStore(opts.fallbackWrite || ((kind, row) => console.log('[talita]', kind, JSON.stringify(row))));
  const siteKeys = env('SITE_KEYS', 'pk_test_demo').split(',').map((s) => s.trim()).filter(Boolean);
  const allow = env('ALLOW_ORIGIN', '*').split(',').map((s) => s.trim()).filter(Boolean);

  function corsHeaders(origin) {
    const ok = allow.includes('*') ? '*' : (origin && allow.includes(origin) ? origin : null);
    const h = { 'Access-Control-Allow-Headers': 'Content-Type, X-Talita-Key', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    if (ok) h['Access-Control-Allow-Origin'] = ok;
    return h;
  }

  const sessionRow = (sid, b) => ({ id: sid, visitor_id: str(b.visitor_id, 100) || 'unknown', variant: VARIANTS.includes(b.variant) ? b.variant : 'utama' });
  const requireSession = (b) => { const sid = str(b.session_id, 100); if (!sid) throw httpError(422, 'session_id_required'); return sid; };

  const actions = {
    async session(b) {
      const sid = id('s'), page = b.page || {}, c = b.client || {};
      await store.upsertSession({
        ...sessionRow(sid, b),
        page_url: str(page.url), page_path: str(page.path, 500), page_title: str(page.title, 500), referrer: str(page.referrer),
        utm: b.utm && typeof b.utm === 'object' ? b.utm : {},
        locale: str(c.locale, 50), timezone: str(c.timezone, 100), screen: str(c.screen, 50), user_agent: str(c.user_agent, 500),
        metadata: b.metadata && typeof b.metadata === 'object' ? b.metadata : {},
        started_at: b.started_at || nowIso()
      });
      return { session_id: sid };
    },

    async event(b) {
      const sid = requireSession(b);
      await store.touchSession(sessionRow(sid, b));
      await store.insertEvent({ session_id: sid, visitor_id: str(b.visitor_id, 100), variant: str(b.variant, 30), type: str(b.type, 60) || 'unknown', data: b.data && typeof b.data === 'object' ? b.data : {}, at: b.at || nowIso() });
      return null;
    },

    async lead(b) {
      const sid = requireSession(b), l = b.lead || {}, p = b.profile || {};
      const name = String(l.name || '').trim(), email = String(l.email || '').trim(), phone = String(l.phone || '').trim(), company = String(l.company || '').trim();
      const source = ['recommendation', 'chat_form', 'chat_inline'].includes(b.source) ? b.source : 'chat_form';
      if (!name || !EMAIL_RE.test(email) || !PHONE_RE.test(phone) || (source !== 'chat_inline' && !company)) throw httpError(422, 'invalid_lead');
      const lead_id = id('l');
      await store.touchSession(sessionRow(sid, b));
      await store.insertLead({
        id: lead_id, session_id: sid, visitor_id: str(b.visitor_id, 100), variant: VARIANTS.includes(b.variant) ? b.variant : 'utama', source,
        name: name.slice(0, 200), email: email.slice(0, 200), company: company.slice(0, 200), phone: phone.slice(0, 40),
        industry: str(p.industry, 100), need: str(p.need, 200), ai_stage: str(p.ai_stage, 100),
        selected_services: (Array.isArray(b.selected_services) ? b.selected_services : []).slice(0, 20).map((x) => String(x).slice(0, 200)),
        recommended_services: (Array.isArray(b.recommended_services) ? b.recommended_services : []).slice(0, 20).map((x) => String(x).slice(0, 200)),
        consent: b.consent && typeof b.consent === 'object' ? b.consent : {},
        page_url: str(b.page && b.page.url), submitted_at: b.submitted_at || nowIso()
      });
      return { lead_id };
    }
  };

  // Mengembalikan { status, headers, body } untuk JSON, atau menulis stream lewat `sse` kalau diminta.
  async function message(b, wantsStream, sse) {
    const sid = requireSession(b);
    const q = String(b.message || '').trim();
    if (!q) throw httpError(422, 'message_required');
    if (q.length > 4000) throw httpError(413, 'message_too_long');
    const message_id = id('m'), t0 = Date.now(), useUpstream = !!env('UPSTREAM_URL');
    const leadId = str(b.context && b.context.lead_id, 100);
    await store.touchSession(sessionRow(sid, b));
    const save = (reply, error) => store.insertMessages([
      { session_id: sid, message_id: str(b.message_id, 100), role: 'user', content: q, variant: str(b.variant, 30), lead_id: leadId, context: b.context || null },
      ...(reply != null ? [{ session_id: sid, message_id, role: 'assistant', content: reply, variant: str(b.variant, 30), lead_id: leadId, model: useUpstream ? env('UPSTREAM_MODEL', 'qwen-plus') : 'mock', latency_ms: Date.now() - t0 }] : []),
      ...(error ? [{ session_id: sid, message_id, role: 'assistant', content: '', variant: str(b.variant, 30), lead_id: leadId, error: String(error).slice(0, 500), latency_ms: Date.now() - t0 }] : [])
    ]).catch((e) => console.error('[talita] simpan pesan gagal:', e.message));

    if (wantsStream && sse) {
      sse.start();
      try {
        let reply;
        if (useUpstream) reply = await upstreamReply(b, (t) => sse.send({ delta: t }));
        else { reply = mockReply(b); for (const w of reply.match(/\S+\s*/g)) { sse.send({ delta: w }); await new Promise((r) => setTimeout(r, 20)); } }
        sse.send({ message_id, done: true }); sse.end();
        await save(reply);
      } catch (e) {
        console.error('[talita] upstream:', e.message);
        await save(null, e.message);
        sse.send({ error: 'upstream_failed' }); sse.end();
      }
      return null;
    }
    try {
      const reply = useUpstream ? await upstreamReply(b) : mockReply(b);
      await save(reply);
      return { reply, message_id };
    } catch (e) {
      console.error('[talita] upstream:', e.message);
      await save(null, e.message);
      throw httpError(502, 'upstream_failed');
    }
  }

  // Adapter generik untuk req/res Node (http.IncomingMessage/ServerResponse, juga Vercel).
  async function handle(action, req, res, body) {
    const origin = req.headers.origin;
    for (const [k, v] of Object.entries(corsHeaders(origin))) res.setHeader(k, v);
    const json = (code, obj) => { res.statusCode = code; if (obj == null) return res.end(); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
    if (req.method === 'OPTIONS') return json(204);
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!allow.includes('*') && origin && !allow.includes(origin)) return json(403, { error: 'origin_not_allowed' });
    if (!siteKeys.includes(req.headers['x-talita-key'])) return json(401, { error: 'invalid_site_key' });
    if (!body || typeof body !== 'object') return json(400, { error: 'bad_json' });
    try {
      if (action === 'message') {
        const wantsStream = String(req.headers.accept || '').includes('text/event-stream');
        const sse = {
          start: () => { res.statusCode = 200; res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('X-Accel-Buffering', 'no'); res.flushHeaders && res.flushHeaders(); },
          send: (o) => res.write('data: ' + JSON.stringify(o) + '\n\n'),
          end: () => { res.write('data: [DONE]\n\n'); res.end(); }
        };
        const out = await message(body, wantsStream, sse);
        return out ? json(200, out) : undefined;
      }
      if (!actions[action]) return json(404, { error: 'not_found' });
      const out = await actions[action](body);
      return out == null ? json(204) : json(200, out);
    } catch (e) {
      if (!e.status) console.error('[talita]', action, e.message);
      if (res.headersSent) return res.end();
      return json(e.status || 500, { error: e.status ? e.message : 'internal_error' });
    }
  }

  return { handle, storeName: store.name, systemPrompt };
}

module.exports = { createApi, systemPrompt };
