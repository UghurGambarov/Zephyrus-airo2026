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

from store import store
from engine import build_alert

# Uydurma hücumçu IP-si (real deyil).
HUCUMCU_IP = "45.142.120.50"

# Hücum ardıcıllığı. Hər addım:
#   (source_kind, action, detay, is_decoy, failed)
# source_kind tələ növü olanda (traffic_light/portal/canary/camera) uyğun
# tələ node-u ekranda qırmızı yanır.
HUCUM_ADDIMLARI = [
    # 1) Kəşfiyyat skanı — real cihazlara sürətli probe (tələ deyil).
    ("Svetofor-Mərkəz-1", "PROBE", "Şəbəkə skanı: Svetofor-Mərkəz-1 yoxlanılır", False, True),
    ("Kamera-Park-1",     "PROBE", "Şəbəkə skanı: Kamera-Park-1 yoxlanılır",     False, True),
    ("SuSayğacı-Rayon-3", "PROBE", "Şəbəkə skanı: SuSayğacı-Rayon-3 yoxlanılır", False, True),
    ("SCADA-Nəzarət",     "PROBE", "Şəbəkə skanı: SCADA-Nəzarət yoxlanılır",     False, True),
    # 2) Tələlərə düşmə — saxta svetofor və kamera.
    ("traffic_light", "GET /decoy/traffic-light", "Saxta svetofor kontrollerinə giriş", True, False),
    ("camera",        "GET /decoy/camera/stream", "Saxta kamera axınına giriş",         True, False),
    # 3) Brute-force — saxta portala 5 təkrar uğursuz giriş.
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #1 (admin)",     True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #2 (root)",      True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #3 (admin123)",  True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #4 (P@ssw0rd)",  True, True),
    ("portal", "POST /decoy/portal/login", "Portal brute-force cəhdi #5 (12345678)",  True, True),
    # 4) Data sızma cəhdi — canary token oxunur.
    ("canary", "GET /decoy/canary/admin_credentials.txt", "Canary token oxundu (saxta admin parolları)", True, False),
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
