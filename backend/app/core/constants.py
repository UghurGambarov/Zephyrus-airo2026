"""Shared constants: risk levels, decoy threat mapping, status vocabulary.

User-facing string *values* (threat classes, MITRE names, reasons) are kept in
Azerbaijani — the product's target locale. Keys and identifiers are English.
"""

# Risk levels (logical enum). The frontend maps these to localized labels.
RISK_HIGH = "high"
RISK_MEDIUM = "medium"
RISK_LOW = "low"

# Status values (from logs) that count as a failed operation (an ML signal).
FAILED_STATUSES = {"FAILED", "DENIED", "UNAUTHORIZED", "ERROR", "BLOCKED"}

# Decoy kind -> deterministic threat classification.
# A hit on a decoy is always high risk (zero false positives).
DECOY_MAP = {
    "traffic_light": {
        "threat_class": "İcazəsiz SCADA/ICS Girişi",
        "mitre": "T0846",
        "mitre_name": "Uzaq Sistem Kəşfi (ICS)",
        "reason": "Saxta svetofor kontrollerinə (SCADA/Modbus tələsi) icazəsiz giriş edildi.",
    },
    "portal": {
        "threat_class": "Brute Force / Parol Hücumu",
        "mitre": "T1110",
        "mitre_name": "Brute Force",
        "reason": "Saxta şəhər portalına giriş cəhdi edildi (parol sınağı / brute-force siqnalı).",
    },
    "canary": {
        "threat_class": "Məxfi Məlumata Giriş (Canary)",
        "mitre": "T1552",
        "mitre_name": "Qorunmamış Etimadnamələr",
        "reason": "Canary token faylı (saxta admin parolları) oxundu — sızma cəhdinin güclü əlaməti.",
    },
    "camera": {
        "threat_class": "İcazəsiz Kamera/Cihaz Girişi",
        "mitre": "T0846",
        "mitre_name": "Cihaz Kəşfi (ICS/IoT)",
        "reason": "Saxta kamera axınına (RTSP/HTTP tələsi) icazəsiz giriş edildi.",
    },
    "atm": {
        "threat_class": "Bankomat Manipulyasiyası (Jackpotting)",
        "mitre": "T1496",
        "mitre_name": "Resurs Mənimsəmə / Fiziki Manipulyasiya",
        "reason": "Saxta bankomata icazəsiz əmr göndərildi (nağd çıxarma / zərərli firmware) — maliyyə hücumunun güclü əlaməti.",
    },
}
