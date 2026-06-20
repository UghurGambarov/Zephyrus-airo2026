# =====================================================================
# Zephyrus — NÜMUNƏ DATA GENERATORU
# ---------------------------------------------------------------------
# Bu skript realistik ağıllı şəhər giriş loglarını yaradır və
# data/sample-data.csv faylına yazır.
#
# Niyə generator? Belə judges (münsiflər) datanın NECƏ yarandığını görür,
# data təkrarlanandır (sabit toxum) və biz normal + şübhəli nümunələri
# nəzarətli şəkildə qarışdıra bilirik.
#
# CSV sütunları: timestamp, source_ip, device, action, status
#   - normal trafik        → iş saatları, az tezlik, status=OK
#   - 3 şübhəli nümunə      → kəşfiyyat skanı, brute-force, gecə girişi
#
# İşə salmaq: python src/backend/gen_sample_data.py
# =====================================================================

import csv
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

# Windows konsolu bəzən Azərbaycan hərflərini göstərə bilmir → UTF-8-ə keçirik.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# Layihə kök qovluğu (bu fayl src/backend/ içindədir → 2 səviyyə yuxarı).
KOK = Path(__file__).resolve().parents[2]
CIXIS = KOK / "data" / "sample-data.csv"

# Bütün hadisələrin tarixi (bir gün). ISO formatında yazılır.
GUN = datetime(2026, 6, 20)

# Real şəhər cihazları (normal istifadəçilərin toxunduğu).
CIHAZLAR = [
    "Svetofor-Mərkəz-1", "Svetofor-Şimal-2", "Kamera-Park-1",
    "Kamera-Meydan-2", "SuSayğacı-Rayon-3", "İşıqlandırma-Bulvar",
    "ŞəhərPortalı", "SCADA-Nəzarət",
]
# Daxili operator IP-ləri (qanuni).
NORMAL_IP = ["10.0.0.11", "10.0.0.12", "10.0.0.15", "10.0.0.21", "10.0.0.24"]


def normal_setirler(rng):
    """Normal trafik: iş saatlarında səpələnmiş, az tezlikli, uğurlu."""
    setirler = []
    for _ in range(55):
        saat = int(rng.integers(8, 20))
        deqiqe = int(rng.integers(0, 60))
        saniye = int(rng.integers(0, 60))
        ts = GUN + timedelta(hours=saat, minutes=deqiqe, seconds=saniye)
        ip = rng.choice(NORMAL_IP)
        cihaz = rng.choice(CIHAZLAR)
        action = rng.choice(["READ", "STATUS", "STREAM"])
        setirler.append([ts, ip, cihaz, action, "OK"])
    return setirler


def kesfiyyat_skani():
    """ŞÜBHƏLİ #1 — Kəşfiyyat skanı: bir kənar IP gecə qısa müddətdə
    ÇOX FƏRQLİ cihaza müraciət edir (port/xidmət skanı)."""
    setirler = []
    ip = "45.142.120.50"  # kənar, şübhəli IP
    baslangic = GUN + timedelta(hours=2, minutes=14, seconds=3)
    for i, cihaz in enumerate(CIHAZLAR):  # 8 fərqli cihaz ardıcıl
        ts = baslangic + timedelta(seconds=i * 5)  # ~5 saniyə aralıqla
        setirler.append([ts, ip, cihaz, "PROBE", "DENIED"])
    return setirler


def brute_force():
    """ŞÜBHƏLİ #2 — Brute-force: bir IP portala qısa müddətdə çoxlu
    UĞURSUZ giriş cəhdi edir (parol sınağı)."""
    setirler = []
    ip = "45.142.120.50"
    baslangic = GUN + timedelta(hours=11, minutes=32, seconds=0)
    for i in range(9):  # 9 uğursuz cəhd, ~3 saniyə aralıqla
        ts = baslangic + timedelta(seconds=i * 3)
        setirler.append([ts, ip, "ŞəhərPortalı", "LOGIN", "FAILED"])
    return setirler


def gece_girisi():
    """ŞÜBHƏLİ #3 — Gecə icazəsiz giriş: gecə saatında həssas SCADA
    cihazına tək, lakin iş-kənarı giriş."""
    ip = "185.220.101.7"
    ts = GUN + timedelta(hours=3, minutes=47, seconds=20)
    return [[ts, ip, "SCADA-Nəzarət", "CONFIG_READ", "OK"]]


def main():
    rng = np.random.default_rng(7)  # təkrarlanan nəticə
    setirler = []
    setirler += normal_setirler(rng)
    setirler += kesfiyyat_skani()
    setirler += brute_force()
    setirler += gece_girisi()

    # Vaxta görə sırala (real log faylı kimi xronoloji).
    setirler.sort(key=lambda r: r[0])

    CIXIS.parent.mkdir(parents=True, exist_ok=True)
    with open(CIXIS, "w", newline="", encoding="utf-8") as f:
        yaz = csv.writer(f)
        yaz.writerow(["timestamp", "source_ip", "device", "action", "status"])
        for ts, ip, cihaz, action, status in setirler:
            yaz.writerow([ts.isoformat(), ip, cihaz, action, status])

    print(f"Yazıldı: {CIXIS}  ({len(setirler)} sətir)")


if __name__ == "__main__":
    main()
