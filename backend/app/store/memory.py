"""In-memory state store: events, alerts, and city nodes.

No database — all state lives in RAM and resets on restart. This is the single
replacement point for a future persistence layer (see roadmap). Node display
names are Azerbaijani (user-facing); keys are English.
"""

from datetime import datetime
from threading import Lock

from app.core.constants import RISK_HIGH


def _initial_nodes():
    return [
        # Real smart-city IoT devices.
        {"id": "srv-01", "name": "Data Mərkəzi", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "tl-01", "name": "Svetofor #1", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "ts-01", "name": "Trafik Sensoru", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "cam-01", "name": "Yol Kamerası", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "atm-01", "name": "Bankomat #1", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "atm-02", "name": "Bankomat #2", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "env-01", "name": "Hava Sensoru", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "env-02", "name": "Park Sensoru", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        {"id": "mtr-01", "name": "Su Sayğacı", "type": "real", "kind": None, "status": "normal", "last_hit": None},
        # 5 decoys.
        {"id": "d-cam", "name": "Saxta Kamera (tələ)", "type": "decoy", "kind": "camera", "status": "normal", "last_hit": None},
        {"id": "d-tl", "name": "Saxta Svetofor (tələ)", "type": "decoy", "kind": "traffic_light", "status": "normal", "last_hit": None},
        {"id": "d-atm", "name": "Saxta Bankomat (tələ)", "type": "decoy", "kind": "atm", "status": "normal", "last_hit": None},
        {"id": "d-portal", "name": "Saxta Şəhər Portalı", "type": "decoy", "kind": "portal", "status": "normal", "last_hit": None},
        {"id": "d-canary", "name": "Canary Token Faylı", "type": "decoy", "kind": "canary", "status": "normal", "last_hit": None},
    ]


class Store:
    """Single in-memory state container (one instance per process)."""

    def __init__(self):
        self._lock = Lock()
        self.reset()

    def reset(self):
        with self._lock:
            self.events = []
            self.alerts = []
            self.nodes = _initial_nodes()
            self._counter = 0
            self.logs_analyzed = 0

    def _next_id(self):
        self._counter += 1
        return self._counter

    def add_event(self, source_ip, source_kind, action, detail, failed=False, ts=None):
        """Record a raw event and return it.

        ts: the event's own time (datetime); defaults to now. Needed when
        loading historical events from a log file.
        """
        with self._lock:
            now = ts if ts is not None else datetime.now()
            event = {
                "id": self._next_id(),
                "timestamp": now.isoformat(),
                "time": now.strftime("%H:%M:%S"),
                "source_ip": source_ip,
                "source_kind": source_kind,
                "action": action,
                "detail": detail,
                "failed": bool(failed),
            }
            self.events.append(event)
            self._mark_node_hit(source_kind, now.strftime("%H:%M:%S"))
            return event

    def snapshot_events(self):
        with self._lock:
            return list(self.events)

    def add_alert(self, alert):
        with self._lock:
            alert["id"] = self._next_id()
            self.alerts.append(alert)
            return alert

    def _mark_node_hit(self, kind, time):
        if not kind:
            return
        for n in self.nodes:
            if n["kind"] == kind:
                n["status"] = "hit"
                n["last_hit"] = time

    def get_state(self):
        """Full current state — polled by the frontend every second."""
        with self._lock:
            high = len([a for a in self.alerts if a.get("risk") == RISK_HIGH])
            return {
                "alerts": list(reversed(self.alerts)),  # newest first
                "nodes": self.nodes,
                "stats": {
                    "total_events": len(self.events),
                    "total_alerts": len(self.alerts),
                    "high_risk": high,
                    "logs_analyzed": self.logs_analyzed,
                },
            }


store = Store()
