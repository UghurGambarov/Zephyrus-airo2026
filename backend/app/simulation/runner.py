"""Server-side attack simulator.

Injects a realistic attack sequence directly into the engine (recon ->
exploitation -> brute force -> exfiltration). Powers the dashboard
"Start Attack" button. Ethics: this is our own simulation — it touches no real
system; the attacker IP is fictional.
"""

from app.core.constants import RISK_HIGH, RISK_MEDIUM
from app.engine import build_alert
from app.store import store

# Fictional attacker IP.
ATTACKER_IP = "45.142.120.50"

# Attack sequence. Each step: (source_kind, action, detail, is_decoy, failed).
ATTACK_STEPS = [
    # 1) Recon — a distinct, realistic scan per device category.
    ("Svetofor-Mərkəz", "PROBE", "ICS/Modbus port skanı: Svetofor #1 yoxlanılır", False, True),
    ("TrafikSensoru-1", "PROBE", "Trafik sensoru şəbəkə kəşfiyyatı (intersection)", False, True),
    ("Kamera-Yol-1", "PROBE", "RTSP/ONVIF port yoxlanışı: Yol Kamerası", False, True),
    ("Bankomat-1", "PROBE", "Bankomat şəbəkəsinə kəşfiyyat skanı (#1)", False, True),
    ("Su-Sayğacı", "PROBE", "SCADA/Modbus skanı: Su Sayğacı stansiyası", False, True),
    ("Data-Mərkəz", "PROBE", "Data Mərkəzi xidmət kəşfi (service/port scan)", False, True),
    # 2) Exploitation — different attack types against decoys (per category).
    ("camera", "GET /decoy/camera/stream", "Saxta kamera axınına icazəsiz giriş — RTSP hijack", True, False),
    ("traffic_light", "POST /decoy/traffic-light/modbus", "Saxta svetofora icazəsiz Modbus əmri — siqnal manipulyasiyası", True, False),
    ("atm", "POST /decoy/atm/dispense", "Saxta bankomatda 'jackpotting' (nağd çıxarma) cəhdi", True, True),
    # 3) Brute force — repeated failed portal logins.
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #1 (admin)", True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #2 (root)", True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #3 (P@ssw0rd)", True, True),
    # 4) Escalation — malicious ATM firmware + canary token exfiltration.
    ("atm", "POST /decoy/atm/firmware", "Saxta bankomata zərərli firmware yükləmə cəhdi", True, True),
    ("canary", "GET /decoy/canary/admin_credentials.txt", "Canary token oxundu (saxta admin parolları)", True, False),
]


def _inject(source_kind, action, detail, is_decoy, failed) -> bool:
    event = store.add_event(ATTACKER_IP, source_kind, action, detail, failed=failed)
    alert = build_alert(event, store.snapshot_events(), is_decoy=is_decoy, source_kind=source_kind)
    if is_decoy or alert["risk"] in (RISK_MEDIUM, RISK_HIGH):
        store.add_alert(alert)
        return True
    return False


def simulate_attack(reset_first=True):
    """Run the full attack sequence. Returns a summary."""
    if reset_first:
        store.reset()

    alert_count = sum(_inject(*step) for step in ATTACK_STEPS)
    state = store.get_state()
    return {
        "message": "Hücum simulyasiyası tamamlandı.",
        "event_count": len(ATTACK_STEPS),
        "alert_count": alert_count,
        "high_risk": state["stats"]["high_risk"],
    }
