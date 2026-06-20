# =====================================================================
# Zephyrus — HÜCUM SİMULYATORU (server tərəfi)
# ---------------------------------------------------------------------
# Bu modul realistik bir hücum ARDICILLIĞINI birbaşa mühərriyə "enjekt"
# edir. Dashboard-dakı "🔴 Hücumu Başlat" düyməsi bunu çağırır.
#
# NİYƏ server tərəfi? Demo zamanı bir düymə ilə bütün zəncir canlı işləsin
# deyə — xarici skriptə və ya şəbəkə vaxtlamasına asılı olmadan. Etibarlıdır.
#
# ETİKA: bu, BİZİM öz simulyasiyamızdır. Heç bir real sistemə toxunmur;
# yalnız öz mühərrikimizə süni hadisələr əlavə edirik. Hücumçu IP-si də
# uydurmadır.
#
# Ardıcıllıq bir hücumçunun tipik gedişatını canlandırır:
#   1) Kəşfiyyat skanı  → bir neçə real cihaza sürətli "probe"
#   2) Tələlərə düşmə   → saxta svetofor və kameraya giriş (yüksək siqnal)
#   3) Brute-force      → saxta portala təkrar uğursuz giriş
#   4) Data sızma cəhdi → canary token (saxta admin parolları) oxunur
# =====================================================================

import random
import threading
import time

from store import store
from engine import build_alert

# Uydurma hücumçu IP-si (real deyil).
HUCUMCU_IP = "45.142.120.50"

# --- Hücum axını üçün vaxt ayarları ---
# Addımlar arası TƏSADÜFİ qısa fasilə (saniyə). Belə olanda hücum bir anda yox,
# QISA ZAMAN DİLİMİNDƏ müxtəlif zamanlarda baş verir → dashboard-da canlı axır.
FASILE_MIN = 0.4
FASILE_MAX = 1.1

# Hücum ardıcıllığı. Hər addım:
#   (source_kind, action, detay, is_decoy, failed)
# source_kind tələ növü olanda (traffic_light/portal/canary/camera) uyğun
# tələ node-u ekranda qırmızı yanır.
HUCUM_ADDIMLARI = [
    # 1) Kəşfiyyat — hər cihaz kateqoriyası üçün FƏRQLİ, realistik skan növü.
    #    (Bütün cihazlar eyni anda yox; axın mərhələ-mərhələ irəliləyir.)
    ("Svetofor-Mərkəz",  "PROBE", "ICS/Modbus port skanı: Svetofor #1 yoxlanılır",       False, True),
    ("TrafikSensoru-1",  "PROBE", "Trafik sensoru şəbəkə kəşfiyyatı (intersection)",      False, True),
    ("Kamera-Yol-1",     "PROBE", "RTSP/ONVIF port yoxlanışı: Yol Kamerası",              False, True),
    ("Bankomat-1",       "PROBE", "Bankomat şəbəkəsinə kəşfiyyat skanı (#1)",             False, True),
    ("Su-Sayğacı",       "PROBE", "SCADA/Modbus skanı: Su Sayğacı stansiyası",            False, True),
    ("Data-Mərkəz",      "PROBE", "Data Mərkəzi xidmət kəşfi (service/port scan)",        False, True),
    # 2) İstismar — saxta cihazlara FƏRQLİ növ hücumlar (kateqoriyaya uyğun).
    ("camera",        "GET /decoy/camera/stream",       "Saxta kamera axınına icazəsiz giriş — RTSP hijack",        True, False),
    ("traffic_light", "POST /decoy/traffic-light/modbus","Saxta svetofora icazəsiz Modbus əmri — siqnal manipulyasiyası", True, False),
    ("atm",           "POST /decoy/atm/dispense",       "Saxta bankomatda 'jackpotting' (nağd çıxarma) cəhdi",      True, True),
    # 3) Brute-force — saxta portala təkrar uğursuz giriş.
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #1 (admin)",    True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #2 (root)",     True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #3 (P@ssw0rd)", True, True),
    # 4) Eskalasiya — bankomata zərərli firmware + canary token sızması.
    ("atm",    "POST /decoy/atm/firmware",                "Saxta bankomata zərərli firmware yükləmə cəhdi",     True, True),
    ("canary", "GET /decoy/canary/admin_credentials.txt", "Canary token oxundu (saxta admin parolları)",        True, False),
]


def _inject(source_kind, action, detay, is_decoy, failed):
    """Bir süni hadisəni qeyd edir və mühərriklə siqnal yaradır."""
    hadise = store.add_event(HUCUMCU_IP, source_kind, action, detay, failed=failed)
    alert = build_alert(hadise, store.snapshot_events(), is_decoy=is_decoy, source_kind=source_kind)
    # Tələ vurğusu həmişə siqnaldır; axın hadisəsi yalnız şübhəlidirsə.
    if is_decoy or alert["risk"] in ("orta", "yüksək"):
        store.add_alert(alert)
        return True
    return False


def simulate_attack(reset_first=True):
    """
    Bütün hücum ardıcıllığını işə salır. Dashboard düyməsi və attacker.py
    bunun nəticəsini istifadə edir. Xülasə qaytarır.
    """
    if reset_first:
        store.reset()  # təmiz demo üçün əvvəlki vəziyyəti sıfırla

    siqnal_sayi = 0
    for source_kind, action, detay, is_decoy, failed in HUCUM_ADDIMLARI:
        if _inject(source_kind, action, detay, is_decoy, failed):
            siqnal_sayi += 1

    state = store.get_state()
    return {
        "mesaj": "Hücum simulyasiyası tamamlandı.",
        "hadise_sayi": len(HUCUM_ADDIMLARI),
        "siqnal_sayi": siqnal_sayi,
        "yuksek_risk": state["stats"]["high_risk"],
    }
