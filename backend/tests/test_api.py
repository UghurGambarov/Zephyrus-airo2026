"""API smoke tests using FastAPI's TestClient."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_state_shape():
    client.post("/api/reset")
    state = client.get("/api/state").json()
    assert set(state) == {"alerts", "nodes", "stats"}
    assert len(state["nodes"]) == 14  # 9 real + 5 decoys
    assert {"total_events", "total_alerts", "high_risk", "logs_analyzed"} <= set(state["stats"])


def test_simulate_attack_produces_high_risk_alerts():
    summary = client.post("/api/simulate-attack").json()
    assert summary["alert_count"] > 0
    assert summary["high_risk"] > 0
    state = client.get("/api/state").json()
    assert any(a["is_decoy"] for a in state["alerts"])


def test_decoy_endpoints_raise_alerts():
    client.post("/api/reset")
    assert client.get("/decoy/traffic-light").status_code == 200
    assert client.post("/decoy/atm/dispense").status_code == 200
    assert client.get("/decoy/camera/stream").status_code == 200
    state = client.get("/api/state").json()
    kinds = {a["source_kind"] for a in state["alerts"]}
    assert {"traffic_light", "atm", "camera"} <= kinds


def test_analyze_sample_logs():
    result = client.post("/api/analyze-logs").json()
    assert result["analyzed"] > 0
    assert "alerts_created" in result
