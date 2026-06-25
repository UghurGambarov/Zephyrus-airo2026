// Presentation helpers shared across features.
//
// The backend uses English risk values (high/medium/low) as the wire contract;
// the UI maps them to localized Azerbaijani labels and CSS classes here.

export const RISK_LABEL = { high: "yüksək", medium: "orta", low: "aşağı" };
export const RISK_CLASS = { high: "risk-high", medium: "risk-mid", low: "risk-low" };
export const FLASH_CLASS = { high: "flash-high", medium: "flash-mid", low: "flash-low" };

// Shorten a long node name for a map label.
export function shortName(name) {
  return name
    .replace(" (tələ)", "")
    .replace("Kontrolleri", "")
    .replace("Şəbəkəsi", "")
    .trim();
}
