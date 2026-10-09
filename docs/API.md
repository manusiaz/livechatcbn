# Kontrak API Talita

Widget (`widget/talita.js`) cuma tahu satu base URL, misalnya `https://ai.cbn.id/api/talita`, dan memanggil 4 endpoint di bawahnya. Semua request berupa `POST` dengan body JSON.

| Endpoint | Kapan dipanggil | Balasan |
|---|---|---|
| `POST /session` | Saat panel pertama kali dibuka | `{ "session_id": "..." }` |
| `POST /message` | Setiap pengunjung kirim pertanyaan | JSON `{ "reply": "..." }` **atau** stream SSE |
| `POST /lead` | Form data diri disubmit, atau data diri diisi lewat chat | `{ "lead_id": "..." }` |
| `POST /event` | Aktivitas untuk dashboard: buka/tutup, jawaban kuis, klik rekomendasi | `204` (isi balasan tidak dibaca) |

## Header

```
Content-Type: application/json
X-Talita-Key: pk_live_xxx        ← site key publik, bukan secret
Accept: text/event-stream, application/json   ← hanya di /message kalau stream aktif
```

- `X-Talita-Key` dipakai untuk mengenali website/tenant dan rate limit. **Jangan taruh API key AI di browser.** Key AI (ai.cbn.id / Ganatoken) disimpan di server.
- Server wajib membalas CORS: `Access-Control-Allow-Origin: https://www.cbn.id` (atau domain yang dipasangi widget), `Access-Control-Allow-Headers: Content-Type, X-Talita-Key`, dan menjawab preflight `OPTIONS`.
- **System prompt dibangun di server** dari `variant` + `context`. Widget tidak pernah mengirim prompt. Contoh lengkapnya ada di fungsi `systemPrompt()` di `mock-server/server.js` (diambil dari desain Talita).

## Nilai `variant`

| `variant` | Halaman | Tema |
|---|---|---|
| `utama` | Halaman utama CBN AI Ekosistem | Panel gelap di tengah |
| `koderpro` | Halaman KoderPro | Panel terang kanan bawah, aksen `#1877F2` |
| `ganatoken` | Halaman Ganatoken / CBN AI Gateway | Panel terang kanan bawah, aksen `#0165B5` |
| `koderu` | Halaman KoderU | Panel terang kanan bawah, aksen `#1877F2` |

---

## 1. `POST /session`

```json
{
  "visitor_id": "v_mv0u7x7oh3o1b9ld",
  "variant": "koderpro",
  "page": {
    "url": "https://www.cbn.id/koderpro?utm_source=google",
    "path": "/koderpro",
    "title": "KoderPro · CBN AI",
    "referrer": "https://www.google.com/"
  },
  "utm": { "source": "google", "medium": "cpc", "campaign": "koderpro-q4" },
  "client": {
    "locale": "id-ID",
    "timezone": "Asia/Jakarta",
    "screen": "1440x900",
    "user_agent": "Mozilla/5.0 ..."
  },
  "metadata": {},
  "started_at": "2026-10-09T10:43:41.120Z"
}
```

Balasan:

```json
{ "session_id": "s_da0da53ff517c378" }
```

- `visitor_id` dibuat widget dan disimpan di `localStorage`, jadi stabil antar kunjungan di browser yang sama.
- `session_id` disimpan di `sessionStorage` per varian. Kalau endpoint ini gagal, widget tetap jalan dengan id lokal (`s_...`), jadi server sebaiknya menerima `session_id` yang belum dikenal di endpoint lain (upsert).
- `metadata` diisi dari `Talita.init({ metadata })` kalau halaman mau menitip data tambahan (misalnya user login).

## 2. `POST /message`

```json
{
  "session_id": "s_da0da53ff517c378",
  "visitor_id": "v_mv0u7x7oh3o1b9ld",
  "variant": "koderpro",
  "message_id": "m_mv0u84ltphccs67q",
  "message": "Bisa sewa GPU untuk fine tuning?",
  "history": [
    { "role": "user", "content": "Bedanya LLM as a Service sama GPU as a Service?", "message_id": "m_..." },
    { "role": "assistant", "content": "LLM as a Service ...", "message_id": "m_..." }
  ],
  "context": {
    "profile": {
      "industry": "Perbankan",
      "need": "Training & fine tuning",
      "ai_stage": "Sedang uji coba"
    },
    "recommendations": {
      "shown": ["GPU as a Service", "LLM as a Service", "Lab as a Service", "Custom AI Solution", "Agentic Coding Platform"],
      "selected": ["GPU as a Service", "Lab as a Service"],
      "confirmed": true
    },
    "lead_id": "l_ad7e3720fbb37923",
    "page": { "url": "https://www.cbn.id/koderpro", "title": "KoderPro · CBN AI" }
  },
  "locale": "id-ID",
  "sent_at": "2026-10-09T10:43:50.226Z"
}
```

- `history` berisi maksimal 12 pesan terakhir (atur dengan `historyLimit`), **tidak termasuk** `message` yang sedang dikirim. Pesan kuis dan pesan pengumpulan data diri tidak ikut.
- `context.profile` berisi jawaban kuis. Nilainya `null` kalau pengunjung langsung chat tanpa ikut kuis.
- `recommendations.confirmed` bernilai `true` kalau pengunjung sudah klik "Diskusikan N layanan" dan mengisi form.
- Data pribadi tidak dikirim ulang di setiap pesan, cukup `lead_id`. Server mencocokkannya dengan data dari `/lead`.

