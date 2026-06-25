// Right zone: the incident report for the selected alert.

import { Block, Metric, Row } from "../../components/Primitives";
import { RISK_CLASS, RISK_LABEL } from "../../lib/format";

// Numeric KPIs for the incident.
function computeStats(alerts, stats) {
  const list = alerts || [];
  const decoy = list.filter((a) => a.is_decoy).length;
  const high = list.filter((a) => a.risk === "high").length;
  const devices = new Set(list.map((a) => a.source_kind).filter(Boolean));
  const avgScore = list.length
    ? Math.round(list.reduce((s, a) => s + (a.anomaly_score || 0), 0) / list.length)
    : 0;
  return {
    events: stats?.total_events ?? list.length,
    alerts: stats?.total_alerts ?? list.length,
    high: stats?.high_risk ?? high,
    decoy,
    devices: devices.size,
    avgScore,
  };
}

export function ReportPanel({ alert, alerts, stats, aiReport, aiLoading, onAi }) {
  if (!alert) {
    return (
      <div className="report-empty">
        <p>Bir siqnal seçin və ya hücum başladın.</p>
        <p className="dim">Seçilən siqnalın tam Azərbaycanca hesabatı burada görünəcək.</p>
      </div>
    );
  }
  const rep = alert.report || {};
  const m = computeStats(alerts, stats);
  return (
    <div className="report">
      <div className="report-top">
        <div className="report-top-l">
          <span className="report-id">{rep.title || "İNSİDENT HESABATI"}</span>
          <span className={`report-risk ${RISK_CLASS[alert.risk] || ""}`}>
            RİSK: {RISK_LABEL[alert.risk] || alert.risk}
          </span>
        </div>
        <div className="report-mitre">
          {alert.mitre} · {alert.mitre_name}
        </div>
      </div>

      <div className="rep-stats">
        <Metric value={m.events} label="HADİSƏ" />
        <Metric value={m.alerts} label="SİQNAL" />
        <Metric value={m.high} label="YÜKSƏK RİSK" tone="red" />
        <Metric value={m.decoy} label="TƏLƏ VURĞUSU" tone="red" />
        <Metric value={m.devices} label="HƏDƏF CİHAZ" />
        <Metric value={`${m.avgScore}`} label="ORTA ML BALI" tone="cyan" />
      </div>

      <div className="kv">
        <Row k="Təhlükə sinfi" v={alert.threat_class} />
        <Row k="Mənbə IP" v={alert.source_ip} />
        <Row k="Vaxt" v={alert.time} />
        <Row k="ML anomaliya balı" v={`${alert.anomaly_score} / 100`} />
        <Row k="Tələyə düşmə" v={alert.is_decoy ? "Bəli (sıfır yanlış-pozitiv)" : "Xeyr"} />
      </div>

      <Block title="Xülasə" text={rep.summary} />
      <Block title="Niyə bu risk verildi? (izah)" text={rep.explanation} />

      <div className="block">
        <h3>Tövsiyə olunan addımlar</h3>
        <ol className="steps">
          {(rep.recommendations || []).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </div>

      <div className="admin-alert">🔔 {alert.admin_alert}</div>

      <button className="btn btn-ai" onClick={onAi} disabled={aiLoading}>
        {aiLoading ? "Sİ hesabatı hazırlanır…" : "🧠 Sİ Hesabatı (Claude · opsional)"}
      </button>

      {aiReport && (
        <div className="ai-box">
          {aiReport.source === "claude-llm" && aiReport.ai_text ? (
            <>
              <span className="ai-badge ai-on">CLAUDE LLM</span>
              <pre className="ai-text">{aiReport.ai_text}</pre>
            </>
          ) : aiReport.source === "error" ? (
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
