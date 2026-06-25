"""Engine orchestrator: assemble a complete alert for one event.

This is the main entry point used by decoys, ingestion, and the attack
simulator, guaranteeing every source is scored by the same pipeline.
"""

from app.core.constants import DECOY_MAP, RISK_HIGH
from app.engine.classify import build_reason, classify_stream
from app.engine.features import extract_features
from app.engine.model import score_anomaly
from app.engine.report import template_report


def build_alert(event, all_events, is_decoy, source_kind):
    """Build a full threat alert for one event (decoy or city stream)."""
    vector, info = extract_features(event, all_events)
    score = score_anomaly(vector)  # Layer 1 — ML anomaly score (always computed)

    if is_decoy:
        # Decoy hit: deterministic classification + always high risk.
        mapping = DECOY_MAP[source_kind]
        threat_class = mapping["threat_class"]
        mitre, mitre_name = mapping["mitre"], mapping["mitre_name"]
        risk = RISK_HIGH
        reason = mapping["reason"] + f" (ML anomaliya balı: {score}/100)"
    else:
        # City stream: Layer 2 hybrid classification (ML + rules).
        threat_class, mitre, mitre_name, risk = classify_stream(info, score)
        reason = build_reason(score, info)

    alert = {
        "event_id": event["id"],
        "timestamp": event["timestamp"],
        "time": event["time"],
        "source_ip": event["source_ip"],
        "source_kind": source_kind,
        "is_decoy": is_decoy,
        "threat_class": threat_class,
        "mitre": mitre,
        "mitre_name": mitre_name,
        "risk": risk,
        "anomaly_score": score,
        "features": info,
        "reason": reason,
        "admin_alert": "Administrator xəbərdar edildi (simulyasiya).",
    }
    # Layer 3 — attach the offline Azerbaijani incident report.
    alert["report"] = template_report(alert)
    return alert
