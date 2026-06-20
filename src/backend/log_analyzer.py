# =====================================================================
# Zephyrus — LOG ANALİZATORU (CSV → Aşkarlama Mühərriki)
# ---------------------------------------------------------------------
# Bu modul data/sample-data.csv faylındakı ağıllı şəhər giriş loglarını
# oxuyur və HƏR sətri eyni aşkarlama mühərrikindən (engine.py) keçirir.
#
# Niyə vacibdir? Çağırışın tələbi "sistem loglarını analiz et"-dir.
# Tələlər (decoy) yalnız canlı vurğuları tutur; bu modul isə cihazların
# REAL giriş loglarını da analiz etdiyimizi göstərir.
#
# Məntiq: hər log sətri bir hadisəyə çevrilir → mühərrik ML anomaliya balı,
# təhlükə sinfi və risk verir → yalnız ŞÜBHƏLİ (orta/yüksək) olanlar
# siqnal kimi panelə çıxır (normal trafik panelı doldurmur).
# =====================================================================

import csv
from datetime import datetime
from pathlib import Path

from store import store
from engine import build_alert

# CSV faylının yolu (layihə kökündə data/ qovluğunda).
KOK = Path(__file__).resolve().parents[2]
CSV_YOL = KOK / "data" / "sample-data.csv"

# "Uğursuz" sayılan status dəyərləri (ML üçün ugursuz=1 əlaməti).
UGURSUZ_STATUS = {"FAILED", "DENIED", "UNAUTHORIZED", "ERROR"}


def analyze_csv(reset_first=True):
    """
    CSV log faylını oxuyur, hər sətri mühərrikdən keçirir və şübhəli
    olanları siqnal kimi qeyd edir. Nəticə xülasəsini qaytarır.
    """
    if reset_first:
        store.reset()  # təmiz analiz üçün əvvəlki vəziyyəti sıfırla

    if not CSV_YOL.exists():
        return {"xeta": f"CSV tapılmadı: {CSV_YOL}"}

    with open(CSV_YOL, encoding="utf-8") as f:
        setirler = list(csv.DictReader(f))

    # Xronoloji sıra (60 saniyəlik pəncərə hesablamaları üçün vacibdir).
    setirler.sort(key=lambda r: r["timestamp"])

    analiz_sayi = 0
    siqnal_sayi = 0
    for r in setirler:
        ts = datetime.fromisoformat(r["timestamp"])
        ugursuz = r["status"].upper() in UGURSUZ_STATUS
        detay = f'{r["action"]} → {r["device"]} [{r["status"]}]'

        # Hadisəni öz (keçmiş) vaxtı ilə qeyd et.
        hadise = store.add_event(
            r["source_ip"], r["device"], r["action"], detay,
            failed=ugursuz, ts=ts,
        )
        # Mühərriklə təsnif et (bu, tələ DEYİL → axın təsnifatı işləyir).
        alert = build_alert(hadise, store.snapshot_events(), is_decoy=False, source_kind=r["device"])
        analiz_sayi += 1

        # Yalnız şübhəli (orta/yüksək) hadisələr siqnal kimi panelə çıxır.
        if alert["risk"] in ("orta", "yüksək"):
            store.add_alert(alert)
            siqnal_sayi += 1

    store.logs_analyzed += analiz_sayi
    return {
        "analiz_edilen": analiz_sayi,
        "siqnal_yaradilan": siqnal_sayi,
        "mesaj": f"{analiz_sayi} log sətri analiz edildi, {siqnal_sayi} şübhəli hadisə tapıldı.",
    }
