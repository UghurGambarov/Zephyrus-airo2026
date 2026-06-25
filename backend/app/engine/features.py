"""Feature extraction: turn a raw event into a 4-number ML feature vector.

Features:
  1) hour             — hour of the event (0-23). Off-hours access is suspicious.
  2) last_minute      — requests from this IP in the last 60s. High -> scan burst.
  3) distinct_devices — distinct device kinds this IP touched. High -> recon.
  4) failed           — did the operation fail (1/0). Repeated -> brute force.
"""

from datetime import datetime

FEATURE_NAMES = ["hour", "last_minute", "distinct_devices", "failed"]


def extract_features(event, all_events):
    """Return (vector, info) for one event.

    all_events: prior events, used to inspect this IP's recent behaviour.
    """
    ts = datetime.fromisoformat(event["timestamp"])
    hour = ts.hour
    ip = event["source_ip"]

    # This IP's events within the last 60 seconds (this event included).
    window_start = ts.timestamp() - 60
    recent = [
        e
        for e in all_events
        if e["source_ip"] == ip
        and datetime.fromisoformat(e["timestamp"]).timestamp() >= window_start
    ]
    last_minute = len(recent)
    distinct_devices = len({e["source_kind"] for e in recent})
    failed = 1 if event.get("failed") else 0

    vector = [hour, last_minute, distinct_devices, failed]
    info = {
        "hour": hour,
        "last_minute": last_minute,
        "distinct_devices": distinct_devices,
        "failed": failed,
        "off_hours": hour < 7 or hour >= 21,
    }
    return vector, info
