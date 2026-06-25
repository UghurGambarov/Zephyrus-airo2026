"""Standalone HTTP attacker (dev/demo only).

Sends real HTTP requests to our own local server (127.0.0.1) to trigger the
decoys. Ethics: targets only 127.0.0.1 — it touches no real system. Demonstrates
the defensive engine working against live traffic.

Usage:  python scripts/attacker.py   (the backend server must be running)
Uses only the standard library (urllib).
"""

import sys
import time
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8010"


def _get(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=3) as r:
            return r.status
    except Exception as e:
        return f"error: {e}"


def _post(path, data=None):
    try:
        body = urllib.parse.urlencode(data or {}).encode()
        req = urllib.request.Request(BASE + path, data=body, method="POST")
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.status
    except Exception as e:
        return f"error: {e}"


def main():
    print("=" * 56)
    print("  Zephyrus — attack simulation (127.0.0.1 only)")
    print("=" * 56)

    print("[1] Fake traffic-light controller...")
    print("    ->", _get("/decoy/traffic-light"))
    time.sleep(0.4)

    print("[2] Fake camera stream...")
    print("    ->", _get("/decoy/camera/stream"))
    time.sleep(0.4)

    print("[3] Fake ATM jackpotting...")
    print("    ->", _post("/decoy/atm/dispense"))
    time.sleep(0.4)

    print("[4] Portal brute force (5 attempts)...")
    for password in ["admin", "root", "admin123", "P@ssw0rd", "12345678"]:
        _post("/decoy/portal/login", {"username": "admin", "password": password})
        print(f"    -> tried: {password}")
        time.sleep(0.2)

    print("[5] Canary token read (fake admin credentials)...")
    print("    ->", _get("/decoy/canary/admin_credentials.txt"))

    print("-" * 56)
    print("Attack done. Check the dashboard / state:")
    print("  ", BASE + "/api/state")
    print("=" * 56)


if __name__ == "__main__":
    if isinstance(_get("/"), str):
        print("ERROR: cannot reach the backend. Start it first (scripts/run-dev.ps1).")
        sys.exit(1)
    main()
