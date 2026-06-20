# =====================================================================
# Zephyrus — TƏLƏLƏR (Decoys)
# ---------------------------------------------------------------------
# Burada 4 saxta ("tələ") endpoint var. Bunlar real qurğulara bənzəyir,
# amma əslində uydurmadur və yalnız bizə aiddir.
#
# ƏSAS FİKİR: heç bir QANUNİ istifadəçi bu tələlərə toxunmur.
# Deməli, tələyə dəyən HƏR müraciət — demək olar ki, hücumdur.
# Buna görə tələ vurğusu = SIFIR yanlış-pozitiv, ƏN YÜKSƏK etibarlı siqnal
# → risk həmişə "yüksək".
#
# QEYD: Faza 1-də təsnifat sadə və determinikdir (tələ növünə görə).
# Faza 2-də əsl Sİ aşkarlama mühərriki (IsolationForest anomaliya +
# şəhər axını üçün təsnifat) əlavə olunacaq.
# =====================================================================

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

from store import store

# Bütün tələ endpoint-lərini bir yerə yığan "router".
router = APIRouter(prefix="/decoy", tags=["decoys"])


# ---------------------------------------------------------------------
# Tələ növü → təhlükə təsnifatı xəritəsi (Faza 1 üçün sadə, determinik).
# Hər tələ üçün: təhlükə sinfi, MITRE ATT&CK texnikası və qısa izah.
# (T0846 — ATT&CK for ICS; sənaye nəzarət sistemləri üçün.)
# ---------------------------------------------------------------------
TELE_XERITESI = {
    "traffic_light": {
        "threat_class": "İcazəsiz SCADA/ICS Girişi",
        "mitre": "T0846",  # ATT&CK for ICS — Remote System Discovery
        "mitre_ad": "Uzaq Sistem Kəşfi (ICS)",
        "reason": "Saxta svetofor kontrollerinə (SCADA/Modbus tələsi) icazəsiz giriş edildi.",
    },
    "portal": {
        "threat_class": "Brute Force / Parol Hücumu",
        "mitre": "T1110",  # Brute Force
        "mitre_ad": "Brute Force",
        "reason": "Saxta şəhər portalına giriş cəhdi edildi (parol sınağı / brute-force siqnalı).",
    },
    "canary": {
        "threat_class": "Məxfi Məlumata Giriş (Canary)",
        "mitre": "T1552",  # Unsecured Credentials
        "mitre_ad": "Qorunmamış Etimadnamələr",
        "reason": "Canary token faylı (saxta admin parolları) oxundu — sızma cəhdinin güclü əlaməti.",
    },
    "camera": {
        "threat_class": "İcazəsiz Kamera/Cihaz Girişi",
        "mitre": "T0846",  # ATT&CK for ICS — cihaz kəşfi/girişi
        "mitre_ad": "Cihaz Kəşfi (ICS/IoT)",
        "reason": "Saxta kamera axınına (RTSP/HTTP tələsi) icazəsiz giriş edildi.",
    },
}


def _client_ip(request: Request) -> str:
    """Müraciət edənin IP ünvanını alır (yoxdursa 'naməlum')."""
    if request.client and request.client.host:
        return request.client.host
    return "naməlum"


def _tele_vurgusu_qeyd_et(request: Request, kind: str, action: str, detay: str):
    """
    Bir tələ vurulanda: (1) hadisəni qeyd edir, (2) yüksək riskli siqnal yaradır.
    Bu, bütün 4 tələ üçün ortaq köməkçi funksiyadır (təkrarı azaldır).
    """
    ip = _client_ip(request)
    hadise = store.add_event(ip, kind, action, detay)

    info = TELE_XERITESI[kind]
    alert = {
        "event_id": hadise["id"],
        "timestamp": hadise["timestamp"],
        "time": hadise["time"],
        "source_ip": ip,
        "source_kind": kind,
        "is_decoy": True,                       # bu, tələ vurğusudur
        "threat_class": info["threat_class"],
        "mitre": info["mitre"],
        "mitre_ad": info["mitre_ad"],
        "risk": "yüksək",                       # tələ vurğusu → həmişə yüksək
        "anomaly_score": None,                  # Faza 2-də ML balı əlavə olunacaq
        "reason": info["reason"],
        "admin_alert": "Administrator xəbərdar edildi (simulyasiya).",
    }
    store.add_alert(alert)
    return alert


# =====================================================================
# 1) SAXTA SVETOFOR KONTROLLERİ
# Real bir Modbus/SCADA panelinin cavabını təqlid edir.
# =====================================================================
@router.get("/traffic-light")
def traffic_light(request: Request):
    _tele_vurgusu_qeyd_et(
        request, "traffic_light",
        action="GET /decoy/traffic-light",
        detay="SCADA/Modbus svetofor panelinə baxış",
    )
    # Saxta, lakin inandırıcı bir cihaz cavabı qaytarırıq.
    return {
        "device": "TrafficController-X200",
        "protocol": "Modbus-TCP",
        "unit_id": 1,
        "registers": {"junction_1": "GREEN", "junction_2": "RED", "fault": 0},
        "firmware": "v1.2.7",
    }


# =====================================================================
# 2) SAXTA ŞƏHƏR PORTALI — login
# İstənilən istifadəçi adı/parolu "qəbul edir" və hər cəhdi qeyd edir.
# Bu, brute-force / parol hücumu siqnalını tutmaq üçündür.
# =====================================================================
@router.post("/portal/login")
async def portal_login(request: Request):
    # Göndərilən formanı/JSON-u oxumağa çalışırıq (sadəcə qeyd üçün).
    istifadeci = "naməlum"
    try:
        form = await request.form()
        istifadeci = form.get("username", istifadeci)
    except Exception:
        try:
            body = await request.json()
            istifadeci = body.get("username", istifadeci)
        except Exception:
            pass

    _tele_vurgusu_qeyd_et(
        request, "portal",
        action="POST /decoy/portal/login",
        detay=f"Portal giriş cəhdi (username='{istifadeci}')",
    )
    # Real portal kimi görünmək üçün "uğursuz giriş" cavabı qaytarırıq.
    return {"status": "error", "message": "İstifadəçi adı və ya parol yanlışdır."}


# =====================================================================
# 3) CANARY TOKEN
# Planlanmış saxta "admin_credentials.txt". Hər GET = tələ işə düşdü.
# =====================================================================
@router.get("/canary/{token_id}")
def canary(token_id: str, request: Request):
    _tele_vurgusu_qeyd_et(
        request, "canary",
        action=f"GET /decoy/canary/{token_id}",
        detay=f"Canary token oxundu (token_id='{token_id}')",
    )
    # Saxta "etimadnamə faylı" məzmunu — real heç nə yoxdur.
    metn = (
        "# admin_credentials.txt\n"
        "admin:S3cr3t!Pass\n"
        "backup_admin:Backup#2024\n"
    )
    return PlainTextResponse(metn)


# =====================================================================
# 4) SAXTA KAMERA
# Bir RTSP/HTTP kamera axınının cavabını təqlid edir.
# =====================================================================
@router.get("/camera/stream")
def camera_stream(request: Request):
    _tele_vurgusu_qeyd_et(
        request, "camera",
        action="GET /decoy/camera/stream",
        detay="Kamera video axınına giriş",
    )
    return {
        "device": "IPCamera-Z5",
        "stream": "rtsp://10.0.0.50:554/live.sdp",
        "resolution": "1920x1080",
        "status": "streaming",
    }
