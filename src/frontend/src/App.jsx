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
const BACKEND = "http://127.0.0.1:8000";

// Risk səviyyəsini CSS sinfinə çevirən köməkçi (rəng kodu üçün).
const RISK_CLASS = { yüksək: "risk-high", orta: "risk-mid", aşağı: "risk-low" };

function App() {
  // Backend-dən gələn bütün vəziyyət: siqnallar, node-lar, statistika.
  const [state, setState] = useState({ alerts: [], nodes: [], stats: {} });
  const [online, setOnline] = useState(false);          // backend əlçatandır?
  const [selectedId, setSelectedId] = useState(null);   // seçilmiş siqnalın id-si
  const [busy, setBusy] = useState(false);              // düymə əməliyyatı gedir?
  const [aiReport, setAiReport] = useState(null);       // opsional Sİ hesabatı
  const [aiLoading, setAiLoading] = useState(false);

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
  const hucumBaslat = () => {
    setSelectedId(null);
    setAiReport(null);
    post("/api/simulate-attack");
  };
  const loglariAnaliz = () => {
    setSelectedId(null);
    setAiReport(null);
    post("/api/analyze-logs");
  };
  const temizle = () => {
    setSelectedId(null);
    setAiReport(null);
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
        {/* ---------- SOL: ŞƏHƏR ŞƏBƏKƏSİ ---------- */}
        <section className="zona zona-net">
          <ZonaBasliq nomre="01" ad="Şəhər Şəbəkəsi" alt="Qovşaqlar və tələlər" />
          <div className="node-grid">
            {(state.nodes || []).map((n) => (
              <NodeCard key={n.id} node={n} />
            ))}
          </div>
          <div className="legend">
            <span><i className="lg lg-green" /> Real qurğu</span>
            <span><i className="lg lg-grey" /> Tələ (decoy)</span>
            <span><i className="lg lg-red" /> Vuruldu</span>
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

// Bir şəhər qovşağı (real və ya tələ). Vurulanda qırmızı yanıb-sönür.
function NodeCard({ node }) {
  const vuruldu = node.status === "hit";
  const cls = vuruldu ? "hit" : node.type === "decoy" ? "decoy" : "real";
  return (
    <div className={`node ${cls}`} title={node.ad}>
      <span className="node-ico">{vuruldu ? "⚠" : node.type === "decoy" ? "◌" : "▣"}</span>
      <span className="node-ad">{node.ad}</span>
      <span className="node-meta">
        {node.type === "decoy" ? "TƏLƏ" : "REAL"}
        {node.last_hit ? ` · ${node.last_hit}` : ""}
      </span>
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
