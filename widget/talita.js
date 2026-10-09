/*!
 * Talita — widget live chat Asisten AI CBN.
 * Tanpa dependensi. Pasang:
 *   <script src="talita.js" data-api="https://ai.cbn.id/api/talita" data-key="pk_live_xxx" data-variant="koderpro" defer></script>
 * atau panggil manual: Talita.init({ apiBase, siteKey, variant })
 * Kontrak API: docs/API.md
 */
(function () {
  'use strict';
  if (window.Talita && window.Talita.__loaded) return;

  // ── Konten per varian (dari design system Talita) ──────────────────────
  var IND = ['Perbankan', 'Asuransi', 'Telekomunikasi', 'Ritel & FMCG', 'Pemerintahan'];
  var STAGE = ['Belum mulai', 'Sedang uji coba', 'Sudah di produksi'];
  var Q = ['Anda bergerak di industri apa?', 'Apa yang paling ingin diselesaikan lebih dulu?', 'Sejauh mana AI sudah dipakai di tim Anda?'];
  var ROLE = ['Paling sesuai', 'Sangat relevan', 'Pelengkap'];

  var VARIANTS = {
    utama: {
      sub: 'Asisten AI CBN', dock: 'Tanya asisten AI', ph: 'Mis. apa bedanya KoderU dan KoderPro?',
      greet: 'Halo, saya Talita. Jawab tiga pertanyaan singkat, lalu saya sarankan produk yang cocok.',
      needs: ['Otomasi pekerjaan rutin', 'Banyak model AI, biaya hemat', 'Data tetap di lingkungan kami', 'Butuh GPU atau lab'],
      topByNeed: [0, 1, 3, 5],
      recs: [['KoderU · Digital Worker', 'Agent yang mengerjakan tugas rutin di aplikasi yang sudah dipakai.', 'agent'], ['Ganatoken · Chinese Model', 'Qwen dari Alibaba Cloud, bagus untuk Bahasa Indonesia.', 'layers'], ['Ganatoken · Western Model', 'Model global untuk reasoning dan analisis yang kompleks.', 'globe'], ['Ganatoken · Local Token', 'Model open-source di infrastruktur CBN, data tidak keluar.', 'lock'], ['KoderPro · LLM as a Service', 'Pakai model AI lewat API yang aman.', 'layers'], ['KoderPro · GPU as a Service', 'GPU untuk training dan inference tanpa beli hardware.', 'cpu'], ['KoderPro · Lab as a Service', 'Lingkungan siap pakai untuk proof of concept.', 'flask'], ['KoderPro · Custom AI Solution', 'Solusi AI yang dibangun khusus untuk bisnis Anda.', 'wrench'], ['KoderPro · Agentic Coding Platform', 'AI agent yang membantu developer menulis kode.', 'code']]
    },
    koderpro: {
      sub: 'KoderPro AI assistant', dock: 'Ask about KoderPro', ph: 'Mis. bisa sewa GPU untuk fine tuning?',
      greet: 'Halo, saya Talita. Jawab tiga pertanyaan singkat, nanti saya carikan layanan KoderPro yang paling pas.',
      needs: ['Akses LLM lewat API', 'Training & fine tuning', 'Uji coba proof of concept', 'Solusi AI khusus'],
      recs: [['LLM as a Service', 'Pakai model AI lewat API yang aman, tanpa mengurus infrastruktur.', 'layers'], ['GPU as a Service', 'GPU untuk training, fine tuning, dan inference tanpa beli hardware.', 'cpu'], ['Lab as a Service', 'Lingkungan siap pakai untuk riset dan proof of concept.', 'flask'], ['Custom AI Solution', 'AI Assistant, Document Intelligence, dan AI Workflow Automation.', 'wrench'], ['Agentic Coding Platform', 'AI agent yang membantu developer menulis dan merapikan kode.', 'code']]
    },
    ganatoken: {
      sub: 'Asisten CBN AI Gateway', dock: 'Ask about Ganatoken', ph: 'Mis. kenapa model China lebih hemat?',
      greet: 'Halo, saya Talita. Jawab tiga pertanyaan singkat, lalu saya sarankan produk yang cocok.',
      needs: ['Biaya token AI lebih hemat', 'Satu API untuk banyak model', 'Pantau pemakaian dan biaya', 'Kontrol akses dan keamanan'],
      recs: [['Chinese Model', 'Qwen dari Alibaba Cloud. Bagus untuk Bahasa Indonesia, harga bersaing.', 'layers'], ['Local Token', 'Model open-source di infrastruktur CBN, data tidak keluar.', 'lock'], ['Western Model', 'Untuk reasoning dan analisis yang butuh akurasi tinggi.', 'globe']]
    },
    koderu: {
      sub: 'Asisten KoderU', dock: 'Ask about KoderU', ph: 'Mis. KoderU bisa bantu helpdesk kami?',
      greet: 'Halo, saya Talita. Jawab tiga pertanyaan singkat, lalu saya sarankan produk yang cocok.',
      needs: ['Layanan pelanggan', 'Helpdesk internal', 'Urusan HR & keuangan', 'Alur kerja antar aplikasi'],
      recs: [['Customer Service Automation', 'Agent menjawab pertanyaan pelanggan di WhatsApp dan web.', 'headset'], ['Internal Helpdesk', 'Pertanyaan karyawan dijawab dari dokumen internal.', 'msg'], ['HR Assistant', 'Bantu urusan cuti, kebijakan, dan administrasi karyawan.', 'users'], ['Finance Assistant', 'Bantu proses dokumen dan laporan keuangan.', 'chart'], ['Workflow Automation', 'Tugas berulang antar aplikasi berjalan sendiri.', 'flow']]
    }
  };

  var ICON = { agent: 'M12 8V4M8 4h8M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM9 13h.01M15 13h.01', layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', cpu: 'M6 6h12v12H6zM9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', flask: 'M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 9V3M7 15h10', wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z', code: 'M16 18l6-6-6-6M8 6l-6 6 6 6', msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', headset: 'M3 14v-2a9 9 0 0 1 18 0v2M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', chart: 'M3 3v18h18M7 15l4-4 3 3 5-6', flow: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a3 3 0 0 1 3 3v4' };

  // ── Token tema (dua keluarga: gelap-tengah untuk utama, terang-kanan-bawah untuk produk) ──
  function theme(variant) {
    if (variant === 'utama') return {
      dark: true, maxW: '460px', radius: '26px', border: 'rgba(143,184,255,.26)', sheetBg: '#080D18', shadow: '0 44px 120px rgba(0,0,0,.7)', enter: 'tlHeroIn .5s cubic-bezier(.2,.8,.2,1) both',
      headBg: 'transparent', headLine: 'rgba(255,255,255,.08)', avatar: 'linear-gradient(135deg,#4A8CFF,#12C2E9)', headFont: "'Space Grotesk',sans-serif", headW: '600', dot: '#7FE0A0',
      paneBg: 'transparent', aiBg: 'rgba(255,255,255,.07)', aiLine: 'rgba(255,255,255,.1)', aiInk: 'rgba(255,255,255,.88)', meBg: '#FFFFFF', meInk: '#06070A', typing: '#8FB8FF', label: '#8FB8FF', recInk: '#FFFFFF', recSub: 'rgba(255,255,255,.7)',
      footLine: 'rgba(255,255,255,.08)', footBg: 'rgba(255,255,255,.02)', chipPad: '10px 16px', chipLine: 'rgba(143,184,255,.3)', chipBg: 'rgba(255,255,255,.05)', chipInk: '#FFFFFF', chipFs: '13.5px', priBg: '#FFFFFF', priInk: '#06070A', inBg: 'rgba(255,255,255,.05)', inInk: '#FFFFFF', errInk: '#FFB4B4',
      selLine: '#8FB8FF', chkOn: '#4A8CFF', chkOff: 'rgba(255,255,255,.3)', icBg: 'rgba(143,184,255,.14)', icInk: '#8FB8FF',
      dockBg: 'rgba(8,13,24,.9)', dockLine: 'rgba(143,184,255,.34)', dockInk: '#FFFFFF', dockRing: 'tlRingPulse',
      fCard: '#0D1424', fInk: '#FFFFFF', fSub: 'rgba(255,255,255,.62)', fLine: 'rgba(255,255,255,.16)', fInBg: 'rgba(255,255,255,.05)', fPri: '#FFFFFF', fPriInk: '#06070A', fAcc: '#8FB8FF', fChip: 'rgba(143,184,255,.14)',
      roles: [['rgba(127,224,160,.45)', 'linear-gradient(140deg,rgba(74,140,255,.2),rgba(127,224,160,.08))', 'rgba(127,224,160,.18)', '#7FE0A0'], ['rgba(143,184,255,.32)', 'linear-gradient(140deg,rgba(74,140,255,.14),rgba(255,255,255,.03))', 'rgba(143,184,255,.18)', '#8FB8FF'], ['rgba(255,255,255,.14)', 'rgba(255,255,255,.04)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.72)']]
    };
    var acc = variant === 'ganatoken' ? '#0165B5' : '#1877F2';
    return {
      dark: false, maxW: '420px', radius: '24px', border: '#E4EBF3', sheetBg: '#FFFFFF', shadow: '0 30px 90px rgba(4,18,31,.28)', enter: 'tlKpIn .45s cubic-bezier(.2,.8,.2,1) both',
      headBg: '#0A2246', headLine: 'transparent', avatar: variant === 'ganatoken' ? 'linear-gradient(135deg,#00AEEF,#0165B5)' : 'linear-gradient(135deg,#4EA1FF,#1877F2)', headFont: "'Plus Jakarta Sans',sans-serif", headW: '800', dot: '#4ADE80',
      paneBg: '#F5F8FC', aiBg: '#FFFFFF', aiLine: '#E4EBF3', aiInk: '#0A1F33', meBg: acc, meInk: '#FFFFFF', typing: acc, label: acc, recInk: '#0A1F33', recSub: '#41607F',
      footLine: '#E4EBF3', footBg: '#FFFFFF', chipPad: '7px 12px', chipLine: '#D5E0EC', chipBg: '#FFFFFF', chipInk: '#0A1F33', chipFs: '12.5px', priBg: acc, priInk: '#FFFFFF', inBg: '#F5F8FC', inInk: '#0A1F33', errInk: '#B42318',
      selLine: acc, chkOn: acc, chkOff: '#C5D3E2', icBg: variant === 'ganatoken' ? '#E6F3FB' : '#E8F1FE', icInk: acc,
      dockBg: '#FFFFFF', dockLine: '#E4EBF3', dockInk: '#0A1F33', dockRing: 'tlKpRing',
      fCard: '#FFFFFF', fInk: '#0A1F33', fSub: '#5B6B7F', fLine: '#D5E0EC', fInBg: '#FFFFFF', fPri: acc, fPriInk: '#FFFFFF', fAcc: acc, fChip: acc === '#0165B5' ? '#E6F1FA' : '#E8F1FE',
      roles: [['#9FD6B4', '#EEFBF3', '#D3F3DF', '#146C43'], ['#BBD5F5', '#F1F7FE', '#DCEBFC', '#1F5FD6'], ['#E4EBF3', '#FFFFFF', '#EEF2F7', '#41607F']]
    };
  }

  var CSS = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box}',
    '[hidden]{display:none !important}',
    '.tl{font-family:"Plus Jakarta Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--recInk)}',
    'button{font-family:inherit}',
    ':focus-visible{outline:2px solid #8FB8FF;outline-offset:2px}',
    '@keyframes tlHeroIn{from{opacity:0;transform:translateY(28px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}',
    '@keyframes tlKpIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes tlMsg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '@keyframes tlDot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}',
    '@keyframes tlRingPulse{0%{box-shadow:0 0 0 0 rgba(74,140,255,.5)}70%{box-shadow:0 0 0 14px rgba(74,140,255,0)}100%{box-shadow:0 0 0 0 rgba(74,140,255,0)}}',
    '@keyframes tlKpRing{0%{box-shadow:0 0 0 0 rgba(24,119,242,.45)}70%{box-shadow:0 0 0 12px rgba(24,119,242,0)}100%{box-shadow:0 0 0 0 rgba(24,119,242,0)}}',
    '@keyframes tlRecIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}',
    '@keyframes tlBlendA{0%{transform:translate3d(-3%,-14%,0) rotate(0deg) scale(1.05)}50%{transform:translate3d(3%,16%,0) rotate(180deg) scale(1.22)}100%{transform:translate3d(-3%,-14%,0) rotate(360deg) scale(1.05)}}',
    '@keyframes tlBlendB{0%{transform:translate3d(2%,12%,0) rotate(0deg) scale(1.18)}50%{transform:translate3d(-2%,-16%,0) rotate(-200deg) scale(1.02)}100%{transform:translate3d(2%,12%,0) rotate(-360deg) scale(1.18)}}',
    '@keyframes tlFade{from{opacity:0}to{opacity:1}}',
    // dock
    '.dock{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:11px;padding:10px 18px 10px 10px;border-radius:999px;border:1px solid var(--dockLine);background:var(--dockBg);color:var(--dockInk);font-size:13.5px;font-weight:800;cursor:pointer;box-shadow:0 18px 44px rgba(0,0,0,.35);transition:transform .2s ease;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
    '.dock:hover{transform:translateY(-2px)}',
    '.dock[hidden]{display:none}',
    '.av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--avatar);color:#fff;font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:14px}',
    '.dock .av{animation:var(--dockRing) 3.2s ease-out infinite}',
    // overlay & panel
    '.scrim{position:fixed;inset:0;z-index:2147483001;background:rgba(4,8,16,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:tlFade .25s ease both}',
    '.wrap{position:fixed;z-index:2147483002;display:flex;pointer-events:none}',
    '.wrap.center{inset:0;align-items:center;justify-content:center;padding:14px}',
    '.wrap.corner{right:20px;bottom:20px;left:20px;justify-content:flex-end}',
    '.panel{pointer-events:auto;position:relative;width:100%;max-width:var(--maxW);height:min(640px,calc(100dvh - 40px));display:flex;flex-direction:column;overflow:hidden;border-radius:var(--radius);border:1px solid var(--border);background:var(--sheetBg);box-shadow:var(--shadow);animation:var(--enter)}',
    '.glow{position:absolute;border-radius:50%;pointer-events:none}',
    '.glow.a{top:-45%;left:-20%;width:80%;height:90%;filter:blur(90px);opacity:.5;background:radial-gradient(circle,#2F6BFF 0%,rgba(47,107,255,0) 65%);animation:tlBlendA 20s ease-in-out infinite}',
    '.glow.b{bottom:-35%;right:-18%;width:75%;height:85%;filter:blur(92px);opacity:.38;background:radial-gradient(circle,#12C2E9 0%,rgba(18,194,233,0) 65%);animation:tlBlendB 27s ease-in-out infinite}',
    '.head{position:relative;display:flex;align-items:center;gap:12px;padding:16px 18px;background:var(--headBg);border-bottom:1px solid var(--headLine);color:#fff}',
    '.head .av{width:40px;height:40px;font-size:16px;border:2px solid rgba(255,255,255,.25)}',
    '.ttl{font-family:var(--headFont);font-size:15px;font-weight:var(--headW);letter-spacing:-.02em}',
    '.ttl span{font-weight:500;font-size:12.5px;color:rgba(255,255,255,.58)}',
    '.st{display:flex;align-items:center;gap:7px;font-size:11.5px;color:rgba(255,255,255,.6);margin-top:2px}',
    '.dot{width:7px;height:7px;border-radius:50%;background:var(--dot);flex:none}',
    '.ib{width:34px;height:34px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font-size:14px;cursor:pointer}',
    '.pane{position:relative;flex:1 1 auto;min-height:0;overflow:auto;scrollbar-width:none;padding:18px;display:flex;flex-direction:column;gap:10px;background:var(--paneBg)}',
    '.pane::-webkit-scrollbar{display:none}',
    '.list{display:flex;flex-direction:column;gap:10px}',
    '.list>*{animation:tlMsg .35s cubic-bezier(.2,.8,.2,1) both}',
    '.b{max-width:88%;white-space:pre-wrap;word-wrap:break-word}',
    '.b.ai{align-self:flex-start;padding:12px 15px;border-radius:16px 16px 16px 5px;background:var(--aiBg);border:1px solid var(--aiLine);font-size:14px;line-height:1.55;font-weight:500;color:var(--aiInk)}',
    '.b.me{align-self:flex-end;max-width:84%;padding:11px 15px;border-radius:16px 16px 5px 16px;background:var(--meBg);color:var(--meInk);font-size:13.5px;font-weight:700;line-height:1.45}',
    '.typing{align-self:flex-start;display:flex;gap:5px;padding:15px;border-radius:16px 16px 16px 5px;background:var(--aiBg);border:1px solid var(--aiLine)}',
    '.typing span{width:6px;height:6px;border-radius:50%;background:var(--typing);animation:tlDot 1.1s ease-in-out infinite}',
    '.typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}',
    '.rh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:3px}',
    '.lbl{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--label)}',
    '.sub{font-size:12.5px;line-height:1.5;color:var(--recSub)}',
    '.recs{display:flex;flex-direction:column;gap:10px;margin-top:8px}',
    '.recs>*{animation:tlRecIn .5s cubic-bezier(.2,.8,.2,1) both}',
    '.rec{position:relative;display:flex;gap:13px;align-items:flex-start;border-radius:18px;border:1px solid;padding:14px 44px 14px 15px;cursor:pointer;transition:border-color .2s ease,transform .2s ease;text-align:left}',
    '.chk{position:absolute;top:14px;right:14px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;border:1.5px solid;color:#fff;font-size:12px;font-weight:800;line-height:1;transition:background .2s ease,border-color .2s ease}',
    '.ic{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--icBg);color:var(--icInk)}',
    '.rn{font-family:var(--headFont);font-size:15.5px;font-weight:var(--headW);letter-spacing:-.02em;color:var(--recInk)}',
    '.badge{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:999px;white-space:nowrap}',
    '.foot{position:relative;flex:none;padding:14px 18px 18px;border-top:1px solid var(--footLine);background:var(--footBg)}',
    '.opts{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}',
    '.chip{padding:var(--chipPad);border-radius:999px;border:1px solid var(--chipLine);background:var(--chipBg);color:var(--chipInk);font-size:var(--chipFs);font-weight:700;cursor:pointer;white-space:nowrap;transition:background .2s ease,border-color .2s ease,transform .2s ease}',
    '.chip:hover{transform:translateY(-1px);border-color:#8FB8FF}',
    '.acts{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:12px}',
    '.pri{flex:1 1 180px;padding:13px 20px;border-radius:999px;border:none;background:var(--priBg);color:var(--priInk);font-size:14px;font-weight:800;cursor:pointer}',
    '.pri:disabled{opacity:.5;cursor:default}',
    '.sec{padding:13px 16px;border-radius:999px;border:1px solid var(--chipLine);background:none;color:var(--recSub);font-size:13.5px;cursor:pointer;white-space:nowrap}',
    '.live{display:flex;align-items:center;gap:7px;margin-bottom:8px}',
    '.live .dot{width:6px;height:6px}',
    '.err{margin-bottom:8px;padding:9px 12px;border-radius:11px;border:1px solid rgba(255,138,138,.4);background:rgba(255,138,138,.12);font-size:12.5px;line-height:1.5;color:var(--errInk)}',
    '.row{display:flex;gap:8px;align-items:flex-end}',
    'textarea{flex:1;min-width:0;resize:none;height:46px;max-height:110px;padding:12px 14px;border-radius:14px;border:1px solid var(--chipLine);background:var(--inBg);color:var(--inInk);font-family:inherit;font-size:14px;line-height:1.5;outline:none;overflow-y:auto;scrollbar-width:none}',
    '.send{flex:none;height:46px;padding:0 18px;border-radius:999px;border:none;background:var(--priBg);color:var(--priInk);font-size:13.5px;font-weight:800;cursor:pointer}',
    '.send:disabled{opacity:.45;cursor:default}',
    // form modal
    '.fwrap{position:fixed;inset:0;z-index:2147483004;display:grid;place-items:center;padding:14px}',
    '.fscrim{position:fixed;inset:0;z-index:2147483003;background:rgba(4,8,16,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
    '.form{width:min(460px,calc(100vw - 28px));max-height:calc(100dvh - 28px);overflow-y:auto;border-radius:22px;background:var(--fCard);color:var(--fInk);border:1px solid var(--fLine);box-shadow:0 30px 90px rgba(0,0,0,.45);animation:tlHeroIn .35s cubic-bezier(.2,.8,.2,1) both}',
    '.fh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:22px 22px 0}',
    '.fk{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--fAcc)}',
    '.ft{font-size:20px;font-weight:800;letter-spacing:-.02em;margin-top:6px}',
    '.fs{font-size:13.5px;line-height:1.55;color:var(--fSub);margin-top:6px}',
    '.fx{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--fLine);background:none;color:var(--fInk);font-size:18px;cursor:pointer}',
    '.fb{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px}',
    '.fsel{display:flex;flex-wrap:wrap;gap:6px}',
    '.fsel span{padding:6px 11px;border-radius:999px;background:var(--fChip);color:var(--fAcc);font-size:12px;font-weight:700}',
    '.fwarn{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:12px;background:#FDECEC;border:1px solid #F5C2C2;color:#A61B1B;font-size:13px;font-weight:700;line-height:1.45}',
    'label{display:block;font-size:12.5px;font-weight:700;margin-bottom:6px}',
    'label i{color:#C62828;font-style:normal}',
    'input{width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--fLine);background:var(--fInBg);color:var(--fInk);font-family:inherit;font-size:14px;outline:none}',
    'input[aria-invalid="true"]{border-color:#E5484D}',
    '.fe{font-size:12px;font-weight:600;color:#E5484D;margin-top:5px}',
    '.fsubmit{margin-top:4px;padding:14px 20px;border-radius:999px;border:none;background:var(--fPri);color:var(--fPriInk);font-size:14px;font-weight:800;cursor:pointer}',
    '.fsubmit:disabled{opacity:.6}',
    '.fnote{font-size:11.5px;line-height:1.5;color:var(--fSub);text-align:center}',
    '@media (max-width:520px){.wrap.corner{right:8px;left:8px;bottom:8px}.wrap.center{padding:8px}.panel{max-width:none;height:calc(100dvh - 16px)}}',
    '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none !important;transition:none !important}}'
  ].join('\n');

  // ── util ────────────────────────────────────────────────────────────────
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(path, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); s.appendChild(p);
    return s;
  }
  function uid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function store(kind, key, val) {
    try {
      var s = window[kind];
      if (val === undefined) return s.getItem(key);
      if (val === null) s.removeItem(key); else s.setItem(key, val);
    } catch (e) { return null; }
  }
  function now() { return new Date().toISOString(); }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+?[0-9][0-9\s-]{8,15}$/;

  // ── API client ─────────────────────────────────────────────────────────
  function Api(cfg) { this.cfg = cfg; }
  Api.prototype.headers = function () {
    var h = { 'Content-Type': 'application/json', 'X-Talita-Key': this.cfg.siteKey || '' };
    var extra = this.cfg.headers || {};
    for (var k in extra) h[k] = extra[k];
    return h;
  };
  Api.prototype.post = function (path, body, opt) {
    opt = opt || {};
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, opt.timeout || this.cfg.timeout);
    var h = this.headers();
    if (opt.stream) h.Accept = 'text/event-stream, application/json';
    return fetch(this.cfg.apiBase.replace(/\/+$/, '') + path, {
      method: 'POST', headers: h, body: JSON.stringify(body), signal: ctrl && ctrl.signal,
      keepalive: !!opt.keepalive, credentials: this.cfg.credentials
    }).then(function (r) {
      if (t) clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    }, function (e) { if (t) clearTimeout(t); throw e; });
  };
  Api.prototype.json = function (path, body) {
    return this.post(path, body).then(function (r) { return r.status === 204 ? {} : r.json(); });
  };
  // Balasan chat: JSON {reply} atau SSE (data: {"delta":"..."} ... data: [DONE]).
  Api.prototype.chat = function (body, onDelta) {
    return this.post('/message', body, { stream: this.cfg.stream }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('text/event-stream') < 0 || !r.body) return r.json();
      var reader = r.body.getReader(), dec = new TextDecoder(), buf = '', full = '', meta = {};
      function pump() {
        return reader.read().then(function (res) {
          if (res.done) return Object.assign(meta, { reply: full });
          buf += dec.decode(res.value, { stream: true });
          var parts = buf.split(/\r?\n\r?\n/); buf = parts.pop();
          parts.forEach(function (ev) {
            ev.split(/\r?\n/).forEach(function (line) {
              if (line.indexOf('data:') !== 0) return;
              var d = line.slice(5).trim();
              if (!d || d === '[DONE]') return;
              try {
                var o = JSON.parse(d);
                if (o.delta) { full += o.delta; onDelta(full); }
                if (o.reply != null) full = String(o.reply);
                if (o.message_id) meta.message_id = o.message_id;
                if (o.actions) meta.actions = o.actions;
              } catch (e) { full += d; onDelta(full); }
            });
          });
          return pump();
        });
      }
      return pump();
    });
  };

  // ── Widget ─────────────────────────────────────────────────────────────
  function Widget(cfg) {
    this.cfg = cfg;
    this.api = new Api(cfg);
    this.visitorId = store('localStorage', 'talita_vid') || uid('v');
    store('localStorage', 'talita_vid', this.visitorId);
    this.sessionId = null;
    this.reset();
    this.mount();
  }

  Widget.prototype.reset = function () {
    this.step = 0;           // 0..2 kuis, 3 = rekomendasi siap
    this.ans = [];           // [industri, kebutuhan, tahap AI]
    this.sel = null;         // layanan terpilih
    this.order = [];         // urutan rekomendasi yang ditampilkan
    this.picked = false;     // lead sudah submit dari rekomendasi
    this.lead = this.lead || null;
    this.history = [];       // percakapan bebas {role, content}
    this.collect = null;     // mode tanya data diri lewat chat
    this.pendingQ = '';
    this.busy = false;
    this.timer && clearTimeout(this.timer);
  };

  Widget.prototype.V = function () { return VARIANTS[this.cfg.variant] || VARIANTS.utama; };

  Widget.prototype.mount = function () {
    var self = this;
    this.host = el('div', { id: 'talita-widget' });
    document.body.appendChild(this.host);
    this.root = this.host.attachShadow ? this.host.attachShadow({ mode: 'open' }) : this.host;
    this.root.appendChild(el('style', { text: CSS }));
    this.box = el('div', { class: 'tl' });
    this.root.appendChild(this.box);
    this.applyTheme();
    this.dock = el('button', { class: 'dock', type: 'button', 'aria-label': 'Buka chat Talita', onclick: function () { self.open(); } }, [el('span', { class: 'av', 'aria-hidden': 'true', text: 'T' }), el('span', { class: 'dl', text: this.cfg.dockLabel || this.V().dock })]);
    if (this.cfg.showDock === false) this.dock.hidden = true;
    this.box.appendChild(this.dock);
    this.onKeyDoc = function (e) { if (e.key === 'Escape' && self.isOpen) { if (self.formEl) self.closeForm(); else self.close(); } };
    document.addEventListener('keydown', this.onKeyDoc);
  };

  Widget.prototype.applyTheme = function () {
    this.T = theme(this.cfg.variant in VARIANTS ? this.cfg.variant : 'utama');
    for (var k in this.T) if (typeof this.T[k] === 'string') this.box.style.setProperty('--' + k, this.T[k]);
  };

  Widget.prototype.ensureSession = function () {
    var self = this;
    if (this.sessionId) return Promise.resolve(this.sessionId);
    var saved = store('sessionStorage', 'talita_sid_' + this.cfg.variant);
    if (saved) { this.sessionId = saved; return Promise.resolve(saved); }
    if (this.sessionP) return this.sessionP;
    var q = new URLSearchParams(location.search), utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { if (q.get(k)) utm[k.slice(4)] = q.get(k); });
    this.sessionP = this.api.json('/session', {
      visitor_id: this.visitorId,
      variant: this.cfg.variant,
      page: { url: location.href, path: location.pathname, title: document.title, referrer: document.referrer || null },
      utm: utm,
      client: { locale: navigator.language, timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || null), screen: screen.width + 'x' + screen.height, user_agent: navigator.userAgent },
      metadata: this.cfg.metadata || {},
      started_at: now()
    }).then(function (r) {
      self.sessionId = r.session_id || uid('s');
      store('sessionStorage', 'talita_sid_' + self.cfg.variant, self.sessionId);
      return self.sessionId;
    }, function () {
      // API session gagal: tetap jalan dengan id lokal supaya chat tidak macet.
      self.sessionId = uid('s');
      return self.sessionId;
    });
    return this.sessionP;
  };

  Widget.prototype.track = function (type, data) {
    var self = this;
    var payload = { session_id: this.sessionId, visitor_id: this.visitorId, variant: this.cfg.variant, type: type, data: data || {}, at: now() };
    if (typeof this.cfg.onEvent === 'function') { try { this.cfg.onEvent(payload); } catch (e) { /* abaikan */ } }
    if (this.cfg.trackEvents === false) return;
    this.ensureSession().then(function (sid) {
      payload.session_id = sid;
      return self.api.post('/event', payload, { keepalive: true });
    }).catch(function () { /* event analytics tidak boleh mengganggu chat */ });
  };

  Widget.prototype.profile = function () {
    return { industry: this.ans[0] || null, need: this.ans[1] || null, ai_stage: this.ans[2] || null };
  };

  // ── buka / tutup ──
  Widget.prototype.open = function () {
    var self = this;
    if (this.isOpen) return;
    this.isOpen = true;
    this.dock.hidden = true;
    var center = this.T.dark;
    if (center) { this.scrim = el('div', { class: 'scrim', onclick: function () { self.close(); } }); this.box.appendChild(this.scrim); }
    this.wrap = el('div', { class: 'wrap ' + (center ? 'center' : 'corner') });
    this.wrap.appendChild(this.buildPanel());
    this.box.appendChild(this.wrap);
    this.ensureSession().then(function () { self.track('widget_open', { page_url: location.href }); });
    if (!this.started) this.startQuiz(); else this.rehydrate();
    setTimeout(function () { (self.optsEl.querySelector('button') || self.ta).focus(); }, 60);
  };

  Widget.prototype.close = function () {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closeForm();
    if (this.scrim) this.scrim.remove();
    if (this.wrap) this.wrap.remove();
    this.scrim = this.wrap = null;
    if (this.cfg.showDock !== false) this.dock.hidden = false;
    this.track('widget_close', { step: this.step, messages: this.history.length });
  };

  Widget.prototype.buildPanel = function () {
    var self = this, V = this.V();
    var panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Chat Talita' });
    if (this.T.dark) { panel.appendChild(el('div', { class: 'glow a', 'aria-hidden': 'true' })); panel.appendChild(el('div', { class: 'glow b', 'aria-hidden': 'true' })); }
    this.statusEl = el('span', { text: 'Online · menunggu jawaban Anda' });
    panel.appendChild(el('div', { class: 'head' }, [
      el('div', { class: 'av', 'aria-hidden': 'true', text: 'T' }),
      el('div', { style: 'min-width:0;flex:1' }, [
        el('div', { class: 'ttl' }, ['Talita ', el('span', { text: '· ' + V.sub })]),
        el('div', { class: 'st' }, [el('span', { class: 'dot' }), this.statusEl])
      ]),
      el('button', { class: 'ib', type: 'button', 'aria-label': 'Ulangi', title: 'Ulangi', text: '↺', onclick: function () { self.restart(); } }),
      el('button', { class: 'ib', type: 'button', 'aria-label': 'Tutup', title: 'Tutup', text: '×', onclick: function () { self.close(); } })
    ]));
    this.listEl = el('div', { class: 'list', 'aria-live': 'polite' });
    this.typingEl = el('div', { class: 'typing', hidden: true }, [el('span'), el('span'), el('span')]);
    this.pane = el('div', { class: 'pane' }, [this.listEl, this.typingEl]);
    panel.appendChild(this.pane);

    this.optsEl = el('div', { class: 'opts' });
    this.actsEl = el('div', { class: 'acts', hidden: true });
    this.errEl = el('div', { class: 'err', role: 'alert', hidden: true });
    this.ta = el('textarea', { rows: '1', 'aria-label': 'Tulis pertanyaan', placeholder: V.ph });
    this.ta.addEventListener('input', function () { self.syncSend(); });
    this.ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); self.send(); } });
    this.sendBtn = el('button', { class: 'send', type: 'button', 'aria-label': 'Kirim', text: 'Kirim', disabled: true, onclick: function () { self.send(); } });
    panel.appendChild(el('div', { class: 'foot' }, [
      this.optsEl, this.actsEl,
      el('div', { class: 'live lbl' }, [el('span', { class: 'dot' }), 'Live agent · tanya langsung, dijawab AI']),
      this.errEl,
      el('div', { class: 'row' }, [this.ta, this.sendBtn])
    ]));
    return panel;
  };

  Widget.prototype.scroll = function () { var p = this.pane; if (p) requestAnimationFrame(function () { p.scrollTop = p.scrollHeight; }); };
  Widget.prototype.setStatus = function (t) { if (this.statusEl) this.statusEl.textContent = t; };
  Widget.prototype.thinking = function (on) { if (this.typingEl) this.typingEl.hidden = !on; if (on) this.setStatus('Sedang mengetik…'); this.scroll(); };
  Widget.prototype.showErr = function (t) { if (!this.errEl) return; this.errEl.textContent = t || ''; this.errEl.hidden = !t; };
  Widget.prototype.syncSend = function () { if (this.sendBtn) this.sendBtn.disabled = this.busy || !this.ta.value.trim(); };

  Widget.prototype.bubble = function (who, text) {
    this.transcript.push({ who: who, text: text });
    var b = el('div', { class: 'b ' + who, text: text });
    if (this.listEl) { this.listEl.appendChild(b); this.scroll(); }
    return b;
  };

  // ── kuis 3 langkah ──
  Widget.prototype.startQuiz = function () {
    this.started = true;
    this.transcript = [];
    this.bubble('ai', this.cfg.greeting || this.V().greet);
    this.bubble('ai', Q[0]);
    this.renderOpts();
  };

  // Panel dibangun ulang tiap kali dibuka; tampilkan kembali isi percakapan.
  Widget.prototype.rehydrate = function () {
    var t = this.transcript; this.transcript = [];
    var self = this;
    t.forEach(function (m) { if (m.who === 'recs') self.renderRecs(true); else self.bubble(m.who, m.text); });
    this.renderOpts();
    this.renderActs();
    this.setStatus(this.history.length ? 'Online · live agent' : this.step >= 3 ? 'Rekomendasi siap' : 'Online · menunggu jawaban Anda');
  };

  Widget.prototype.renderOpts = function () {
    var self = this, el0 = this.optsEl; if (!el0) return;
    el0.textContent = '';
    el0.hidden = this.step >= 3;
    if (this.step >= 3) return;
    var src = [IND, this.V().needs, STAGE][this.step];
    src.forEach(function (label) { el0.appendChild(el('button', { class: 'chip', type: 'button', text: label, onclick: function () { self.pick(label); } })); });
  };

  Widget.prototype.pick = function (label) {
    var self = this;
    if (this.busy || this.step >= 3) return;
    var step = this.step;
    this.ans[step] = label;
    this.bubble('me', label);
    this.optsEl.hidden = true;
    this.busy = true; this.thinking(true);
    this.track('quiz_answer', { step: step + 1, question: Q[step], key: ['industry', 'need', 'ai_stage'][step], answer: label });
    this.timer = setTimeout(function () {
      self.busy = false; self.thinking(false);
      self.step = step + 1;
      if (self.step < 3) { self.bubble('ai', Q[self.step]); self.renderOpts(); self.setStatus('Online · menunggu jawaban Anda'); }
      else self.finishQuiz();
      self.syncSend();
    }, step === 2 ? 1100 : 650);
  };

  Widget.prototype.finishQuiz = function () {
    var V = this.V(), ni = Math.max(0, V.needs.indexOf(this.ans[1]));
    var top = V.topByNeed ? V.topByNeed[ni] : ni, ord = V.recs.slice();
    if (top > 0 && top < ord.length) ord.unshift(ord.splice(top, 1)[0]);
    this.order = ord;
    this.sel = [ord[0][0]];
    this.bubble('ai', 'Terima kasih. Ini layanan yang saya rekomendasikan. Pilih yang ingin Anda diskusikan, boleh lebih dari satu.');
    this.renderRecs();
    this.renderOpts();
    this.renderActs();
    this.setStatus('Rekomendasi siap');
    this.track('recommendations_shown', { profile: this.profile(), items: ord.map(function (r, k) { return { name: r[0], rank: k + 1, role: ROLE[Math.min(k, 2)] }; }) });
  };

  Widget.prototype.renderRecs = function (silent) {
    var self = this, T = this.T;
    this.transcript.push({ who: 'recs' });
    var wrap = el('div');
    var count = el('div', { class: 'sub', style: 'font-weight:600;white-space:nowrap' });
    wrap.appendChild(el('div', { class: 'rh' }, [el('div', { class: 'lbl', text: 'Rekomendasi · ' + (this.ans[0] || '') }), count]));
    wrap.appendChild(el('div', { class: 'sub', style: 'margin-top:6px', text: 'Pilih satu atau beberapa layanan yang ingin Anda diskusikan.' }));
    var list = el('div', { class: 'recs' });
    var cards = this.order.map(function (r, k) {
      var name = r[0], rs = T.roles[Math.min(k, 2)];
      var chk = el('span', { class: 'chk', 'aria-hidden': 'true' });
      var card = el('div', { class: 'rec', role: 'checkbox', tabindex: '0', style: 'background:' + rs[1] }, [
        chk,
        el('span', { class: 'ic', 'aria-hidden': 'true' }, [svg(ICON[r[2]] || ICON.layers, 20)]),
        el('div', { style: 'flex:1;min-width:0' }, [
          el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px 9px;align-items:center;justify-content:space-between' }, [
            el('div', { class: 'rn', text: name }),
            el('span', { class: 'badge', style: 'background:' + rs[2] + ';color:' + rs[3], text: ROLE[Math.min(k, 2)] })
          ]),
          el('div', { class: 'sub', style: 'margin-top:5px;line-height:1.55', text: r[1] })
        ])
      ]);
      function toggle() {
        if (self.picked) return;
        var on = self.sel.indexOf(name) >= 0;
        self.sel = on ? self.sel.filter(function (x) { return x !== name; }) : self.sel.concat(name);
        paint(); self.renderActs();
        self.track('recommendation_toggle', { name: name, rank: k + 1, selected: !on, selection: self.sel.slice() });
      }
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      return { card: card, chk: chk, name: name, rs: rs };
    });
    function paint() {
      cards.forEach(function (c) {
        var on = self.sel.indexOf(c.name) >= 0;
        c.card.setAttribute('aria-checked', String(on));
        c.card.style.borderColor = on ? T.selLine : c.rs[0];
        c.card.style.borderWidth = on ? '2px' : '1px';
        c.chk.textContent = on ? '✓' : '';
        c.chk.style.background = on ? T.chkOn : 'transparent';
        c.chk.style.borderColor = on ? T.chkOn : T.chkOff;
      });
      count.textContent = self.sel.length + ' dipilih';
    }
    this.paintRecs = paint;
    cards.forEach(function (c) { list.appendChild(c.card); });
    wrap.appendChild(list);
    paint();
    this.listEl.appendChild(wrap);
    if (!silent) this.scroll();
  };

  Widget.prototype.renderActs = function () {
    var self = this, a = this.actsEl; if (!a) return;
    a.textContent = '';
    a.hidden = this.step < 3;
    if (this.step < 3) return;
    var n = this.sel.length;
    var cta = el('button', { class: 'pri', type: 'button', disabled: !n || this.picked, text: this.picked ? 'Tim CBN akan menghubungi Anda' : n ? 'Diskusikan ' + n + ' layanan' : 'Pilih layanan dulu', onclick: function () { if (n && !self.picked) self.openForm('pick'); } });
    a.appendChild(cta);
    a.appendChild(el('button', { class: 'sec', type: 'button', text: 'Ulangi', onclick: function () { self.restart(); } }));
  };

  Widget.prototype.restart = function () {
    this.track('restart', { step: this.step });
    var lead = this.lead;
    this.reset(); this.lead = lead;
    if (this.listEl) this.listEl.textContent = '';
    this.thinking(false); this.showErr('');
    this.startQuiz(); this.renderActs(); this.syncSend();
    this.setStatus('Online · menunggu jawaban Anda');
  };

  // ── form data diri ──
  Widget.prototype.openForm = function (purpose) {
    var self = this, T = this.T, pick = purpose === 'pick';
    if (this.formEl) return;
    var fm = Object.assign({ name: '', email: '', company: '', phone: '' }, this.lead || {});
    var tried = false;
    var fields = [['name', 'Nama lengkap', 'text', 'Contoh: Andi Pratama', 'name'], ['email', 'Email kerja', 'email', 'Contoh: andi@perusahaan.co.id', 'email'], ['company', 'Perusahaan', 'text', 'Contoh: PT Contoh Indonesia', 'organization'], ['phone', 'Nomor telepon / WhatsApp', 'tel', 'Contoh: 0812 3456 7890', 'tel']];
    function errs() {
      return {
        name: !fm.name.trim() ? 'Masukkan nama lengkap Anda.' : '',
        email: !EMAIL_RE.test(fm.email.trim()) ? 'Masukkan email kerja yang valid.' : '',
        company: !fm.company.trim() ? 'Masukkan nama perusahaan.' : '',
        phone: !PHONE_RE.test(fm.phone.trim()) ? 'Masukkan nomor telepon yang valid.' : ''
      };
    }
    var warn = el('div', { class: 'fwarn', role: 'alert', hidden: true }, [el('span', { 'aria-hidden': 'true', style: 'flex:none;width:20px;height:20px;border-radius:50%;background:#C62828;color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800', text: '!' }), 'Masih ada isian yang kosong atau belum benar. Lengkapi isian yang ditandai merah.']);
    var submitErr = el('div', { class: 'fwarn', role: 'alert', hidden: true });
    var inputs = {}, msgs = {};
    var btn = el('button', { class: 'fsubmit', type: 'submit', text: pick ? 'Kirim & diskusikan ' + this.sel.length + ' layanan' : 'Mulai live chat' });
    function paint() {
      var E = errs(), ready = !Object.values(E).some(Boolean);
      warn.hidden = !(tried && !ready);
      fields.forEach(function (f) { var bad = tried && !!E[f[0]]; inputs[f[0]].setAttribute('aria-invalid', String(bad)); msgs[f[0]].textContent = E[f[0]]; msgs[f[0]].hidden = !bad; });
      btn.style.opacity = ready ? '1' : '.6';
      return ready;
    }
    var body = el('form', { class: 'fb', novalidate: true });
    if (pick) body.appendChild(el('div', { class: 'fsel' }, this.sel.map(function (n) { return el('span', { text: n }); })));
    body.appendChild(warn); body.appendChild(submitErr);
    fields.forEach(function (f) {
      var id = 'tl-f-' + f[0];
      inputs[f[0]] = el('input', { id: id, type: f[2], autocomplete: f[4], placeholder: f[3], value: fm[f[0]] });
      inputs[f[0]].addEventListener('input', function (e) { fm[f[0]] = e.target.value; paint(); });
      msgs[f[0]] = el('div', { class: 'fe', hidden: true });
      body.appendChild(el('div', null, [el('label', { for: id }, [f[1] + ' ', el('i', { text: '*' })]), inputs[f[0]], msgs[f[0]]]));
    });
    body.appendChild(btn);
    body.appendChild(el('div', { class: 'fnote', text: this.cfg.privacyNote || 'Data Anda hanya dipakai tim CBN untuk menghubungi Anda.' }));
    body.addEventListener('submit', function (e) {
      e.preventDefault();
      tried = true;
      if (!paint()) return;
      var lead = { name: fm.name.trim(), email: fm.email.trim(), company: fm.company.trim(), phone: fm.phone.trim() };
      btn.disabled = true; btn.textContent = 'Mengirim…'; submitErr.hidden = true;
      self.submitLead(lead, pick ? 'recommendation' : 'chat_form').then(function () {
        self.closeForm();
        var first = lead.name.split(/\s+/)[0];
        if (pick) {
          self.picked = true;
          self.bubble('me', 'Saya pilih: ' + self.sel.join(', '));
          self.bubble('ai', 'Terima kasih, ' + first + '. Tim CBN akan menghubungi ' + lead.email + ' untuk membahas ' + self.sel.join(', ') + '. Kalau ada pertanyaan sebelum itu, tanya saya di bawah.');
          self.renderActs();
          self.ta && self.ta.focus();
        } else {
          self.bubble('ai', 'Halo ' + first + ', terima kasih. Silakan tanya apa saja, saya bantu jawab.');
        }
      }, function () {
        btn.disabled = false; btn.textContent = pick ? 'Kirim & diskusikan ' + self.sel.length + ' layanan' : 'Mulai live chat';
        submitErr.textContent = 'Gagal mengirim data. Periksa koneksi lalu coba lagi.'; submitErr.hidden = false;
      });
    });
    var x = el('button', { class: 'fx', type: 'button', 'aria-label': 'Tutup', text: '×', onclick: function () { self.closeForm(); } });
    var card = el('div', { class: 'form', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tl-f-title' }, [
      el('div', { class: 'fh' }, [el('div', null, [
        el('div', { class: 'fk', text: pick ? 'Langkah terakhir' : 'Live chat' }),
        el('div', { class: 'ft', id: 'tl-f-title', text: pick ? 'Isi data diri Anda' : 'Isi data diri dulu, ya' }),
        el('div', { class: 'fs', text: pick ? 'Tim CBN akan menghubungi Anda untuk membahas layanan yang Anda pilih.' : 'Supaya Talita dan tim CBN bisa menindaklanjuti percakapan Anda.' })
      ]), x]),
      body
    ]);
    var scrim = el('div', { class: 'fscrim', onclick: function () { self.closeForm(); } });
    var wrap = el('div', { class: 'fwrap', onclick: function (e) { if (e.target === wrap) self.closeForm(); } }, [card]);
    this.formEl = [scrim, wrap];
    this.box.appendChild(scrim); this.box.appendChild(wrap);
    paint();
    setTimeout(function () { inputs.name.focus(); }, 40);
    this.track('lead_form_open', { purpose: pick ? 'recommendation' : 'chat_form' });
  };

  Widget.prototype.closeForm = function () {
    if (!this.formEl) return;
    this.formEl.forEach(function (n) { n.remove(); });
    this.formEl = null;
  };

  Widget.prototype.submitLead = function (lead, source) {
    var self = this;
    return this.ensureSession().then(function (sid) {
      return self.api.json('/lead', {
        session_id: sid, visitor_id: self.visitorId, variant: self.cfg.variant,
        source: source,
        lead: lead,
        profile: self.profile(),
        selected_services: source === 'recommendation' ? self.sel.slice() : [],
        recommended_services: self.order.map(function (r) { return r[0]; }),
        consent: { contact: true, text: self.cfg.privacyNote || 'Data Anda hanya dipakai tim CBN untuk menghubungi Anda.' },
        page: { url: location.href, title: document.title },
        submitted_at: now()
      });
    }).then(function (r) {
      self.lead = lead; self.leadId = r && r.lead_id || null;
      if (typeof self.cfg.onLead === 'function') { try { self.cfg.onLead({ lead: lead, source: source, lead_id: self.leadId }); } catch (e) { /* abaikan */ } }
      return r;
    });
  };

  // ── live chat ──
  Widget.prototype.send = function () {
    var q = (this.ta.value || '').trim();
    if (!q || this.busy) return;
    this.ta.value = ''; this.syncSend();
    if (!this.lead && this.cfg.requireLead !== false) return this.collectLead(q);
    this.ask(q);
  };

  // Tanya nama/email/telepon langsung di chat (pola dari desain), lalu jawab pertanyaan awal.
  Widget.prototype.collectLead = function (q) {
    var self = this;
    this.bubble('me', q);
    if (this.collect == null) {
      this.collect = 0; this.pendingQ = q; this.fm = { name: '', email: '', company: '', phone: '' };
      this.bubble('ai', 'Baik, saya bantu jawab. Sebelumnya, boleh tulis nama, email, dan nomor telepon Anda? Supaya tim CBN bisa menindaklanjuti.');
      this.ta.placeholder = 'Contoh: Andi Pratama, andi@perusahaan.co.id, 0812 3456 7890';
      this.track('lead_inline_prompt', {});
      return;
    }
    var em = (q.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}/) || [''])[0];
    var ph = ((q.replace(em, ' ').match(/\+?\d[\d\s-]{8,16}\d/) || [''])[0]).trim();
    var nm = q.replace(em, ' ').replace(ph, ' ').replace(/\b(nama|email|e-mail|telp|telepon|no\.?|hp|wa|whatsapp|saya)\b\s*:?/gi, ' ').replace(/[,;:|/\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    var fm = this.fm;
    if (nm.length >= 2) fm.name = nm;
    if (em) fm.email = em;
    if (ph) fm.phone = ph;
    var miss = [!fm.name && 'nama', !fm.email && 'email', !fm.phone && 'nomor telepon'].filter(Boolean);
    if (miss.length) { this.bubble('ai', 'Terima kasih. Saya masih butuh ' + miss.join(' dan ') + ' Anda.'); return; }
    this.busy = true; this.syncSend();
    this.submitLead({ name: fm.name, email: fm.email, company: fm.company, phone: fm.phone }, 'chat_inline').then(function () {
      self.busy = false;
      self.collect = null; self.ta.placeholder = self.V().ph;
      self.bubble('ai', 'Data sudah saya catat, ' + fm.name.split(/\s+/)[0] + '. Sekarang soal pertanyaan Anda tadi.');
      var p = self.pendingQ; self.pendingQ = '';
      self.ask(p, true);
    }, function () {
      self.busy = false; self.syncSend();
      self.showErr('Gagal menyimpan data. Kirim ulang data Anda.');
    });
  };

  Widget.prototype.ask = function (q, already) {
    var self = this;
    if (!already) this.bubble('me', q);
    this.showErr('');
    this.busy = true; this.syncSend(); this.thinking(true);
    var hist = this.history.slice(-(this.cfg.historyLimit || 12));
    var msgId = uid('m');
    var aiEl = null;
    this.ensureSession().then(function (sid) {
      return self.api.chat({
        session_id: sid,
        visitor_id: self.visitorId,
        variant: self.cfg.variant,
        message_id: msgId,
        message: q,
        history: hist,
        context: {
          profile: self.profile(),
          recommendations: { shown: self.order.map(function (r) { return r[0]; }), selected: self.sel ? self.sel.slice() : [], confirmed: self.picked },
          lead_id: self.leadId || null,
          page: { url: location.href, title: document.title }
        },
        locale: 'id-ID',
        sent_at: now()
      }, function (partial) {
        if (!aiEl) { self.thinking(false); aiEl = self.bubble('ai', ''); }
        aiEl.textContent = partial; self.scroll();
      });
    }).then(function (r) {
      var text = String(r && r.reply || '').replace(/\*\*/g, '').trim() || 'Maaf, saya belum menemukan jawabannya. Boleh dijelaskan lebih spesifik?';
      self.thinking(false);
      if (aiEl) { aiEl.textContent = text; self.transcript[self.transcript.length - 1].text = text; }
      else self.bubble('ai', text);
      self.history.push({ role: 'user', content: q, message_id: msgId }, { role: 'assistant', content: text, message_id: r && r.message_id || null });
      self.busy = false; self.syncSend();
      self.setStatus('Online · live agent');
    }, function () {
      self.thinking(false);
      if (aiEl) aiEl.remove();
      self.busy = false; self.syncSend();
      self.ta.value = self.ta.value || q; self.syncSend();
      self.showErr('Koneksi ke asisten terputus. Coba kirim ulang.');
      self.setStatus('Online · live agent');
    });
  };

  Widget.prototype.setVariant = function (v) {
    if (!(v in VARIANTS)) return;
    var wasOpen = this.isOpen;
    this.close();
    this.cfg.variant = v;
    this.sessionId = null; this.sessionP = null;
    this.reset(); this.started = false;
    this.applyTheme();
    this.dock.querySelector('.dl').textContent = this.cfg.dockLabel || this.V().dock;
    if (wasOpen) this.open();
  };

  Widget.prototype.destroy = function () {
    this.close();
    document.removeEventListener('keydown', this.onKeyDoc);
    this.host.remove();
  };

  // ── API publik ─────────────────────────────────────────────────────────
  var instance = null;
  var Talita = {
    __loaded: true,
    variants: Object.keys(VARIANTS),
    init: function (opts) {
      if (instance) instance.destroy();
      var cfg = Object.assign({ apiBase: '/api/talita', siteKey: '', variant: 'utama', timeout: 30000, stream: true, credentials: 'omit', loadFonts: true }, opts || {});
      if (!(cfg.variant in VARIANTS)) cfg.variant = 'utama';
      if (cfg.loadFonts && !document.getElementById('talita-fonts')) {
        document.head.appendChild(el('link', { id: 'talita-fonts', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap' }));
      }
      var go = function () { instance = new Widget(cfg); if (cfg.autoOpen) instance.open(); };
      if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
      return Talita;
    },
    open: function () { instance && instance.open(); },
    close: function () { instance && instance.close(); },
    setVariant: function (v) { instance && instance.setVariant(v); },
    identify: function (lead) { if (instance) instance.lead = Object.assign({ name: '', email: '', company: '', phone: '' }, lead); },
    destroy: function () { instance && instance.destroy(); instance = null; }
  };
  window.Talita = Talita;

  // Auto-init dari atribut <script data-api ...>
  var me = document.currentScript;
  if (me && me.hasAttribute('data-api')) {
    Talita.init({
      apiBase: me.getAttribute('data-api'),
      siteKey: me.getAttribute('data-key') || '',
      variant: me.getAttribute('data-variant') || 'utama',
      stream: me.getAttribute('data-stream') !== 'false',
      autoOpen: me.getAttribute('data-open') === 'true'
    });
  }
})();
