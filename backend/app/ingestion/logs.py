"""Log ingestion: feed CSV / uploaded log rows through the detection engine.

Each log row becomes an event; the engine scores it; only suspicious
(medium/high) events surface as alerts. Two sources share this code:
  1) the bundled sample CSV
  2) user-uploaded logs already normalized client-side to
     {timestamp, source_ip, device, action, status}
"""

import csv
from datetime import datetime

from app.core.config import settings
from app.core.constants import FAILED_STATUSES, RISK_HIGH, RISK_MEDIUM
from app.engine import build_alert
from app.store import store


def _parse_ts(value):
    """Parse various timestamp formats to datetime; fall back to now."""
    if not value:
        return datetime.now()
    s = str(value).strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s).replace(tzinfo=None)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return datetime.now()


def analyze_rows(rows, reset_first=True):
    """Run normalized log rows through the engine. Returns a summary."""
    if reset_first:
        store.reset()

    # Sort chronologically (the 60s window depends on order).
    ordered = sorted(((_parse_ts(r.get("timestamp")), r) for r in rows), key=lambda x: x[0])

    analyzed = 0
    alerts_created = 0
    for ts, r in ordered:
        device = r.get("device") or r.get("source_kind") or "naməlum"
        status = str(r.get("status") or "")
        action = r.get("action") or "EVENT"
        ip = r.get("source_ip") or "naməlum"
        failed = status.upper() in FAILED_STATUSES
        detail = f'{action} → {device} [{status or "?"}]'

        event = store.add_event(ip, device, action, detail, failed=failed, ts=ts)
        alert = build_alert(event, store.snapshot_events(), is_decoy=False, source_kind=device)
        analyzed += 1

        if alert["risk"] in (RISK_MEDIUM, RISK_HIGH):
            store.add_alert(alert)
            alerts_created += 1

    store.logs_analyzed += analyzed
    return {
        "analyzed": analyzed,
        "alerts_created": alerts_created,
        "message": f"{analyzed} log sətri analiz edildi, {alerts_created} şübhəli hadisə tapıldı.",
    }


def analyze_csv(reset_first=True):
    """Read and analyze the bundled sample CSV."""
    path = settings.sample_csv_path
    if not path.exists():
        return {"error": f"CSV tapılmadı: {path}"}
    with open(path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return analyze_rows(rows, reset_first=reset_first)
