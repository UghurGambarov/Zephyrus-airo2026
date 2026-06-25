// Interactive SVG city map. Roads + building blocks + parks, with IoT devices
// coloured live by state: green = safe, amber = suspicious scan, red (pulsing)
// = active attack. A device lights up when its own alert reaches the feed.

import { useState } from "react";

import { shortName } from "../../lib/format";
import {
  BUILDINGS,
  MAP_LAYOUT,
  PARKS,
  ROADS_H,
  ROADS_V,
  ROAD_W,
  STATE_TEXT,
  deriveStatus,
  nodeMatchesAlert,
} from "./cityLayout";

export function CityMap({ nodes, alerts, revealing, flashId }) {
  const [hover, setHover] = useState(null);
  const [full, setFull] = useState(false);

  const hub = MAP_LAYOUT["srv-01"];
  const flashAlert = flashId ? alerts.find((a) => a.id === flashId) : null;

  // During live reveal, polling "hit" is ignored so a device lights only when
  // its own alert streams in.
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
      <button
        className="map-full-btn"
        onClick={() => setFull((f) => !f)}
        title={full ? "Bağla" : "Tam ekran"}
      >
        {full ? "✕" : "⛶"}
      </button>
      <div className="citymap-stage">
        <svg
          viewBox="0 0 640 580"
          className="citymap"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Ağıllı şəhər infrastruktur xəritəsi"
        >
          {/* Road network */}
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

          {/* Building blocks */}
          {BUILDINGS.map((b) => (
            <g key={b.label} className={`bld bld-${b.t}`}>
              <rect className="bld-base" x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
              <rect className="bld-roof" x={b.x + 5} y={b.y + 5} width={b.w - 10} height="14" rx="3" />
              <text className="bld-label" x={b.x + b.w / 2} y={b.y + b.h - 9} textAnchor="middle">
                {b.label}
              </text>
            </g>
          ))}

          {/* Parks */}
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

          {/* Network links: each device -> Data Center */}
          {enriched.map((e) =>
            e.n.id === "srv-01" ? null : (
              <line
                key={`l-${e.n.id}`}
                className={`netline ${e.st.state}`}
                x1={hub.x}
                y1={hub.y}
                x2={e.lay.x}
                y2={e.lay.y}
              />
            )
          )}

          {/* IoT device markers */}
          {enriched.map((e) => (
            <Marker key={e.n.id} e={e} onHover={setHover} />
          ))}
        </svg>

        {hover && <MapTooltip hover={hover} />}
      </div>
    </div>
  );
}

function Marker({ e, onHover }) {
  const { n, lay, st, flash } = e;
  const label = shortName(n.name);
  const w = label.length * 6.6 + 18;
  return (
    <g
      className={`mk ${st.state} ${flash ? "flash" : ""}`}
      transform={`translate(${lay.x},${lay.y})`}
      onMouseEnter={() => onHover({ name: n.name, type: n.type, lay, st })}
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

function MapTooltip({ hover }) {
  const { name, type, lay, st } = hover;
  const left = `${(lay.x / 640) * 100}%`;
  const top = `${(lay.y / 580) * 100}%`;
  const below = lay.y < 200;
  const transform = below ? "translate(-50%, 20px)" : "translate(-50%, calc(-100% - 18px))";
  const cihazLabel = st.state === "attack" ? "Təsirlənmiş cihaz" : "İdarə olunan cihaz";

  return (
    <div className="map-tip" style={{ left, top, transform }}>
      <div className={`map-tip-head ${st.state}`}>
        <span>📍 {name}</span>
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
