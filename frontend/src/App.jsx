// Zephyrus City Trap — SOC console (composition root).
//
// Three zones:
//   LEFT   -> City Network: SVG city map with live device status.
//   CENTER -> Live Alerts: paginated event feed, risk colour-coded.
//   RIGHT  -> Incident Report: the selected alert's report.
//
// "🔴 Start Attack" runs the whole detection chain live. The frontend polls the
// backend every second (no WebSocket — kept simple).

import { useEffect, useState } from "react";

import "./App.css";
import { api } from "./api/client";
import { Stat, ZoneHeading } from "./components/Primitives";
import { AlertFeed } from "./features/alert-feed/AlertFeed";
import { CityMap } from "./features/city-map/CityMap";
import { ReportPanel } from "./features/incident-report/ReportPanel";
import { LogCenterModal } from "./features/log-center/LogCenterModal";
import { STORY } from "./features/simulation/story";
import { StoryModal } from "./features/simulation/StoryModal";

// Total span (ms) over which a live attack is staggered into the feed.
const TOTAL_REVEAL_MS = 14500;

function App() {
  const [state, setState] = useState({ alerts: [], nodes: [], stats: {} });
  const [online, setOnline] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Live staggered reveal: active = simulation running, order = revealed ids.
  const [reveal, setReveal] = useState({ active: false, order: [] });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [story, setStory] = useState({ open: false, phase: 0, lines: [], done: false });
  const [logCenter, setLogCenter] = useState(false);

  // Poll the backend state every second.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const data = await api.getState();
        if (!stopped) {
          setState(data);
          setOnline(true);
        }
      } catch {
        if (!stopped) setOnline(false);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  // Reveal alerts with staggered, irregular delays over ~15s (live SOC feel).
  const scheduleReveal = (newAlerts) => {
    const chronological = [...newAlerts].reverse();
    const n = chronological.length || 1;
    const avgGap = TOTAL_REVEAL_MS / n;
    let t = 500;
    let lastDelay = t;
    chronological.forEach((a) => {
      setTimeout(() => {
        setReveal((r) => (r.active ? { ...r, order: [...r.order, a.id] } : r));
      }, t);
      lastDelay = t;
      t += avgGap * (0.45 + Math.random() * 1.25);
    });
    setTimeout(() => setReveal((r) => ({ active: false, order: r.order })), lastDelay + 900);
  };

  // Narrate the attack story phase by phase.
  const runStory = () => {
    let delay = 350;
    const step = 720;
    STORY.forEach((ph, pi) => {
      ph.lines.forEach((ln) => {
        setTimeout(() => {
          setStory((s) =>
            s.open ? { ...s, phase: pi, lines: [...s.lines, { phase: pi, text: ln }] } : s
          );
        }, delay);
        delay += step;
      });
      delay += 260;
    });
    setTimeout(() => setStory((s) => (s.open ? { ...s, done: true } : s)), delay);
  };

  // Run a backend action, refetch state, then stagger the reveal (+ optional story).
  const runSimulation = async (action, opts) => {
    setBusy(true);
    setSelectedId(null);
    setAiReport(null);
    setPage(0);
    setReveal({ active: true, order: [] });
    if (opts.story) setStory({ open: true, phase: 0, lines: [], done: false });
    try {
      await action();
      const data = await api.getState();
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

  const startAttack = () => runSimulation(api.simulateAttack, { story: true });
  const analyzeLogs = () => runSimulation(api.analyzeLogs, { story: false });

  const analyzeUploadedRows = async (rows) => {
    setBusy(true);
    setSelectedId(null);
    setAiReport(null);
    setLogCenter(false);
    setPage(0);
    setReveal({ active: true, order: [] });
    try {
      await api.analyzeUpload(rows);
      const data = await api.getState();
      setState(data);
      setOnline(true);
      scheduleReveal(data.alerts || []);
    } catch {
      setReveal({ active: false, order: [] });
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setSelectedId(null);
    setAiReport(null);
    setPage(0);
    setReveal({ active: false, order: [] });
    setStory({ open: false, phase: 0, lines: [], done: false });
    api.reset();
  };

  // "Sample CSV" -> close modal, then analyze the bundled sample.
  const useSampleCsv = () => {
    setLogCenter(false);
    analyzeLogs();
  };

  // Alerts to display: during reveal only those revealed so far (newest on top).
  const alerts = state.alerts || [];
  const feedAlerts = reveal.active
    ? reveal.order.map((id) => alerts.find((a) => a.id === id)).filter(Boolean).reverse()
    : alerts;
  const newestId =
    reveal.active && reveal.order.length ? reveal.order[reveal.order.length - 1] : null;
  const selected =
    alerts.find((a) => a.id === selectedId) ||
    alerts.find((a) => a.id === newestId) ||
    feedAlerts[0] ||
    null;

  // Pagination (frozen during live reveal).
  const totalPages = Math.max(1, Math.ceil(feedAlerts.length / pageSize));
  const currentPage = reveal.active ? 0 : Math.min(page, totalPages - 1);
  const pageAlerts = reveal.active
    ? feedAlerts
    : feedAlerts.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const firstNo = feedAlerts.length === 0 ? 0 : currentPage * pageSize + 1;
  const lastNo = Math.min((currentPage + 1) * pageSize, feedAlerts.length);

  const requestAiReport = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiReport(null);
    try {
      setAiReport(await api.aiReport(selected.id));
    } catch {
      setAiReport({ source: "error" });
    } finally {
      setAiLoading(false);
    }
  };

  const stats = state.stats || {};

  return (
    <div className="konsol">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">⬡</span>
          <div>
            <h1>ZEPHYRUS · CITY&nbsp;TRAP</h1>
            <p className="brand-sub">Ağıllı Şəhər üçün Sİ əsaslı Kibertəhlükə Aşkarlama Konsolu</p>
          </div>
        </div>

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

        <div className="actions">
          <button className="btn btn-attack" onClick={startAttack} disabled={busy}>
            🔴 Hücumu Başlat
          </button>
          <button className="btn btn-ghost" onClick={() => setLogCenter(true)} disabled={busy}>
            📂 Log Analiz Mərkəzi
          </button>
          <button className="btn btn-ghost" onClick={clearAll} disabled={busy}>
            ↻ Təmizlə
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="zona zona-net">
          <ZoneHeading number="01" title="Şəhər Şəbəkəsi" subtitle="Canlı infrastruktur xəritəsi" />
          <CityMap
            nodes={state.nodes || []}
            alerts={reveal.active ? feedAlerts : alerts}
            revealing={reveal.active}
            flashId={newestId}
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

        <section className="zona zona-feed">
          <ZoneHeading
            number="02"
            title="Canlı Siqnallar"
            subtitle={reveal.active ? "● CANLI — siqnallar axır..." : "Ən yeni yuxarıda"}
          />
          <AlertFeed
            alerts={feedAlerts}
            pageAlerts={pageAlerts}
            selected={selected}
            onSelect={(id) => {
              setSelectedId(id);
              setAiReport(null);
            }}
            revealing={reveal.active}
            pageSize={pageSize}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(0);
            }}
            page={currentPage}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            firstNo={firstNo}
            lastNo={lastNo}
          />
        </section>

        <section className="zona zona-report">
          <ZoneHeading number="03" title="İnsident Hesabatı" subtitle="Sİ hazırlayır · insan təsdiqləyir" />
          <ReportPanel
            alert={selected}
            alerts={alerts}
            stats={stats}
            aiReport={aiReport}
            aiLoading={aiLoading}
            onAi={requestAiReport}
          />
        </section>
      </main>

      {story.open && (
        <StoryModal story={story} onClose={() => setStory((s) => ({ ...s, open: false }))} />
      )}

      {logCenter && (
        <LogCenterModal
          onClose={() => setLogCenter(false)}
          onAnalyze={analyzeUploadedRows}
          onSample={useSampleCsv}
          busy={busy}
        />
      )}
    </div>
  );
}

export default App;
