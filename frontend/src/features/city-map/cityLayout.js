// Static layout configuration for the interactive SVG city map.
// The map is a small real city: a road network (streets + intersections),
// ~14 building blocks, and 2 parks. IoT devices sit at realistic locations.
// All coordinates are within the viewBox "0 0 640 580".

// Road network — center lines of vertical and horizontal streets.
export const ROADS_V = [150, 320, 490];
export const ROADS_H = [160, 310, 455];
export const ROAD_W = 28;

// Building blocks. t = type (for colour shade).
export const BUILDINGS = [
  { x: 28, y: 28, w: 108, h: 118, label: "HÖKUMƏT", t: "gov" },
  { x: 164, y: 28, w: 142, h: 118, label: "BƏLƏDİYYƏ", t: "gov" },
  { x: 334, y: 28, w: 142, h: 118, label: "BANK MƏRKƏZİ", t: "bank" },
  { x: 504, y: 28, w: 108, h: 118, label: "TİCARƏT M.", t: "bank" },
  { x: 28, y: 174, w: 108, h: 122, label: "YAŞAYIŞ", t: "res" },
  { x: 334, y: 174, w: 142, h: 122, label: "OFİS QÜLLƏSİ", t: "office" },
  { x: 504, y: 174, w: 108, h: 122, label: "BANK FİLİALI", t: "bank" },
  { x: 28, y: 324, w: 108, h: 117, label: "XƏSTƏXANA", t: "health" },
  { x: 164, y: 324, w: 142, h: 117, label: "MƏKTƏB", t: "edu" },
  { x: 504, y: 324, w: 108, h: 117, label: "DATA MƏRKƏZİ", t: "data" },
  { x: 28, y: 469, w: 108, h: 87, label: "SƏNAYE", t: "industry" },
  { x: 164, y: 469, w: 142, h: 87, label: "ANBAR", t: "industry" },
  { x: 334, y: 469, w: 142, h: 87, label: "SU STANSİYASI", t: "industry" },
  { x: 504, y: 469, w: 108, h: 87, label: "ENERGETİKA", t: "industry" },
];

// Green areas (parks) with tree points.
export const PARKS = [
  { x: 164, y: 174, w: 142, h: 122, label: "MƏRKƏZİ PARK", trees: [[200, 215], [240, 250], [275, 210]] },
  { x: 334, y: 324, w: 142, h: 117, label: "MEYDAN PARKI", trees: [[368, 360], [410, 400], [445, 358]] },
];

// Per-node map position, icon, district, and managed-device count.
export const MAP_LAYOUT = {
  "srv-01": { x: 558, y: 382, ico: "🖥", rayon: "Data Mərkəzi", cihaz: 142 },
  "tl-01": { x: 150, y: 160, ico: "🚦", rayon: "Mərkəz kəsişməsi", cihaz: 24 },
  "ts-01": { x: 320, y: 160, ico: "📡", rayon: "Bank kəsişməsi", cihaz: 18 },
  "cam-01": { x: 490, y: 235, ico: "📹", rayon: "Şərq bulvarı", cihaz: 36 },
  "atm-01": { x: 442, y: 160, ico: "🏧", rayon: "Bank Mərkəzi", cihaz: 1 },
  "atm-02": { x: 490, y: 310, ico: "🏧", rayon: "Bank Filialı", cihaz: 1 },
  "env-01": { x: 235, y: 235, ico: "🌿", rayon: "Mərkəzi Park", cihaz: 12 },
  "env-02": { x: 405, y: 382, ico: "🌿", rayon: "Meydan Parkı", cihaz: 12 },
  "mtr-01": { x: 320, y: 455, ico: "💧", rayon: "Su Stansiyası", cihaz: 74 },
  "d-cam": { x: 150, y: 310, ico: "📹", rayon: "Qərb bulvarı", cihaz: 0 },
  "d-tl": { x: 490, y: 455, ico: "🚦", rayon: "Cənub kəsişməsi", cihaz: 0 },
  "d-atm": { x: 368, y: 310, ico: "🏧", rayon: "Meydan", cihaz: 0 },
  "d-portal": { x: 150, y: 455, ico: "🏛", rayon: "Xidmət qapısı", cihaz: 0 },
  "d-canary": { x: 558, y: 455, ico: "🔑", rayon: "Data Mərkəzi", cihaz: 0 },
};

// Name prefixes that bind a real node to a CSV/attack event.
// (Decoy nodes match directly via their "kind".)
export const REAL_MATCH = {
  "tl-01": ["Svetofor"],
  "ts-01": ["TrafikSensoru", "Sensor"],
  "cam-01": ["Kamera"],
  "atm-01": ["Bankomat-1"],
  "atm-02": ["Bankomat-2"],
  "env-01": ["Hava"],
  "env-02": ["Park"],
  "mtr-01": ["Su"],
  "srv-01": ["Data", "SCADA", "Server"],
};

// Node state -> Azerbaijani status text (tooltip).
export const STATE_TEXT = {
  normal: "Normal əməliyyat",
  scan: "Şübhəli skan aşkarlandı",
  attack: "Kritik hücum altında",
};

// Does a node match a given alert? (Used for flashing on reveal.)
export function nodeMatchesAlert(n, a) {
  if (!a) return false;
  if (n.type === "decoy") return a.source_kind === n.kind;
  const prefs = REAL_MATCH[n.id] || [];
  return prefs.some((p) => (a.source_kind || "").startsWith(p));
}

// Derive a node's live state (normal/scan/attack) from the alerts.
// alerts are already newest-first (backend reversed).
export function deriveStatus(node, alerts, ignoreHit = false) {
  const match = alerts.find((a) => nodeMatchesAlert(node, a));
  if (match) {
    const state =
      match.risk === "high" ? "attack" : match.risk === "medium" ? "scan" : "normal";
    return {
      state,
      threat: match.threat_class,
      ml: match.anomaly_score,
      ip: match.source_ip,
      time: match.time,
    };
  }
  if (!ignoreHit && node.status === "hit") {
    return { state: "attack", threat: "Tələ vuruldu", ml: null, ip: null, time: node.last_hit };
  }
  return { state: "normal", threat: null, ml: null, ip: null, time: null };
}
