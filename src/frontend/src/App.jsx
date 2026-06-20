// =====================================================================
// Zephyrus — "City Trap" SOC İDARƏ PANELİ (Faza 5)
// ---------------------------------------------------------------------
// Üç zonalı təhlükəsizlik əməliyyat mərkəzi (SOC) konsolu:
//   SOL    → "Şəhər Şəbəkəsi": real şəhər (yollar+bloklar+parklar) üzərində
//            ~14 IoT cihazı (real=yaşıl, şübhəli=sarı, vurulan=qırmızı).
//   MƏRKƏZ → "Canlı Siqnallar": səhifələnmiş hadisə jurnalı; risk rəng-kodlu.
//   SAĞ    → "İnsident Hesabatı": seçilmiş siqnalın Azərbaycanca hesabatı.
//
// Yuxarıdakı "🔴 Hücumu Başlat" düyməsi bütün aşkarlama zəncirini canlı işə salır.
// Frontend backend-i HƏR 1 SANİYƏDƏ "polling" ilə soruşur (WebSocket yoxdur — sadəlik).
// =====================================================================

import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { convert, FORMATS } from "./logConverter";

// Backend serverin lokal ünvanı.
const BACKEND = "http://127.0.0.1:8010";

// Risk səviyyəsini CSS sinfinə çevirən köməkçi (rəng kodu üçün).
const RISK_CLASS = { yüksək: "risk-high", orta: "risk-mid", aşağı: "risk-low" };

// =====================================================================
// ŞƏHƏR XƏRİTƏSİ ÜÇÜN KONFİQURASİYA (Feature 3 — interaktiv SVG şəhər)
// ---------------------------------------------------------------------
// Xəritə artıq REAL kiçik şəhər kimi qurulub: yol şəbəkəsi (küçələr +
// kəsişmələr), ~14 bina bloku/məhəlləsi və 2 park. IoT cihazları binaların
// İÇİNDƏ yox, REALİSTİK yerlərdə durur: kəsişmələrdə svetofor/trafik
// sensoru, bank yanında bankomat, yollarda kamera, parklarda hava sensoru.
// Bütün koordinatlar viewBox "0 0 640 580" daxilindədir.
// =====================================================================

// Yol şəbəkəsi — şaquli və üfüqi küçələrin mərkəz xətləri (kəsişmələr formalaşır).
const ROADS_V = [150, 320, 490];
const ROADS_H = [160, 310, 455];
const ROAD_W = 28; // küçə eni

// Bina blokları (məhəllələr). t = tip (rəng çaları üçün).
const BUILDINGS = [
  { x: 28,  y: 28,  w: 108, h: 118, label: "HÖKUMƏT",      t: "gov" },
  { x: 164, y: 28,  w: 142, h: 118, label: "BƏLƏDİYYƏ",    t: "gov" },
  { x: 334, y: 28,  w: 142, h: 118, label: "BANK MƏRKƏZİ", t: "bank" },
  { x: 504, y: 28,  w: 108, h: 118, label: "TİCARƏT M.",   t: "bank" },
  { x: 28,  y: 174, w: 108, h: 122, label: "YAŞAYIŞ",      t: "res" },
  { x: 334, y: 174, w: 142, h: 122, label: "OFİS QÜLLƏSİ", t: "office" },
  { x: 504, y: 174, w: 108, h: 122, label: "BANK FİLİALI", t: "bank" },
  { x: 28,  y: 324, w: 108, h: 117, label: "XƏSTƏXANA",    t: "health" },
  { x: 164, y: 324, w: 142, h: 117, label: "MƏKTƏB",       t: "edu" },
  { x: 504, y: 324, w: 108, h: 117, label: "DATA MƏRKƏZİ", t: "data" },
  { x: 28,  y: 469, w: 108, h: 87,  label: "SƏNAYE",       t: "industry" },
  { x: 164, y: 469, w: 142, h: 87,  label: "ANBAR",        t: "industry" },
  { x: 334, y: 469, w: 142, h: 87,  label: "SU STANSİYASI",t: "industry" },
  { x: 504, y: 469, w: 108, h: 87,  label: "ENERGETİKA",   t: "industry" },
];

