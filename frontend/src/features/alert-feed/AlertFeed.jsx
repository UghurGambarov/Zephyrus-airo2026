// Center zone: the live alert feed with pagination.

import { FLASH_CLASS, RISK_CLASS, RISK_LABEL } from "../../lib/format";

export function AlertFeed({
  alerts,
  pageAlerts,
  selected,
  onSelect,
  revealing,
  pageSize,
  onPageSize,
  page,
  totalPages,
  onPrev,
  onNext,
  firstNo,
  lastNo,
}) {
  return (
    <>
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
        {pageAlerts.map((a) => (
          <AlertRow
            key={a.id}
            alert={a}
            active={selected && selected.id === a.id}
            onClick={() => onSelect(a.id)}
          />
        ))}
      </div>

      {!revealing && alerts.length > 0 && (
        <div className="pager">
          <div className="pager-size">
            <span>Səhifədə:</span>
            {[5, 10, 15].map((n) => (
              <button
                key={n}
                className={`pg-size ${pageSize === n ? "on" : ""}`}
                onClick={() => onPageSize(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="pager-nav">
            <button className="pg-btn" onClick={onPrev} disabled={page <= 0}>
              ‹ Əvvəlki
            </button>
            <span className="pg-info">
              {firstNo}–{lastNo} / {alerts.length}
            </span>
            <button className="pg-btn" onClick={onNext} disabled={page >= totalPages - 1}>
              Sonrakı ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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
      <span className={`c-risk ${RISK_CLASS[alert.risk] || ""}`}>
        {RISK_LABEL[alert.risk] || alert.risk}
      </span>
    </button>
  );
}
