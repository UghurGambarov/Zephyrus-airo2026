// "Log Analysis Center" modal — upload real logs + Syslog/Windows/CEF converter.

import { useState } from "react";

import { convert, FORMATS } from "../../lib/logConverter";

export function LogCenterModal({ onClose, onAnalyze, onSample, busy }) {
  const [format, setFormat] = useState("syslog");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null); // { rows, mapping } or { xeta }

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
  const FAILED = ["FAILED", "DENIED", "ERROR", "BLOCKED", "UNAUTHORIZED"];

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

          <textarea
            className="lc-raw"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setResult(null);
            }}
            placeholder="Xam log məzmunu burada görünəcək (və ya birbaşa yapışdırın)..."
          />

          <div className="lc-map">
            <span className="lc-map-t">Avtomatik sahə xəritələməsi:</span>
            {f.mapping.map(([from, to]) => (
              <span key={from} className="lc-pair">
                <i>{from}</i> → <b>{to}</b>
              </span>
            ))}
          </div>

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
                        <td className={FAILED.includes((r.status || "").toUpperCase()) ? "st-bad" : "st-ok"}>
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
