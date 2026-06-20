// =====================================================================
// Zephyrus — "City Trap" SOC İDARƏ PANELİ (Faza 5)
// ---------------------------------------------------------------------
// Üç zonalı təhlükəsizlik əməliyyat mərkəzi (SOC) konsolu:
//   SOL    → "Şəhər Şəbəkəsi": ~8 qovşaq (real=yaşıl, tələ=boz, vurulan=qırmızı).
//   MƏRKƏZ → "Canlı Siqnallar": ən yeni yuxarıda; risk rəng-kodlu axın.
//   SAĞ    → "İnsident Hesabatı": seçilmiş siqnalın Azərbaycanca hesabatı.
//
// Yuxarıdakı "🔴 Hücumu Başlat" düyməsi bütün aşkarlama zəncirini canlı işə salır.
// Frontend backend-i HƏR 1 SANİYƏDƏ "polling" ilə soruşur (WebSocket yoxdur — sadəlik).
// =====================================================================

import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { convert, FORMATS, SAMPLES } from "./logConverter";

// Backend serverin lokal ünvanı.
const BACKEND = "http://127.0.0.1:8010";

// Risk səviyyəsini CSS sinfinə çevirən köməkçi (rəng kodu üçün).
const RISK_CLASS = { yüksək: "risk-high", orta: "risk-mid", aşağı: "risk-low" };

// =====================================================================
// ŞƏHƏR XƏRİTƏSİ ÜÇÜN KONFİQURASİYA (Feature 3 — interaktiv SVG xəritə)
// ---------------------------------------------------------------------
// Hər qovşağın xəritədəki MÖVQEYİ, ikonu, rayonu və idarə etdiyi cihaz
// sayı. Mövqelər viewBox "0 0 460 470" daxilindədir.
// =====================================================================
const MAP_LAYOUT = {
  "srv-01":   { x: 232, y: 235, ico: "🖥", rayon: "Data Mərkəzi",   cihaz: 142 },
  "cam-01":   { x: 104, y: 92,  ico: "📹", rayon: "Hökumət Rayonu", cihaz: 56 },
  "d-cam":    { x: 178, y: 150, ico: "📹", rayon: "Hökumət Rayonu", cihaz: 0 },
  "d-portal": { x: 352, y: 98,  ico: "🏛", rayon: "Bank Sektoru",    cihaz: 0 },
  "tl-01":    { x: 92,  y: 360, ico: "🚦", rayon: "Sənaye Zonası",   cihaz: 88 },
  "d-tl":     { x: 165, y: 308, ico: "🚦", rayon: "Sənaye Zonası",   cihaz: 0 },
  "mtr-01":   { x: 150, y: 416, ico: "💧", rayon: "Sənaye Zonası",   cihaz: 74 },
  "d-canary": { x: 356, y: 372, ico: "🔑", rayon: "Data Mərkəzi",    cihaz: 0 },
};

// Xəritədəki rayon (district) bölgələri — fon dördbucaqları + etiket.
// Hər rayona fərqli incə rəng çaları (tint) verilir ki, dörd kvadrant
// bir-birindən aydın seçilsin.
const DISTRICTS = [
  { x: 16, y: 26, w: 200, h: 178, label: "HÖKUMƏT RAYONU", tint: "rgba(56,224,216,0.07)" },
  { x: 252, y: 26, w: 192, h: 178, label: "BANK SEKTORU", tint: "rgba(255,179,64,0.07)" },
  { x: 16, y: 252, w: 200, h: 200, label: "SƏNAYE ZONASI", tint: "rgba(61,220,132,0.07)" },
  { x: 252, y: 252, w: 192, h: 200, label: "DATA MƏRKƏZİ", tint: "rgba(170,120,255,0.08)" },
];

// Hücum/analiz zamanı qovşaqların ARDICIL "yanma" sırası (mərhələ-mərhələ).
// Əvvəlcə real cihazlarda kəşfiyyat (sarı), sonra tələlər (qırmızı) "sıçrayır".
const SEQ_ORDER = ["tl-01", "cam-01", "mtr-01", "srv-01", "d-tl", "d-cam", "d-portal", "d-canary"];

