# =====================================================================
# Zephyrus — MÜSTƏQİL HÜCUM SKRİPTİ (attacker.py)
# ---------------------------------------------------------------------
# Bu, BİZİM öz "hücumçu" skriptimizdir. O, yalnız ÖZ lokal serverimizə
# (127.0.0.1) HTTP sorğuları göndərib tələləri işə salır.
#
# ⚠️ ETİKA: heç bir real sistemə, şəbəkəyə və ya üçüncü tərəfə toxunmur.
# Hədəf qəsdən yalnız 127.0.0.1-dir. Bu, müdafiə mühərrikimizin canlı
# işlədiyini nümayiş etdirmək üçündür.
#
# İki istifadə üsulu:
#   1) Terminalda:  python src/backend/attacker.py
#      → real HTTP sorğuları ilə tələləri vurur (server işləməlidir).
#   2) Dashboard:   "🔴 Hücumu Başlat" düyməsi /api/simulate-attack çağırır
#      → eyni ardıcıllığı server daxilində işlədir (daha etibarlı).
#
# Yalnız stdlib (urllib) istifadə olunur — əlavə kitabxana lazım deyil.
# =====================================================================

import sys
import time
import urllib.request
import urllib.parse

# Hədəf YALNIZ lokal serverdir (etika qaydası).
BAZA = "http://127.0.0.1:8010"


def _get(yol):
    """Sadə GET sorğusu (səssiz, xətaları udur)."""
    try:
        with urllib.request.urlopen(BAZA + yol, timeout=3) as r:
            return r.status
    except Exception as e:
        return f"xəta: {e}"


def _post(yol, data):
    """Sadə POST sorğusu (form məlumatı ilə)."""
    try:
        body = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(BAZA + yol, data=body, method="POST")
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.status
    except Exception as e:
        return f"xəta: {e}"


def main():
    print("=" * 56)
    print("  Zephyrus — Hücum simulyasiyası (yalnız 127.0.0.1)")
    print("=" * 56)

    # 1) Tələlərə düşmə
    print("[1] Saxta svetofor kontrollerinə giriş...")
    print("    ->", _get("/decoy/traffic-light"))
    time.sleep(0.4)

    print("[2] Saxta kamera axınına giriş...")
    print("    ->", _get("/decoy/camera/stream"))
    time.sleep(0.4)

    # 2) Brute-force — portala təkrar uğursuz giriş
    print("[3] Saxta portala brute-force (5 cəhd)...")
    for parol in ["admin", "root", "admin123", "P@ssw0rd", "12345678"]:
        _post("/decoy/portal/login", {"username": "admin", "password": parol})
        print(f"    -> parol sınandı: {parol}")
        time.sleep(0.2)

    # 3) Data sızma cəhdi — canary token
    print("[4] Canary token oxunur (saxta admin parolları)...")
    print("    ->", _get("/decoy/canary/admin_credentials.txt"))

    print("-" * 56)
    print("Hücum bitdi. İndi dashboard-da siqnallara baxın:")
    print("  ", BAZA + "/api/state")
    print("=" * 56)


if __name__ == "__main__":
    # Server işləmirsə, istifadəçiyə aydın mesaj.
    if isinstance(_get("/"), str):
        print("XƏTA: Backend serverə qoşulmaq olmadı. Əvvəlcə run.bat ilə serveri işə salın.")
        sys.exit(1)
    main()
