"""Generate reproducible smart-city access logs -> data/sample-data.csv.

A generator (not a static file) so the data is reproducible (fixed seed) and we
can mix normal + suspicious patterns in a controlled way.

CSV columns: timestamp, source_ip, device, action, status
  - normal traffic    -> work hours, low frequency, status=OK
  - 3 suspicious cases -> recon scan, brute force, night access

Run: python scripts/gen_sample_data.py   (from the backend/ dir)
"""

import csv
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# backend/scripts/gen_sample_data.py -> parents[2] is the repository root.
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "sample-data.csv"

DAY = datetime(2026, 6, 20)

DEVICES = [
    "Svetofor-Mərkəz-1", "Svetofor-Şimal-2", "Kamera-Park-1",
    "Kamera-Meydan-2", "SuSayğacı-Rayon-3", "İşıqlandırma-Bulvar",
    "ŞəhərPortalı", "SCADA-Nəzarət",
]
NORMAL_IPS = ["10.0.0.11", "10.0.0.12", "10.0.0.15", "10.0.0.21", "10.0.0.24"]


def normal_rows(rng):
    """Normal traffic: spread across work hours, low frequency, successful."""
    rows = []
    for _ in range(55):
        hour = int(rng.integers(8, 20))
        minute = int(rng.integers(0, 60))
        second = int(rng.integers(0, 60))
        ts = DAY + timedelta(hours=hour, minutes=minute, seconds=second)
        rows.append([ts, rng.choice(NORMAL_IPS), rng.choice(DEVICES),
                     rng.choice(["READ", "STATUS", "STREAM"]), "OK"])
    return rows


def recon_scan():
    """Suspicious #1 — recon: one external IP touches many devices at night."""
    rows = []
    ip = "45.142.120.50"
    start = DAY + timedelta(hours=2, minutes=14, seconds=3)
    for i, device in enumerate(DEVICES):
        rows.append([start + timedelta(seconds=i * 5), ip, device, "PROBE", "DENIED"])
    return rows


def brute_force():
    """Suspicious #2 — brute force: repeated failed portal logins."""
    rows = []
    ip = "45.142.120.50"
    start = DAY + timedelta(hours=11, minutes=32)
    for i in range(9):
        rows.append([start + timedelta(seconds=i * 3), ip, "ŞəhərPortalı", "LOGIN", "FAILED"])
    return rows


def night_access():
    """Suspicious #3 — single off-hours access to a sensitive SCADA device."""
    ip = "185.220.101.7"
    ts = DAY + timedelta(hours=3, minutes=47, seconds=20)
    return [[ts, ip, "SCADA-Nəzarət", "CONFIG_READ", "OK"]]


def main():
    rng = np.random.default_rng(7)
    rows = normal_rows(rng) + recon_scan() + brute_force() + night_access()
    rows.sort(key=lambda r: r[0])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "source_ip", "device", "action", "status"])
        for ts, ip, device, action, status in rows:
            writer.writerow([ts.isoformat(), ip, device, action, status])

    print(f"Wrote: {OUT}  ({len(rows)} rows)")


if __name__ == "__main__":
    main()