// =====================================================================
// HÜCUMÇUNUN SƏYAHƏTİ (Feature 4 — "Simulyasiya İdarə Mərkəzi" modalı)
// ---------------------------------------------------------------------
// Hücum mərhələ-mərhələ, real-vaxtda danışılır. Hər sətir terminal kimi
// bir-bir görünür və gərginlik yaradır. Bu, yalnız VİZUAL hekayədir;
// real ML qiymətləri arxa fonda backend mühərrikindən gəlir (hibrid).
// =====================================================================
const STORY = [
  {
    ad: "Faza 1 — Kəşfiyyat (Reconnaissance)",
    ico: "🔍",
    lines: [
      "🔍 Hədəf təyin edildi: 192.168.10.45 (Maliyyə Serveri)",
      "⚡ Port skanı başladıldı...",
      "✓ Açıq portlar tapıldı: 22 (SSH), 3389 (RDP)",
    ],
  },
  {
    ad: "Faza 2 — Brute Force",
    ico: "🔑",
    lines: [
      "🔑 SSH üçün parol lüğəti ilə hücum (credential stuffing)...",
      "❌ Cəhd 1/10: Giriş rədd edildi (yanlış etimadnamə)",
      "❌ Cəhd 4/10: Giriş rədd edildi",
      "❌ Cəhd 9/10: Giriş rədd edildi",
      "🔓 Cəhd 10/10: UĞURLU! Parol qırıldı [admin:P@ssword123]",
    ],
  },
  {
    ad: "Faza 3 — Yayılma və Data Sızması",
    ico: "🦹",
    lines: [
      "🦹 Giriş əldə olundu. Lokal imtiyaz yüksəldilməsi uğurlu",
      "📂 Verilənlər bazası ehtiyatları üçün qovluqlar skan edilir...",
      "📡 Etimadnamələr çıxarılır, sızma tunelləri hazırlanır",
      "🛡️ TƏLƏ İŞƏ DÜŞDÜ → hərəkət aşkarlandı və bloklandı",
    ],
  },
];

// Real qovşağı CSV/hücum hadisəsinə bağlayan ad-prefiksləri.
// (Tələ qovşaqları birbaşa "kind" sahəsi ilə uyğunlaşır.)
const REAL_MATCH = {
  "tl-01":  ["Svetofor"],
  "cam-01": ["Kamera"],
  "mtr-01": ["SuSayğacı", "Su"],
  "srv-01": ["SCADA", "ŞəhərPortalı", "İşıqlandırma"],
};

// Vəziyyət → Azərbaycanca status mətni (tooltip üçün).
const STATE_TEXT = {
  normal: "Normal əməliyyat",
  scan: "Şübhəli skan aşkarlandı",
  attack: "Kritik hücum altında",
};

// Bir qovşağın CANLI vəziyyətini siqnallardan çıxarır (yaşıl/sarı/qırmızı).
// alerts onsuz da ən yenidən köhnəyə doğru sıralanıb (backend reversed).
function deriveStatus(node, alerts) {
  const match = alerts.find((a) => {
    if (node.type === "decoy") return a.source_kind === node.kind;
    const prefs = REAL_MATCH[node.id] || [];
    return prefs.some((p) => (a.source_kind || "").startsWith(p));
  });
  if (match) {
    const state =
      match.risk === "yüksək" ? "attack" : match.risk === "orta" ? "scan" : "normal";
    return {
      state,
      threat: match.threat_class,
      ml: match.anomaly_score,
      ip: match.source_ip,
      time: match.time,
    };
  }
  // Siqnal tapılmasa, amma backend node-u "vuruldu" kimi işarələyibsə → hücum.
  if (node.status === "hit") {
    return { state: "attack", threat: "Tələ vuruldu", ml: null, ip: null, time: node.last_hit };
  }
  return { state: "normal", threat: null, ml: null, ip: null, time: null };
}

// Uzun qovşaq adını xəritə etiketi üçün qısaldır.
function qisaAd(ad) {
  return ad.replace(" (tələ)", "").replace("Kontrolleri", "").replace("Şəbəkəsi", "").trim();
}

