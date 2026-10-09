# livechatcbn

Widget live chat **Talita**, asisten AI CBN, siap ditempel ke website dan disambungkan ke API AI (ai.cbn.id).

```
widget/talita.js        widget embed, 1 file tanpa dependensi (Shadow DOM, CSS tidak bentrok dengan website)
docs/API.md             kontrak API: endpoint dan contoh data yang dikirim widget
mock-server/server.js   server contoh yang mengikuti kontrak; bisa mock atau diteruskan ke AI sungguhan
demo/index.html         halaman demo dengan pilihan 4 varian
```

## Pasang di website

```html
<script src="https://cdn.cbn.id/talita.js"
        data-api="https://ai.cbn.id/api/talita"
        data-key="pk_live_xxx"
        data-variant="koderpro"
        defer></script>
```

`data-variant`: `utama` | `koderpro` | `ganatoken` | `koderu`. Opsional: `data-stream="false"`, `data-open="true"`.

Atau lewat JavaScript:

```js
Talita.init({
  apiBase: 'https://ai.cbn.id/api/talita',
  siteKey: 'pk_live_xxx',
  variant: 'ganatoken',
  stream: true,            // pakai SSE di /message
  historyLimit: 12,        // jumlah pesan sebelumnya yang ikut dikirim
  requireLead: true,       // minta nama/email/telepon sebelum live chat
  metadata: {},            // ikut dikirim di /session
  headers: {},             // header tambahan
  onEvent: (e) => {},      // salinan setiap event (mis. diteruskan ke GA/GTM)
  onLead: (l) => {}
});
Talita.open(); Talita.close(); Talita.setVariant('koderu');
Talita.identify({ name, email, company, phone }); // lewati form kalau user sudah login
```

## Alur di widget

1. Pengunjung klik dock → `POST /session`
2. Kuis 3 langkah (industri, kebutuhan, tahap AI) → `POST /event` `quiz_answer`
3. Rekomendasi produk diurutkan sesuai kebutuhan → `recommendations_shown`, `recommendation_toggle`
4. "Diskusikan N layanan" → form data diri → `POST /lead` (`source: recommendation`)
5. Live chat → `POST /message` (berisi profil kuis, rekomendasi, `lead_id`, riwayat). Kalau belum ada data diri, Talita menanyakannya dulu lewat chat → `POST /lead` (`source: chat_inline`)

Detail payload: [docs/API.md](docs/API.md).

## Coba lokal

```bash
node mock-server/server.js
# buka http://localhost:8787  (site key demo: pk_test_demo)
```

Teruskan ke AI sungguhan (endpoint kompatibel OpenAI `/chat/completions`):

```bash
UPSTREAM_URL=https://ai.cbn.id/v1/chat/completions \
UPSTREAM_KEY=sk-xxx UPSTREAM_MODEL=qwen-plus \
node mock-server/server.js
```

Env lain: `PORT` (default 8787), `SITE_KEYS` (dipisah koma), `ALLOW_ORIGIN` (default `*`, isi domain website di production).