### Balasan opsi A: JSON biasa

```json
{ "reply": "Bisa. GPU as a Service ...", "message_id": "m_a21af7929c292d0b" }
```

### Balasan opsi B: streaming SSE (disarankan)

Kalau header `Accept` memuat `text/event-stream`, server boleh membalas `Content-Type: text/event-stream`:

```
data: {"delta":"Bisa. "}

data: {"delta":"GPU as a Service "}

data: {"delta":"cocok untuk fine tuning ..."}

data: {"message_id":"m_a21af7929c292d0b","done":true}

data: [DONE]
```

Widget menampilkan teks sambil diketik. Kalau server membalas JSON walaupun diminta stream, widget tetap bisa membacanya. Untuk mematikan stream: `data-stream="false"`.

Kalau error (status selain 2xx atau timeout 30 detik), widget menampilkan "Koneksi ke asisten terputus. Coba kirim ulang." dan mengembalikan teks ke kolom input.

## 3. `POST /lead`

```json
{
  "session_id": "s_da0da53ff517c378",
  "visitor_id": "v_mv0u7x7oh3o1b9ld",
  "variant": "koderpro",
  "source": "recommendation",
  "lead": {
    "name": "Andi Pratama",
    "email": "andi@contoh.co.id",
    "company": "PT Contoh Indonesia",
    "phone": "0812 3456 7890"
  },
  "profile": { "industry": "Perbankan", "need": "Training & fine tuning", "ai_stage": "Sedang uji coba" },
  "selected_services": ["GPU as a Service", "Lab as a Service"],
  "recommended_services": ["GPU as a Service", "LLM as a Service", "Lab as a Service", "Custom AI Solution", "Agentic Coding Platform"],
  "consent": { "contact": true, "text": "Data Anda hanya dipakai tim CBN untuk menghubungi Anda." },
  "page": { "url": "https://www.cbn.id/koderpro", "title": "KoderPro · CBN AI" },
  "submitted_at": "2026-10-09T10:43:49.812Z"
}
```

Balasan: `{ "lead_id": "l_ad7e3720fbb37923" }`. Status selain 2xx membuat widget menampilkan pesan gagal dan pengunjung bisa kirim ulang.

Nilai `source`:

| `source` | Asal | `company` | `selected_services` |
|---|---|---|---|
| `recommendation` | Tombol "Diskusikan N layanan" lalu form | wajib | terisi |
| `chat_form` | Form data diri dari live chat | wajib | `[]` |
| `chat_inline` | Pengunjung mengetik nama, email, telepon di chat | `""` (tidak ditanya) | `[]` |

Validasi di widget: email `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, telepon `^\+?[0-9][0-9\s-]{8,15}$`. Server tetap wajib validasi ulang.

## 4. `POST /event`

Bentuk yang sama untuk semua event:

```json
{
  "session_id": "s_da0da53ff517c378",
  "visitor_id": "v_mv0u7x7oh3o1b9ld",
  "variant": "koderpro",
  "type": "quiz_answer",
  "data": { "step": 2, "question": "Apa yang paling ingin diselesaikan lebih dulu?", "key": "need", "answer": "Training & fine tuning" },
  "at": "2026-10-09T10:43:44.002Z"
}
```

| `type` | `data` | Untuk dashboard |
|---|---|---|
| `widget_open` | `{ page_url }` | Jumlah pembukaan per halaman |
| `widget_close` | `{ step, messages }` | Drop-off: berhenti di langkah mana |
| `quiz_answer` | `{ step, question, key, answer }` (`key`: `industry` / `need` / `ai_stage`) | Sebaran industri, kebutuhan, tahap AI |
| `recommendations_shown` | `{ profile, items: [{ name, rank, role }] }` | Produk yang paling sering direkomendasikan |
| `recommendation_toggle` | `{ name, rank, selected, selection }` | Minat per produk |
| `lead_form_open` | `{ purpose }` (`recommendation` / `chat_form`) | Funnel ke form |
| `lead_inline_prompt` | `{}` | Pengunjung chat sebelum isi data |
| `restart` | `{ step }` | Pengunjung mengulang kuis |

Event dikirim dengan `fetch(..., { keepalive: true })` dan kegagalannya diabaikan, jadi endpoint ini tidak boleh jadi syarat chat jalan. Balas `204`.

## Ringkasan data untuk dashboard

Kalau dashboard butuh tabel, bentuk paling sederhana:

- `sessions` (1 baris per `/session`): `session_id`, `visitor_id`, `variant`, `page_url`, `referrer`, `utm_*`, `locale`, `started_at`
- `messages` (2 baris per `/message`: user + assistant): `session_id`, `message_id`, `role`, `content`, `created_at`, `latency_ms`, `model`
- `leads` (1 baris per `/lead`): `lead_id`, `session_id`, `source`, `name`, `email`, `company`, `phone`, `industry`, `need`, `ai_stage`, `selected_services[]`, `submitted_at`
- `events` (1 baris per `/event`): `session_id`, `type`, `data` (JSON), `at`

`mock-server/server.js` mencatat semua payload ke `mock-server/data/{sessions,messages,leads,events}.jsonl`, jadi contoh data asli bisa dilihat di sana setelah mencoba demo.