// Yaşıl sahələr (parklar) — ağac nöqtələri ilə.
const PARKS = [
  { x: 164, y: 174, w: 142, h: 122, label: "MƏRKƏZİ PARK", trees: [[200, 215], [240, 250], [275, 210]] },
  { x: 334, y: 324, w: 142, h: 117, label: "MEYDAN PARKI", trees: [[368, 360], [410, 400], [445, 358]] },
];

// Hər qovşağın xəritədəki MÖVQEYİ (küçə/kəsişmə/park), ikonu, rayonu və
// idarə etdiyi cihaz sayı.
const MAP_LAYOUT = {
  "srv-01":  { x: 558, y: 382, ico: "🖥", rayon: "Data Mərkəzi",   cihaz: 142 },
  "tl-01":   { x: 150, y: 160, ico: "🚦", rayon: "Mərkəz kəsişməsi", cihaz: 24 },
  "ts-01":   { x: 320, y: 160, ico: "📡", rayon: "Bank kəsişməsi",   cihaz: 18 },
  "cam-01":  { x: 490, y: 235, ico: "📹", rayon: "Şərq bulvarı",     cihaz: 36 },
  "atm-01":  { x: 442, y: 160, ico: "🏧", rayon: "Bank Mərkəzi",     cihaz: 1 },
  "atm-02":  { x: 490, y: 310, ico: "🏧", rayon: "Bank Filialı",     cihaz: 1 },
  "env-01":  { x: 235, y: 235, ico: "🌿", rayon: "Mərkəzi Park",     cihaz: 12 },
  "env-02":  { x: 405, y: 382, ico: "🌿", rayon: "Meydan Parkı",     cihaz: 12 },
  "mtr-01":  { x: 320, y: 455, ico: "💧", rayon: "Su Stansiyası",    cihaz: 74 },
  "d-cam":   { x: 150, y: 310, ico: "📹", rayon: "Qərb bulvarı",     cihaz: 0 },
  "d-tl":    { x: 490, y: 455, ico: "🚦", rayon: "Cənub kəsişməsi",  cihaz: 0 },
  "d-atm":   { x: 368, y: 310, ico: "🏧", rayon: "Meydan",          cihaz: 0 },
  "d-portal":{ x: 150, y: 455, ico: "🏛", rayon: "Xidmət qapısı",    cihaz: 0 },
  "d-canary":{ x: 558, y: 455, ico: "🔑", rayon: "Data Mərkəzi",     cihaz: 0 },
};

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
  "ts-01":  ["TrafikSensoru", "Sensor"],
  "cam-01": ["Kamera"],
  "atm-01": ["Bankomat-1"],
  "atm-02": ["Bankomat-2"],
  "env-01": ["Hava"],
  "env-02": ["Park"],
  "mtr-01": ["Su"],
  "srv-01": ["Data", "SCADA", "Server"],
};

// Vəziyyət → Azərbaycanca status mətni (tooltip üçün).
const STATE_TEXT = {
  normal: "Normal əməliyyat",
  scan: "Şübhəli skan aşkarlandı",
  attack: "Kritik hücum altında",
};