function App() {
  // Backend-dən gələn bütün vəziyyət: siqnallar, node-lar, statistika.
  const [state, setState] = useState({ alerts: [], nodes: [], stats: {} });
  const [online, setOnline] = useState(false);          // backend əlçatandır?
  const [selectedId, setSelectedId] = useState(null);   // seçilmiş siqnalın id-si
  const [busy, setBusy] = useState(false);              // düymə əməliyyatı gedir?
  const [aiReport, setAiReport] = useState(null);       // opsional Sİ hesabatı
  const [aiLoading, setAiLoading] = useState(false);
  // Xəritədə ardıcıl "yanma" animasiyasını başladan tetik (trigger sayğacı + rejim).
  const [seqTrigger, setSeqTrigger] = useState(0);
  const [seqMode, setSeqMode] = useState(null);
  // Canlı axında siqnalların pilləli (staggered) görünməsi üçün:
  // active=simulyasiya gedir, order=görünmüş siqnal id-ləri (gəlmə sırası ilə).
  const [reveal, setReveal] = useState({ active: false, order: [] });
  // "Simulyasiya İdarə Mərkəzi" modalı (hücum hekayəsi).
  const [story, setStory] = useState({ open: false, phase: 0, lines: [], done: false });
  // "Log Analiz Mərkəzi" modalı (real fayl yükləmə + çevirici).
  const [logCenter, setLogCenter] = useState(false);

  // --- HƏR 1 SANİYƏDƏ backend-dən vəziyyəti çəkirik (canlı yenilənmə) ---
  useEffect(() => {
    let durdu = false;
    const cek = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/state`);
        const data = await r.json();
        if (!durdu) {
          setState(data);
          setOnline(true);
        }
      } catch {
        if (!durdu) setOnline(false);
      }
    };
    cek(); // dərhal bir dəfə
    const t = setInterval(cek, 1000); // sonra hər saniyə
    return () => {
      durdu = true;
      clearInterval(t);
    };
  }, []);

  // Backend-ə POST sorğusu göndərən ümumi köməkçi (düymələr üçün).
  const post = useCallback(async (yol) => {
    setBusy(true);
    try {
      await fetch(`${BACKEND}${yol}`, { method: "POST" });
    } catch {
      /* offline olsa belə UI dağılmasın */
    } finally {
      setBusy(false);
    }
  }, []);

  // Xəritədəki ardıcıl animasiyanı başlat (rejim: 'attack' | 'logs' | 'reset').
  const fireSeq = (mode) => {
    setSeqMode(mode);
    setSeqTrigger((t) => t + 1);
  };

  // Siqnalları CANLI axında pilləli (staggered) və təsadüfi gecikmə ilə göstərir.
  // Bu, real SIEM-də log toplanma gecikməsini (jitter) təqlid edir — siqnallar
  // tam xronoloji yox, bir az qarışıq sırada "gəlir".
  const scheduleReveal = (yeniSiqnallar) => {
    const xronoloji = [...yeniSiqnallar].reverse(); // köhnədən → yeniyə
    let sonGecikme = 0;
    xronoloji.forEach((a, i) => {
      const gecikme = i * 360 + Math.random() * 340; // pilləli + jitter
      sonGecikme = Math.max(sonGecikme, gecikme);
      setTimeout(() => {
        setReveal((r) => (r.active ? { ...r, order: [...r.order, a.id] } : r));
      }, gecikme);
    });
    // Hamısı görünəndən sonra normal rejimə qayıt.
    setTimeout(() => setReveal((r) => ({ active: false, order: r.order })), sonGecikme + 700);
  };

  // "Simulyasiya İdarə Mərkəzi" hekayəsini mərhələ-mərhələ danışır.
  const runStory = () => {
    let gecikme = 350;
    const addim = 720;
    STORY.forEach((ph, pi) => {
      ph.lines.forEach((ln) => {
        setTimeout(() => {
          setStory((s) =>
            s.open ? { ...s, phase: pi, lines: [...s.lines, { phase: pi, text: ln }] } : s
          );
        }, gecikme);
        gecikme += addim;
      });
      gecikme += 260; // fazalar arası qısa fasilə
    });
    setTimeout(() => setStory((s) => (s.open ? { ...s, done: true } : s)), gecikme);
  };

  // Düymə → backend POST → real vəziyyəti çək → pilləli göstər (+ opsional hekayə).
  const runSimulyasiya = async (yol, opts) => {
    setBusy(true);
    setSelectedId(null);
    setAiReport(null);
    fireSeq(opts.seqMode);
    setReveal({ active: true, order: [] });
    if (opts.story) setStory({ open: true, phase: 0, lines: [], done: false });
    try {
      await fetch(`${BACKEND}${yol}`, { method: "POST" });
      const data = await (await fetch(`${BACKEND}/api/state`)).json();
      setState(data);
      setOnline(true);
      scheduleReveal(data.alerts || []);
      if (opts.story) runStory();
    } catch {
      setReveal({ active: false, order: [] });
      setStory((s) => ({ ...s, open: false }));
    } finally {
      setBusy(false);
    }
  };

  const hucumBaslat = () => runSimulyasiya("/api/simulate-attack", { seqMode: "attack", story: true });
  const loglariAnaliz = () => runSimulyasiya("/api/analyze-logs", { seqMode: "logs", story: false });

  // Log Analiz Mərkəzindən gələn (çevrilmiş) sətirləri ML mühərrikinə göndərir.
  const analyzeUploadedRows = async (rows) => {
    setBusy(true);
    setSelectedId(null);
    setAiReport(null);
    setLogCenter(false);
    fireSeq("logs");
    setReveal({ active: true, order: [] });
    try {
      await fetch(`${BACKEND}/api/analyze-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, reset: true }),
      });
      const data = await (await fetch(`${BACKEND}/api/state`)).json();
      setState(data);
      setOnline(true);
      scheduleReveal(data.alerts || []);
    } catch {
      setReveal({ active: false, order: [] });
    } finally {
      setBusy(false);
    }
  };
  const temizle = () => {
    setSelectedId(null);
    setAiReport(null);
    setReveal({ active: false, order: [] });
    setStory({ open: false, phase: 0, lines: [], done: false });
    fireSeq("reset");
    post("/api/reset");
  };

  // Göstəriləcək siqnallar: simulyasiya gedərkən yalnız "gəlmiş" olanlar
  // (ən son gələn yuxarıda); əks halda bütün siqnallar (ən yeni yuxarıda).
  const alerts = state.alerts || [];
  const feedAlerts = reveal.active
    ? reveal.order
        .map((id) => alerts.find((a) => a.id === id))
        .filter(Boolean)
        .reverse()
    : alerts;
  const enYeniId = reveal.active && reveal.order.length ? reveal.order[reveal.order.length - 1] : null;
  const selected =
    alerts.find((a) => a.id === selectedId) ||
    alerts.find((a) => a.id === enYeniId) ||
    feedAlerts[0] ||
    null;

  // Seçilmiş siqnal üçün opsional Sİ (Claude) hesabatı istə.
  const aiHesabatIste = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiReport(null);
    try {
      const r = await fetch(`${BACKEND}/api/report/${selected.id}/ai`, { method: "POST" });
      setAiReport(await r.json());
    } catch {
      setAiReport({ menbe: "xeta" });
    } finally {
      setAiLoading(false);
    }
  };

  const stats = state.stats || {};

  return (
    <div className="konsol">
      {/* ===================== YUXARI PANEL (header) ===================== */}
      <header className="header">
        <div className="brand">
          <span className="brand-mark">⬡</span>
          <div>
            <h1>ZEPHYRUS · CITY&nbsp;TRAP</h1>
            <p className="brand-sub">Ağıllı Şəhər üçün Sİ əsaslı Kibertəhlükə Aşkarlama Konsolu</p>
          </div>
        </div>

        {/* Canlı statistika lövhəsi */}
        <div className="stat-strip">
          <Stat label="HADİSƏ" value={stats.total_events ?? 0} />
          <Stat label="SİQNAL" value={stats.total_alerts ?? 0} />
          <Stat label="YÜKSƏK RİSK" value={stats.high_risk ?? 0} tone="red" />
          <Stat label="LOG" value={stats.logs_analyzed ?? 0} />
          <div className={`link-status ${online ? "on" : "off"}`}>
            <span className="dot" />
            {online ? "BACKEND ONLAYN" : "BACKEND OFFLINE"}
          </div>
        </div>

        {/* Əməl düymələri */}
        <div className="actions">
          <button className="btn btn-attack" onClick={hucumBaslat} disabled={busy}>
            🔴 Hücumu Başlat
          </button>
          <button className="btn btn-ghost" onClick={() => setLogCenter(true)} disabled={busy}>
            📂 Log Analiz Mərkəzi
          </button>
          <button className="btn btn-ghost" onClick={temizle} disabled={busy}>
            ↻ Təmizlə
          </button>
        </div>
      </header>

      {/* ===================== ÜÇ ZONA ===================== */}
      <main className="grid">
        {/* ---------- SOL: ŞƏHƏR ŞƏBƏKƏSİ (interaktiv SVG xəritə) ---------- */}
        <section className="zona zona-net">
          <ZonaBasliq nomre="01" ad="Şəhər Şəbəkəsi" alt="Canlı infrastruktur xəritəsi" />
          <CityMap nodes={state.nodes || []} alerts={alerts} trigger={seqTrigger} mode={seqMode} />
          <div className="legend">
            <span><i className="lg lg-green" /> Təhlükəsiz</span>
            <span><i className="lg lg-amber" /> Şübhəli skan</span>
            <span><i className="lg lg-red" /> Aktiv hücum</span>
          </div>
          <p className="ethic-note">
            ⚖️ Bütün tələlər bizə aiddir və yalnız saxta data saxlayır. Heç bir real
            sistemə toxunulmur — həll tamamilə müdafiə xarakterlidir.
          </p>
        </section>

        {/* ---------- MƏRKƏZ: CANLI SİQNALLAR ---------- */}
        <section className="zona zona-feed">
          <ZonaBasliq
            nomre="02"
            ad="Canlı Siqnallar"
            alt={reveal.active ? "● CANLI — siqnallar axır..." : "Ən yeni yuxarıda"}
          />
          <div className="feed-head">
            <span>VAXT</span>
            <span>MƏNBƏ</span>
            <span>TƏHLÜKƏ</span>
            <span>MITRE</span>
            <span>ML</span>
            <span>RİSK</span>
          </div>
          <div className="feed">
            {feedAlerts.length === 0 && (
              <div className="empty">
                Hələ siqnal yoxdur. Yuxarıdan <b>🔴 Hücumu Başlat</b> düyməsinə basın.
              </div>
            )}
            {feedAlerts.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                active={selected && selected.id === a.id}
                onClick={() => {
                  setSelectedId(a.id);
                  setAiReport(null);
                }}
              />
            ))}
          </div>
        </section>

        {/* ---------- SAĞ: İNSİDENT HESABATI ---------- */}
        <section className="zona zona-report">
          <ZonaBasliq nomre="03" ad="İnsident Hesabatı" alt="Sİ hazırlayır · insan təsdiqləyir" />
          <ReportPanel
            alert={selected}
            aiReport={aiReport}
            aiLoading={aiLoading}
            onAi={aiHesabatIste}
          />
        </section>
      </main>

      {/* Hücum hekayəsi modalı (Simulyasiya İdarə Mərkəzi) */}
      {story.open && (
        <StoryModal story={story} onClose={() => setStory((s) => ({ ...s, open: false }))} />
      )}

      {/* Log Analiz Mərkəzi modalı (real fayl yükləmə + çevirici) */}
      {logCenter && (
        <LogCenterModal
          onClose={() => setLogCenter(false)}
          onAnalyze={analyzeUploadedRows}
          onSample={loglariAnaliz}
          busy={busy}
        />
      )}
    </div>
  );
}

