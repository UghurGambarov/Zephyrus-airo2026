"""Unit tests for the detection engine."""

from app.core.constants import RISK_HIGH
from app.engine import build_alert
from app.engine.classify import classify_stream
from app.engine.features import extract_features
from app.engine.model import score_anomaly


def _event(ts, ip="10.0.0.11", kind="cam-01", failed=False, eid=1):
    from datetime import datetime

    dt = datetime.fromisoformat(ts)
    return {
        "id": eid,
        "timestamp": dt.isoformat(),
        "time": dt.strftime("%H:%M:%S"),
        "source_ip": ip,
        "source_kind": kind,
        "failed": failed,
    }


def test_normal_event_scores_low():
    ev = _event("2026-06-20T14:00:00")
    vector, info = extract_features(ev, [ev])
    score = score_anomaly(vector)
    assert 0 <= score <= 100
    assert score < 50  # a single mid-day request is normal


def test_recon_scan_is_classified_as_recon():
    # Same IP touching many distinct device kinds quickly.
    base = "2026-06-20T02:14:0"
    events = [_event(f"{base}{i}", kind=f"dev-{i}", eid=i) for i in range(5)]
    _, info = extract_features(events[-1], events)
    assert info["distinct_devices"] >= 3
    threat_class, mitre, _, _ = classify_stream(info, score_anomaly(extract_features(events[-1], events)[0]))
    assert mitre == "T1046"


def test_decoy_hit_is_always_high_risk():
    ev = _event("2026-06-20T14:00:00", kind="camera")
    alert = build_alert(ev, [ev], is_decoy=True, source_kind="camera")
    assert alert["risk"] == RISK_HIGH
    assert alert["is_decoy"] is True
    assert alert["mitre"]  # has a MITRE label


def test_alert_has_expected_english_keys():
    ev = _event("2026-06-20T14:00:00", kind="atm")
    alert = build_alert(ev, [ev], is_decoy=True, source_kind="atm")
    for key in ("threat_class", "mitre", "mitre_name", "risk", "anomaly_score", "report"):
        assert key in alert
    for key in ("source", "title", "summary", "explanation", "recommendations"):
        assert key in alert["report"]
