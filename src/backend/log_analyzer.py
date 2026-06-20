# =====================================================================
# Zephyrus — LOG ANALİZATORU (CSV / yüklənmiş loglar → Aşkarlama Mühərriki)
# ---------------------------------------------------------------------
# Bu modul ağıllı şəhər giriş loglarını oxuyur və HƏR sətri eyni aşkarlama
# mühərrikindən (engine.py) keçirir. İki mənbə dəstəklənir:
#   1) Daxili nümunə CSV (data/sample-data.csv)
#   2) İstifadəçinin yüklədiyi və frontend-də "native" formata çevrilmiş loglar
#      (Syslog / Windows Event / CEF → {timestamp, source_ip, device, action, status})
#
# Niyə vacibdir? Çağırışın tələbi "sistem loglarını analiz et"-dir. Bu modul
# REAL log fayllarını da analiz etdiyimizi göstərir (forenzika / audit).
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
UGURSUZ_STATUS = {"FAILED", "DENIED", "UNAUTHORIZED", "ERROR", "BLOCKED"}


def _parse_ts(deyer):
    """Müxtəlif vaxt formatlarını datetime-a çevirir; alınmasa, indini qaytarır."""
    if not deyer:
        return datetime.now()
    s = str(deyer).strip().replace("Z", "+00:00")
    try:
        # ISO formatı (vaxt qurşağı varsa, naive-ə çeviririk).
        return datetime.fromisoformat(s).replace(tzinfo=None)
    except Exception:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    return datetime.now()


def analyze_rows(rows, reset_first=True):
    """
    Verilmiş "native" log sətirlərini (dict siyahısı) mühərrikdən keçirir.
    Hər sətir: {timestamp, source_ip, device, action, status} (bəziləri boş ola bilər).
    Həm CSV, həm də yüklənmiş loglar bu funksiyadan istifadə edir.
    """
    if reset_first:
        store.reset()  # təmiz analiz üçün əvvəlki vəziyyəti sıfırla

    # Vaxtı parse edib xronoloji sıraya düzürük (60s pəncərə hesabı üçün vacibdir).
    normal = []
    for r in rows:
        ts = _parse_ts(r.get("timestamp"))
        normal.append((ts, r))
    normal.sort(key=lambda x: x[0])

    analiz_sayi = 0
    siqnal_sayi = 0
    for ts, r in normal:
        device = (r.get("device") or r.get("source_kind") or "naməlum")
        status = str(r.get("status") or "")
        action = (r.get("action") or "EVENT")
        ip = (r.get("source_ip") or "naməlum")
        ugursuz = status.upper() in UGURSUZ_STATUS
        detay = f'{action} → {device} [{status or "?"}]'

        hadise = store.add_event(ip, device, action, detay, failed=ugursuz, ts=ts)
        alert = build_alert(hadise, store.snapshot_events(), is_decoy=False, source_kind=device)
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


def analyze_csv(reset_first=True):
    """Daxili nümunə CSV faylını oxuyub analyze_rows() ilə analiz edir."""
    if not CSV_YOL.exists():
        return {"xeta": f"CSV tapılmadı: {CSV_YOL}"}
    with open(CSV_YOL, encoding="utf-8") as f:
        setirler = list(csv.DictReader(f))
    return analyze_rows(setirler, reset_first=reset_first)
