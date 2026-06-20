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

  // Düymə əməlləri.
  // QEYD: yeni hücum/analiz hadisələri sıfırdan nömrələdiyi üçün köhnə "selectedId"
  // səhvən başqa siqnala uyğun gələ bilər. Buna görə seçimi də sıfırlayırıq ki,
  // hesabat paneli avtomatik olaraq ən yeni siqnalı göstərsin.
  // Xəritədəki ardıcıl animasiyanı başlat (rejim: 'attack' | 'logs' | 'reset').
  const fireSeq = (mode) => {
    setSeqMode(mode);
    setSeqTrigger((t) => t + 1);
  };
  const hucumBaslat = () => {
    setSelectedId(null);
    setAiReport(null);
    fireSeq("attack");
    post("/api/simulate-attack");
  };
  const loglariAnaliz = () => {
    setSelectedId(null);
    setAiReport(null);
    fireSeq("logs");
    post("/api/analyze-logs");
  };
  const temizle = () => {
    setSelectedId(null);
    setAiReport(null);
    fireSeq("reset");
    post("/api/reset");
  };

  // Göstəriləcək siqnal: istifadəçi seçibsə o, yoxsa ən yenisi (siyahının başı).
  const alerts = state.alerts || [];
  const selected = alerts.find((a) => a.id === selectedId) || alerts[0] || null;

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
          <button className="btn btn-ghost" onClick={loglariAnaliz} disabled={busy}>
            📄 Logları Analiz Et
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
          <ZonaBasliq nomre="02" ad="Canlı Siqnallar" alt="Ən yeni yuxarıda" />
          <div className="feed-head">
            <span>VAXT</span>
            <span>MƏNBƏ</span>
            <span>TƏHLÜKƏ</span>
            <span>MITRE</span>
            <span>ML</span>
            <span>RİSK</span>
          </div>
          <div className="feed">
            {alerts.length === 0 && (
              <div className="empty">
                Hələ siqnal yoxdur. Yuxarıdan <b>🔴 Hücumu Başlat</b> düyməsinə basın.
              </div>
            )}
            {alerts.map((a) => (
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

// Mərkəzdəki canlı siqnal sətri.
function AlertRow({ alert, active, onClick }) {
  return (
    <button className={`row ${active ? "active" : ""}`} onClick={onClick}>
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

export default App;