// Bir qovşağın CANLI vəziyyətini siqnallardan çıxarır (yaşıl/sarı/qırmızı).
// alerts onsuz da ən yenidən köhnəyə doğru sıralanıb (backend reversed).
function deriveStatus(node, alerts, ignoreHit = false) {
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
  // (Canlı axın gedərkən ignoreHit=true olur ki, cihaz yalnız ÖZ siqnalı
  //  ekrana "axanda" yansın — backend polling onu vaxtından əvvəl yandırmasın.)
  if (!ignoreHit && node.status === "hit") {
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
  // Canlı axında siqnalların pilləli (staggered) görünməsi üçün:
  // active=simulyasiya gedir, order=görünmüş siqnal id-ləri (gəlmə sırası ilə).
  const [reveal, setReveal] = useState({ active: false, order: [] });
  // Canlı Siqnallar üçün səhifələmə (event log): səhifə ölçüsü + cari səhifə.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
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

  // Siqnalları CANLI axında pilləli (staggered) və QEYRİ-BƏRABƏR (irregular)
  // gecikmə ilə göstərir. Hücum ~15 saniyəyə yayılır; aralıqlar təsadüfidir
  // (bəzən sürətli partlayış, bəzən qısa fasilə) → real SOC axını kimi görünür.
  // Hər addımda yalnız BİR cihaz "yanır", hamısı eyni anda yox.
  const TOPLAM_MUDDET = 14500; // ms — hücum axınının təxmini ümumi müddəti
  const scheduleReveal = (yeniSiqnallar) => {
    const xronoloji = [...yeniSiqnallar].reverse(); // köhnədən → yeniyə
    const n = xronoloji.length || 1;
    const ortaAralig = TOPLAM_MUDDET / n;
    let t = 500; // ilk siqnala qədər qısa gözləmə
    let sonGecikme = t;
    xronoloji.forEach((a) => {
      setTimeout(() => {
        setReveal((r) => (r.active ? { ...r, order: [...r.order, a.id] } : r));
      }, t);
      sonGecikme = t;
      // Növbəti aralıq: orta aralığın 0.45x–1.7x-i (qeyri-bərabər ritm).
      t += ortaAralig * (0.45 + Math.random() * 1.25);
    });
    // Hamısı görünəndən sonra normal rejimə qayıt.
    setTimeout(() => setReveal((r) => ({ active: false, order: r.order })), sonGecikme + 900);
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
    setPage(0);
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

  const hucumBaslat = () => runSimulyasiya("/api/simulate-attack", { story: true });
  const loglariAnaliz = () => runSimulyasiya("/api/analyze-logs", { story: false });

  // Log Analiz Mərkəzindən gələn (çevrilmiş) sətirləri ML mühərrikinə göndərir.
  const analyzeUploadedRows = async (rows) => {
    setBusy(true);
    setSelectedId(null);
    setAiReport(null);
    setLogCenter(false);
    setPage(0);
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
    setPage(0);
    setReveal({ active: false, order: [] });
    setStory({ open: false, phase: 0, lines: [], done: false });
    post("/api/reset");
  };

  // "Daxili nümunə CSV" → modalı bağla, sonra daxili nümunəni analiz et
  // (davranış "ML Mühərrikinə Göndər" ilə eyni: modal qapanır + axın başlayır).
  const numuneCSV = () => {
    setLogCenter(false);
    loglariAnaliz();
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

  // --- Səhifələmə (event log) ---
  // Canlı axın gedərkən səhifələmə dayanır (hamısı axır); bitəndən sonra
  // istifadəçi köhnə hadisələri Əvvəlki/Sonrakı ilə gəzə bilir.
  const toplamSehife = Math.max(1, Math.ceil(feedAlerts.length / pageSize));
  const cariSehife = reveal.active ? 0 : Math.min(page, toplamSehife - 1);
  const sehifeAlerts = reveal.active
    ? feedAlerts
    : feedAlerts.slice(cariSehife * pageSize, cariSehife * pageSize + pageSize);
  const ilkNo = feedAlerts.length === 0 ? 0 : cariSehife * pageSize + 1;
  const sonNo = Math.min((cariSehife + 1) * pageSize, feedAlerts.length);

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
          <CityMap
            nodes={state.nodes || []}
            alerts={reveal.active ? feedAlerts : alerts}
            revealing={reveal.active}
            flashId={enYeniId}
          />
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
            {sehifeAlerts.map((a) => (
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

          {/* Səhifələmə paneli (canlı axın gedərkən gizlədilir) */}
          {!reveal.active && feedAlerts.length > 0 && (
            <div className="pager">
              <div className="pager-size">
                <span>Səhifədə:</span>
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    className={`pg-size ${pageSize === n ? "on" : ""}`}
                    onClick={() => {
                      setPageSize(n);
                      setPage(0);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="pager-nav">
                <button
                  className="pg-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={cariSehife <= 0}
                >
                  ‹ Əvvəlki
                </button>
                <span className="pg-info">
                  {ilkNo}–{sonNo} / {feedAlerts.length}
                </span>
                <button
                  className="pg-btn"
                  onClick={() => setPage((p) => Math.min(toplamSehife - 1, p + 1))}
                  disabled={cariSehife >= toplamSehife - 1}
                >
                  Sonrakı ›
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ---------- SAĞ: İNSİDENT HESABATI ---------- */}
        <section className="zona zona-report">
          <ZonaBasliq nomre="03" ad="İnsident Hesabatı" alt="Sİ hazırlayır · insan təsdiqləyir" />
          <ReportPanel
            alert={selected}
            alerts={alerts}
            stats={stats}
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
          onSample={numuneCSV}
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

// Bir qovşağın verilmiş siqnala uyğun gəlib-gəlmədiyini yoxlayır (flash üçün).
function nodeMatchesAlert(n, a) {
  if (!a) return false;
  if (n.type === "decoy") return a.source_kind === n.kind;
  const prefs = REAL_MATCH[n.id] || [];
  return prefs.some((p) => (a.source_kind || "").startsWith(p));
}

// İnteraktiv ŞƏHƏR xəritəsi (SVG). Yol şəbəkəsi + bina blokları + parklar üstündə
// IoT cihazları canlı vəziyyətə görə rənglənir: yaşıl=təhlükəsiz, sarı=şübhəli
// skan, qırmızı(nəbzli)=aktiv hücum. Cihaz öz siqnalı ekrana "axanda" yanır.
function CityMap({ nodes, alerts, revealing, flashId }) {
  // Üzərinə gəlinən qovşaq (glassmorphism tooltip üçün).
  const [hover, setHover] = useState(null);
  // Tam ekran rejimi.
  const [full, setFull] = useState(false);

  const hub = MAP_LAYOUT["srv-01"]; // Data Mərkəzi (şəbəkə mərkəzi)
  const flashAlert = flashId ? alerts.find((a) => a.id === flashId) : null;

  // Hər qovşaq üçün mövqe + canlı status. Canlı axında polling "hit"-i nəzərə
  // alınmır (ignoreHit), beləcə cihaz yalnız öz siqnalı axanda yanır.
  const enriched = nodes
    .map((n) => {
      const lay = MAP_LAYOUT[n.id];
      const st = deriveStatus(n, alerts, revealing);
      const flash = revealing && nodeMatchesAlert(n, flashAlert);
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
        <svg viewBox="0 0 640 580" className="citymap" preserveAspectRatio="xMidYMid meet"
             role="img" aria-label="Ağıllı şəhər infrastruktur xəritəsi">
          {/* --- Yol şəbəkəsi (küçələr + kəsişmələr) --- */}
          <g className="roads">
            {ROADS_H.map((y) => (
              <g key={`rh-${y}`}>
                <rect className="road" x="14" y={y - ROAD_W / 2} width="612" height={ROAD_W} />
                <line className="road-dash" x1="20" y1={y} x2="620" y2={y} />
              </g>
            ))}
            {ROADS_V.map((x) => (
              <g key={`rv-${x}`}>
                <rect className="road" x={x - ROAD_W / 2} y="14" width={ROAD_W} height="552" />
                <line className="road-dash" x1={x} y1="20" x2={x} y2="560" />
              </g>
            ))}
          </g>

          {/* --- Bina blokları (məhəllələr) --- */}
          {BUILDINGS.map((b) => (
            <g key={b.label} className={`bld bld-${b.t}`}>
              <rect className="bld-base" x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
              <rect className="bld-roof" x={b.x + 5} y={b.y + 5} width={b.w - 10} height="14" rx="3" />
              <text className="bld-label" x={b.x + b.w / 2} y={b.y + b.h - 9} textAnchor="middle">
                {b.label}
              </text>
            </g>
          ))}

          {/* --- Parklar (yaşıl sahələr + ağaclar) --- */}
          {PARKS.map((p) => (
            <g key={p.label} className="park">
              <rect className="park-base" x={p.x} y={p.y} width={p.w} height={p.h} rx="8" />
              {p.trees.map(([tx, ty], i) => (
                <circle key={i} className="tree" cx={tx} cy={ty} r="7" />
              ))}
              <text className="park-label" x={p.x + p.w / 2} y={p.y + p.h - 8} textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}

          {/* --- Şəbəkə əlaqələri: hər cihaz → Data Mərkəzi (incə) --- */}
          {enriched.map((e) =>
            e.n.id === "srv-01" ? null : (
              <line key={`l-${e.n.id}`} className={`netline ${e.st.state}`}
                    x1={hub.x} y1={hub.y} x2={e.lay.x} y2={e.lay.y} />
            )
          )}

          {/* --- IoT cihaz markerləri --- */}
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
  // Faizlə mövqe (viewBox 640x580). Yuxarı sıradakılar üçün tooltip aşağı açılır.
  const left = `${(lay.x / 640) * 100}%`;
  const top = `${(lay.y / 580) * 100}%`;
  const below = lay.y < 200;
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

// İnsident üçün ədədi statistika (KPI) hesablayır.
function hesablaStats(alerts, stats) {
  const list = alerts || [];
  const decoy = list.filter((a) => a.is_decoy).length;
  const yuksek = list.filter((a) => a.risk === "yüksək").length;
  const cihazlar = new Set(list.map((a) => a.source_kind).filter(Boolean));
  const ortaBal = list.length
    ? Math.round(list.reduce((s, a) => s + (a.anomaly_score || 0), 0) / list.length)
    : 0;
  return {
    hadise: stats?.total_events ?? list.length,
    siqnal: stats?.total_alerts ?? list.length,
    yuksek: stats?.high_risk ?? yuksek,
    tele: decoy,
    cihaz: cihazlar.size,
    ortaBal,
  };
}

// Sağ paneldəki insident hesabatı.
function ReportPanel({ alert, alerts, stats, aiReport, aiLoading, onAi }) {
  if (!alert) {
    return (
      <div className="report-empty">
        <p>Bir siqnal seçin və ya hücum başladın.</p>
        <p className="dim">Seçilən siqnalın tam Azərbaycanca hesabatı burada görünəcək.</p>
      </div>
    );
  }
  const rep = alert.report || {};
  const m = hesablaStats(alerts, stats);
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

      {/* İnsidentin ədədi göstəriciləri (statistika) */}
      <div className="rep-stats">
        <Metric value={m.hadise} label="HADİSƏ" />
        <Metric value={m.siqnal} label="SİQNAL" />
        <Metric value={m.yuksek} label="YÜKSƏK RİSK" tone="red" />
        <Metric value={m.tele} label="TƏLƏ VURĞUSU" tone="red" />
        <Metric value={m.cihaz} label="HƏDƏF CİHAZ" />
        <Metric value={`${m.ortaBal}`} label="ORTA ML BALI" tone="cyan" />
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

// İnsident hesabatındakı ədədi göstərici kartı (KPI).
function Metric({ value, label, tone }) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ""}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
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
            <button className="btn btn-ghost" onClick={doConvert} disabled={!raw.trim()}>
              🔄 Çevir
            </button>
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
