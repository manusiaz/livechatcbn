# Integrasi: colok API AI dan API dashboard

Widget, API, dan hosting sudah jalan. Tim lain cukup mengisi **environment variable di Vercel** (project `livechatcbn` → Settings → Environment Variables), lalu redeploy. Tidak perlu ubah kode.

## 1. API AI

| Env | Contoh |
|---|---|
| `UPSTREAM_URL` | `https://ai.cbn.id/v1/chat/completions` |
| `UPSTREAM_KEY` | `sk-...` (dikirim sebagai `Authorization: Bearer ...`) |
| `UPSTREAM_MODEL` | `qwen-plus` |

API AI harus berformat OpenAI Chat Completions. Yang dikirim server:

```json
{
  "model": "qwen-plus",
  "messages": [
    { "role": "system", "content": "Kamu Talita, KoderPro AI assistant. ..." },
    { "role": "user", "content": "Bedanya LLM as a Service sama GPU as a Service?" },
    { "role": "assistant", "content": "LLM as a Service ..." },
    { "role": "user", "content": "Bisa sewa GPU untuk fine tuning?" }
  ],
  "stream": true,
  "temperature": 0.4,
  "max_tokens": 400
}
```

Balasan yang dibaca: `choices[0].delta.content` (stream SSE) atau `choices[0].message.content` (JSON biasa). System prompt disusun server dari varian halaman dan jawaban kuis; isinya ada di `systemPrompt()` di `lib/talita.js`.

Kalau env ini kosong, chat membalas dengan teks mock.

## 2. API dashboard (record data)

| Env | Contoh |
|---|---|
| `DASHBOARD_URL` | `https://dashboard.cbn.id/api/talita/ingest` |
| `DASHBOARD_KEY` | token rahasia, dikirim sebagai `Authorization: Bearer ...` (opsional) |

Setiap data yang masuk diteruskan ke `DASHBOARD_URL` sebagai `POST` JSON, satu request per record:

```json
{ "type": "lead", "record": { ... }, "sent_at": "2026-10-10T08:12:45.511Z" }
```

API dashboard cukup membalas status 2xx. Nilai `type` dan isi `record`:

**`session`** (pengunjung membuka chat)
```json
{ "id": "s_c01064d28fd6cb2b", "visitor_id": "v_mv1o54g02n6y5t8o", "variant": "koderpro",
  "page_url": "https://www.cbn.id/koderpro", "page_path": "/koderpro", "page_title": "KoderPro", "referrer": null,
  "utm": { "source": "google" }, "locale": "id-ID", "timezone": "Asia/Jakarta", "screen": "1440x900",
  "user_agent": "Mozilla/5.0 ...", "metadata": {}, "started_at": "2026-10-10T08:12:30.120Z" }
```

**`lead`** (data diri dikirim)
```json
{ "id": "l_053a64bd75b8e170", "session_id": "s_c01064d28fd6cb2b", "visitor_id": "v_mv1o54g02n6y5t8o",
  "variant": "koderpro", "source": "recommendation",
  "name": "Andi Pratama", "email": "andi@contoh.co.id", "company": "PT Contoh", "phone": "0812 3456 7890",
  "industry": "Perbankan", "need": "Training & fine tuning", "ai_stage": "Sedang uji coba",
  "selected_services": ["GPU as a Service"], "recommended_services": ["GPU as a Service", "LLM as a Service"],
  "consent": { "contact": true, "text": "Data Anda hanya dipakai tim CBN untuk menghubungi Anda." },
  "page_url": "https://www.cbn.id/koderpro", "submitted_at": "2026-10-10T08:12:45.511Z" }
```
`source`: `recommendation` (dari kartu rekomendasi), `chat_form`, atau `chat_inline` (data diketik di chat, tanpa `company`).

**`message`** (satu record untuk pertanyaan, satu untuk jawaban)
```json
{ "session_id": "s_c01064d28fd6cb2b", "message_id": "m_a21af7929c292d0b", "role": "assistant",
  "content": "Bisa. GPU as a Service ...", "variant": "koderpro", "lead_id": "l_053a64bd75b8e170",
  "model": "qwen-plus", "latency_ms": 1840 }
```
Record `role: "user"` juga membawa `context` (profil kuis dan rekomendasi). Kalau AI gagal menjawab, record assistant berisi `content: ""` dan `error`.

**`event`** (aktivitas di widget)
```json
{ "session_id": "s_c01064d28fd6cb2b", "visitor_id": "v_mv1o54g02n6y5t8o", "variant": "koderpro",
  "type": "quiz_answer", "data": { "step": 1, "key": "industry", "answer": "Perbankan" },
  "at": "2026-10-10T08:12:33.002Z" }
```
Daftar `type` event lengkap ada di [API.md](API.md#4-post-event).

### Perilaku saat gagal

- Kalau Supabase juga aktif, data ditulis ke keduanya. Request dari widget hanya gagal kalau **semua** tujuan gagal.
- Kalau hanya dashboard yang aktif dan dashboard mati: chat tetap dibalas, tapi pengiriman data diri ditolak dan widget meminta pengunjung mengirim ulang.
- Tidak ada retry otomatis. Record yang gagal tercatat di log Vercel (`[talita] dashboard ...`).