// =====================================================================
// KİÇİK KOMPONENTLƏR (oxunaqlılıq üçün ayrılıb)
// =====================================================================

// Yuxarı statistika rəqəmi.
function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone === "red" ? "stat-red" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Hər zonanın başlığı (nömrə + ad).
function ZonaBasliq({ nomre, ad, alt }) {
  return (
    <div className="zona-basliq">
      <span className="zona-nomre">{nomre}</span>
      <div>
        <h2>{ad}</h2>
        <p>{alt}</p>
      </div>
    </div>
  );
}

// İnteraktiv şəhər xəritəsi (SVG). Qovşaqlar canlı vəziyyətə görə rənglənir:
// yaşıl=təhlükəsiz, sarı=şübhəli skan, qırmızı(nəbzli)=aktiv hücum.
function CityMap({ nodes, alerts, trigger, mode }) {
  // Üzərinə gəlinən qovşaq (glassmorphism tooltip üçün).
  const [hover, setHover] = useState(null);
  // Tam ekran rejimi.
  const [full, setFull] = useState(false);
  // Ardıcıl "yanma": active=animasiya gedir, step=neçə qovşaq açılıb.
  const [seq, setSeq] = useState({ active: false, step: 0 });

  // Düymə basılanda (trigger dəyişəndə) ardıcıllığı başlat / dayandır.
  useEffect(() => {
    if (!trigger) return;
    if (mode === "reset") setSeq({ active: false, step: 0 });
    else setSeq({ active: true, step: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  // Ardıcıllığı mərhələ-mərhələ irəlilət (~600ms aralıqla bir qovşaq).
  useEffect(() => {
    if (!seq.active) return;
    const son = seq.step >= SEQ_ORDER.length;
    const t = setTimeout(() => {
      setSeq((s) => (son ? { active: false, step: SEQ_ORDER.length } : { active: true, step: s.step + 1 }));
    }, 600);
    return () => clearTimeout(t);
  }, [seq.active, seq.step]);

  // Animasiya gedərkən yalnız "açılmış" qovşaqlar öz vəziyyətini göstərir.
  const latestIdx = seq.active ? seq.step - 1 : -1;
  const acilib = (id) => {
    const idx = SEQ_ORDER.indexOf(id);
    if (idx === -1 || !seq.active) return true;
    return idx < seq.step;
  };

  const hub = MAP_LAYOUT["srv-01"]; // mərkəzi server (topologiya mərkəzi)

  // Hər qovşaq üçün mövqe + canlı status (+ ardıcıllıq filtrasiyası).
  const enriched = nodes
    .map((n) => {
      const lay = MAP_LAYOUT[n.id];
      let st = deriveStatus(n, alerts);
      const gorunur = acilib(n.id);
      if (!gorunur) st = { state: "normal", threat: null, ml: null, ip: null, time: null };
      const flash = gorunur && SEQ_ORDER.indexOf(n.id) === latestIdx;
      return { n, lay, st, flash };
    })
    .filter((e) => e.lay);

  return (
    <div className={`citymap-wrap ${full ? "full" : ""}`}>
      <button className="map-full-btn" onClick={() => setFull((f) => !f)}
              title={full ? "Bağla" : "Tam ekran"}>
        {full ? "✕" : "⛶"}
      </button>
      {/* "stage" tooltip-i düz SVG-nin üstünə yerləşdirmək üçün (xüsusən tam ekranda). */}
      <div className="citymap-stage">
        <svg viewBox="0 0 460 470" className="citymap" preserveAspectRatio="xMidYMid meet"
             role="img" aria-label="Şəhər infrastruktur xəritəsi">
          {/* Rayon (district) bölgələri */}
          {DISTRICTS.map((d) => (
            <g key={d.label}>
              <rect className="district" x={d.x} y={d.y} width={d.w} height={d.h} rx="12"
                    style={{ fill: d.tint }} />
              <text className="district-label" x={d.x + 12} y={d.y + 20}>{d.label}</text>
            </g>
          ))}

          {/* Topologiya xətləri: hər qovşaq → mərkəzi server */}
          {enriched.map((e) =>
            e.n.id === "srv-01" ? null : (
              <line key={`l-${e.n.id}`} className={`netline ${e.st.state}`}
                    x1={hub.x} y1={hub.y} x2={e.lay.x} y2={e.lay.y} />
            )
          )}

          {/* Qovşaq markerləri */}
          {enriched.map((e) => (
            <Marker key={e.n.id} e={e} onHover={setHover} />
          ))}
        </svg>

        {hover && <MapTooltip hover={hover} />}
      </div>
    </div>
  );
}

// Xəritədəki bir qovşaq markeri (etiket "card" şəklində fonla).
function Marker({ e, onHover }) {
  const { n, lay, st, flash } = e;
  const label = qisaAd(n.ad);
  const w = label.length * 6.6 + 18; // etiket fonunun (chip) genişliyi
  return (
    <g
      className={`mk ${st.state} ${flash ? "flash" : ""}`}
      transform={`translate(${lay.x},${lay.y})`}
      onMouseEnter={() => onHover({ ad: n.ad, type: n.type, lay, st })}
      onMouseLeave={() => onHover(null)}
    >
      {st.state === "attack" && <circle className="mk-pulse" r="22" />}
      <circle className="mk-halo" r="18" />
      <circle className="mk-core" r="13" />
      <text className="mk-ico" y="6" textAnchor="middle">{lay.ico}</text>
      <rect className="mk-chip" x={-w / 2} y="27" width={w} height="18" rx="6" />
      <text className="mk-label" y="39.5" textAnchor="middle">{label}</text>
    </g>
  );
}

// Üzərinə gələndə açılan şüşəvari (glassmorphism) məlumat qutusu.
function MapTooltip({ hover }) {
  const { ad, type, lay, st } = hover;
  // Faizlə mövqe (viewBox 460x470). Yuxarı sıradakılar üçün tooltip aşağı açılır.
  const left = `${(lay.x / 460) * 100}%`;
  const top = `${(lay.y / 470) * 100}%`;
  const below = lay.y < 180;
  const transform = below ? "translate(-50%, 20px)" : "translate(-50%, calc(-100% - 18px))";
  const cihazLabel = st.state === "attack" ? "Təsirlənmiş cihaz" : "İdarə olunan cihaz";

  return (
    <div className="map-tip" style={{ left, top, transform }}>
      <div className={`map-tip-head ${st.state}`}>
        <span>📍 {ad}</span>
        <i>{type === "decoy" ? "TƏLƏ" : "REAL"}</i>
      </div>
      <Tip k="Status" v={STATE_TEXT[st.state]} />
      <Tip k="Cari təhdid" v={st.threat || "—"} />
      <Tip k="Mənbə IP" v={st.ip || "—"} />
      <Tip k="ML Risk Skoru" v={st.ml != null ? `${st.ml}%` : "—"} />
      <Tip k="Rayon" v={lay.rayon} />
      {lay.cihaz > 0 && <Tip k={cihazLabel} v={`${lay.cihaz}`} />}
    </div>
  );
}

function Tip({ k, v }) {
  return (
    <div className="tip-row">
      <span className="tip-k">{k}</span>
      <span className="tip-v">{v}</span>
    </div>
  );
}

// Risk → sətir "flash" (gəlişdə qırmızı/sarı/yaşıl parıltı) sinfi.
const FLASH_CLASS = { yüksək: "flash-high", orta: "flash-mid", aşağı: "flash-low" };

// Mərkəzdəki canlı siqnal sətri. Gələndə risk rənginə görə qısa parıldayır.
function AlertRow({ alert, active, onClick }) {
  return (
    <button
      className={`row ${active ? "active" : ""} ${FLASH_CLASS[alert.risk] || ""}`}
      onClick={onClick}
    >
      <span className="c-time">{alert.time}</span>
      <span className="c-src">
        {alert.source_ip}
        {alert.is_decoy && <i className="tag-decoy">TƏLƏ</i>}
      </span>
      <span className="c-threat">{alert.threat_class}</span>
      <span className="c-mitre">{alert.mitre}</span>
      <span className="c-ml">
        <i className="ml-bar">
          <i style={{ width: `${alert.anomaly_score}%` }} />
        </i>
        {alert.anomaly_score}
      </span>
      <span className={`c-risk ${RISK_CLASS[alert.risk] || ""}`}>{alert.risk}</span>
    </button>
  );
}

// Sağ paneldəki insident hesabatı.
function ReportPanel({ alert, aiReport, aiLoading, onAi }) {
  if (!alert) {
    return (
      <div className="report-empty">
        <p>Bir siqnal seçin və ya hücum başladın.</p>
        <p className="dim">Seçilən siqnalın tam Azərbaycanca hesabatı burada görünəcək.</p>
      </div>
    );
  }
  const rep = alert.report || {};
  return (
    <div className="report">
      <div className="report-top">
        <div className="report-top-l">
          <span className="report-id">{rep.basliq || "İNSİDENT HESABATI"}</span>
          <span className={`report-risk ${RISK_CLASS[alert.risk] || ""}`}>RİSK: {alert.risk}</span>
        </div>
        <div className="report-mitre">
          {alert.mitre} · {alert.mitre_ad}
        </div>
      </div>

      {/* Əsas faktlar cədvəli */}
      <div className="kv">
        <Row k="Təhlükə sinfi" v={alert.threat_class} />
        <Row k="Mənbə IP" v={alert.source_ip} />
        <Row k="Vaxt" v={alert.time} />
        <Row k="ML anomaliya balı" v={`${alert.anomaly_score} / 100`} />
        <Row k="Tələyə düşmə" v={alert.is_decoy ? "Bəli (sıfır yanlış-pozitiv)" : "Xeyr"} />
      </div>

      <Block title="Xülasə" text={rep.xulase} />
      <Block title="Niyə bu risk verildi? (izah)" text={rep.niye} />

      <div className="block">
        <h3>Tövsiyə olunan addımlar</h3>
        <ol className="steps">
          {(rep.tovsiyeler || []).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </div>

      <div className="admin-alert">🔔 {alert.admin_alert}</div>

      {/* Opsional Sİ (Claude) hesabatı düyməsi */}
      <button className="btn btn-ai" onClick={onAi} disabled={aiLoading}>
        {aiLoading ? "Sİ hesabatı hazırlanır…" : "🧠 Sİ Hesabatı (Claude · opsional)"}
      </button>

      {aiReport && (
        <div className="ai-box">
          {aiReport.menbe === "claude-llm" && aiReport.ai_metn ? (
            <>
              <span className="ai-badge ai-on">CLAUDE LLM</span>
              <pre className="ai-text">{aiReport.ai_metn}</pre>
            </>
          ) : aiReport.menbe === "xeta" ? (
            <span className="ai-badge ai-off">Backend-ə qoşulmaq alınmadı.</span>
          ) : (
            <span className="ai-badge ai-off">
              API açarı (ANTHROPIC_API_KEY) yoxdur — offline şablon hesabatı istifadə olunur.
              Sistem internetsiz də tam işləyir.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="kv-row">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{v}</span>
    </div>
  );
}

function Block({ title, text }) {
  return (
    <div className="block">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

// =====================================================================
// SİMULYASİYA İDARƏ MƏRKƏZİ (modal) — hücumçunun səyahətini real-vaxt danışır.
// =====================================================================
function StoryModal({ story, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-dot" />
            <span className="modal-title">SİMULYASİYA İDARƏ MƏRKƏZİ</span>
          </div>
          <button className="modal-x" onClick={onClose} title="Bağla">✕</button>
        </div>

        {/* Faza göstəriciləri */}
        <div className="phase-strip">
          {STORY.map((ph, i) => {
            const cls = i < story.phase ? "done" : i === story.phase ? "live" : "pending";
            return (
              <div key={ph.ad} className={`phase ${cls}`}>
                <span className="phase-ico">{i < story.phase ? "✓" : ph.ico}</span>
                <span className="phase-ad">{ph.ad}</span>
              </div>
            );
          })}
        </div>

        {/* Terminal-üslublu canlı jurnal */}
        <div className="term">
          {story.lines.map((l, i) => (
            <div key={i} className={`term-line p${l.phase}`}>
              <span className="term-prompt">root@adversary:~$</span> {l.text}
            </div>
          ))}
          {!story.done && <div className="term-cursor">▋</div>}
        </div>

        <div className="modal-foot">
          {story.done ? (
            <span className="foot-done">
              ✓ Simulyasiya tamamlandı — texniki loglar arxa fonda "Canlı Siqnallar"-a düşdü.
            </span>
          ) : (
            <span className="foot-live">● Hücum gedir... loglar real-vaxt toplanır</span>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Bağla</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// LOG ANALİZ MƏRKƏZİ (modal) — real fayl yükləmə + Syslog/Windows/CEF çevirici.
// =====================================================================
function LogCenterModal({ onClose, onAnalyze, onSample, busy }) {
  const [format, setFormat] = useState("syslog");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null); // { rows, mapping } və ya { xeta }

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRaw(String(reader.result || ""));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const doConvert = () => setResult(convert(format, raw));
  const numuneDoldur = () => {
    setRaw(SAMPLES[format]);
    setFileName(`numune-${format}.log`);
    setResult(null);
  };

  const f = FORMATS[format];
  const rows = result && !result.xeta ? result.rows : [];
  const PIS = ["FAILED", "DENIED", "ERROR", "BLOCKED", "UNAUTHORIZED"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="lc-ico">📂</span>
            <span className="modal-title">LOG ANALİZ MƏRKƏZİ</span>
          </div>
          <button className="modal-x" onClick={onClose} title="Bağla">✕</button>
        </div>

        <div className="lc-body">
          <p className="lc-intro">
            Tarixi / forenzik loglarınızı yükləyin. <b>Çevirici</b> onları avtomatik
            platformamızın formatına çevirir, sonra <b>ML mühərriki</b> hər sətrə canlı
            risk balı verir. (Canlı təlim/demo üçün isə yuxarıda <b>🔴 Hücumu Başlat</b>.)
          </p>

          {/* Format + fayl seçimi */}
          <div className="lc-controls">
            <label className="lc-field">
              <span>Mənbə format</span>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setResult(null);
                }}
              >
                {Object.entries(FORMATS).map(([k, v]) => (
                  <option key={k} value={k}>{v.ad}</option>
                ))}
              </select>
            </label>
            <label className="lc-file">
              <input type="file" accept=".log,.txt,.json,.csv,.cef" onChange={onFile} />
              <span>{fileName || "Fayl seç (.log .json .cef .txt)"}</span>
            </label>
            <button className="btn btn-ghost" onClick={numuneDoldur}>Nümunə doldur</button>
          </div>
          <p className="lc-hint">📌 {f.izah}</p>

          {/* Xam log mətni */}
          <textarea
            className="lc-raw"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setResult(null);
            }}
            placeholder="Xam log məzmunu burada görünəcək (və ya birbaşa yapışdırın)..."
          />

          {/* Avtomatik sahə xəritələməsi */}
          <div className="lc-map">
            <span className="lc-map-t">Avtomatik sahə xəritələməsi:</span>
            {f.mapping.map(([from, to]) => (
              <span key={from} className="lc-pair">
                <i>{from}</i> → <b>{to}</b>
              </span>
            ))}
          </div>

          {/* Əməllər */}
          <div className="lc-actions">
            <button className="btn btn-ghost" onClick={doConvert} disabled={!raw.trim()}>
              🔄 Çevir
            </button>
            <button
              className="btn btn-attack"
              onClick={() => onAnalyze(rows)}
              disabled={!rows.length || busy}
            >
              🧠 ML Mühərrikinə Göndər{rows.length ? ` (${rows.length})` : ""}
            </button>
            <button className="btn btn-ghost" onClick={onSample} disabled={busy}>
              Daxili nümunə CSV
            </button>
          </div>

          {/* Çevrilmiş nəticə önizləmə */}
          {result &&
            (result.xeta ? (
              <p className="lc-err">⚠ {result.xeta}</p>
            ) : (
              <div className="lc-preview">
                <div className="lc-prev-head">
                  ✓ {rows.length} sətir çevrildi — ilk {Math.min(5, rows.length)} önizləmə:
                </div>
                <table className="lc-table">
                  <thead>
                    <tr>
                      <th>timestamp</th><th>source_ip</th><th>device</th><th>action</th><th>status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{(r.timestamp || "").replace("T", " ").slice(0, 19)}</td>
                        <td>{r.source_ip}</td>
                        <td>{r.device}</td>
                        <td>{r.action}</td>
                        <td className={PIS.includes((r.status || "").toUpperCase()) ? "st-bad" : "st-ok"}>
                          {r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default App;
