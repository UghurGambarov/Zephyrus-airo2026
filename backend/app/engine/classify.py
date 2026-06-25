"""Layer 2 — classification & risk (hybrid ML + rules).

Combines deterministic behaviour rules with the ML anomaly score to assign a
threat class, risk level, and MITRE ATT&CK label. Threat-class text is kept in
Azerbaijani (user-facing); identifiers and risk values are English.
"""

from app.core.constants import RISK_HIGH, RISK_LOW, RISK_MEDIUM


def classify_stream(info, score):
    """Classify a city-stream event (not a decoy).

    Returns: (threat_class, mitre, mitre_name, risk).
    """
    if info["distinct_devices"] >= 3:
        threat_class, mitre, mitre_name = "Kəşfiyyat / Şəbəkə Skanı", "T1046", "Şəbəkə Xidməti Kəşfi"
    elif info["failed"] and info["last_minute"] >= 3:
        threat_class, mitre, mitre_name = "Brute Force / Parol Hücumu", "T1110", "Brute Force"
    elif info["off_hours"]:
        threat_class, mitre, mitre_name = "İcazəsiz Giriş", "T1078", "Etibarlı Hesablardan Sui-istifadə"
    elif score >= 50:
        threat_class, mitre, mitre_name = "Anomal Davranış", "T1595", "Aktiv Skanlama"
    else:
        threat_class, mitre, mitre_name = "Normal Fəaliyyət", "-", "-"

    if threat_class == "Normal Fəaliyyət":
        risk = RISK_HIGH if score >= 80 else (RISK_MEDIUM if score >= 50 else RISK_LOW)
    elif threat_class == "Brute Force / Parol Hücumu":
        risk = RISK_HIGH if (info["failed"] and info["last_minute"] >= 5) else RISK_MEDIUM
    elif score >= 70:
        risk = RISK_HIGH
    else:
        risk = RISK_MEDIUM

    return threat_class, mitre, mitre_name, risk


def build_reason(score, info) -> str:
    """Explain (in Azerbaijani) why the anomaly score is what it is."""
    signals = []
    if info["off_hours"]:
        signals.append(f"iş-kənarı saatda giriş (saat {info['hour']})")
    if info["last_minute"] >= 4:
        signals.append(f"qısa müddətdə çox sorğu ({info['last_minute']}/dəq — skan partlayışı)")
    if info["distinct_devices"] >= 3:
        signals.append(f"çox sayda fərqli cihaza müraciət ({info['distinct_devices']} cihaz — kəşfiyyat)")
    if info["failed"]:
        signals.append("uğursuz giriş cəhdi")
    if signals:
        return f"Anomaliya balı {score}/100. Səbəb: " + "; ".join(signals) + "."
    return f"Anomaliya balı {score}/100. Trafik normaldan bir qədər kənardır."
