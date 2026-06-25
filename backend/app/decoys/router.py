"""Decoy endpoints.

These mimic real devices but are entirely fake and belong only to us. No
legitimate user ever touches a decoy, so every hit is treated as a
high-confidence attack signal (risk is always high). Classification and the ML
anomaly score are computed by the engine; this module only returns convincing
decoy responses and records the hit.
"""

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

from app.engine import build_alert
from app.store import store

router = APIRouter(prefix="/decoy", tags=["decoys"])


def _client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "naməlum"


def _record_decoy_hit(request: Request, kind: str, action: str, detail: str, failed=False):
    """Record a decoy hit and create an alert via the engine."""
    ip = _client_ip(request)
    event = store.add_event(ip, kind, action, detail, failed=failed)
    alert = build_alert(event, store.snapshot_events(), is_decoy=True, source_kind=kind)
    store.add_alert(alert)
    return alert


# 1) Fake traffic-light / SCADA controller.
@router.get("/traffic-light")
def traffic_light(request: Request):
    _record_decoy_hit(
        request, "traffic_light",
        action="GET /decoy/traffic-light",
        detail="SCADA/Modbus svetofor panelinə baxış",
    )
    return {
        "device": "TrafficController-X200",
        "protocol": "Modbus-TCP",
        "unit_id": 1,
        "registers": {"junction_1": "GREEN", "junction_2": "RED", "fault": 0},
        "firmware": "v1.2.7",
    }


# Fake Modbus write — used by the attack sequence (signal manipulation).
@router.post("/traffic-light/modbus")
def traffic_light_modbus(request: Request):
    _record_decoy_hit(
        request, "traffic_light",
        action="POST /decoy/traffic-light/modbus",
        detail="Saxta svetofora Modbus yazma əmri (siqnal manipulyasiyası)",
        failed=True,
    )
    return {"device": "TrafficController-X200", "write": "accepted", "register": "junction_1"}


# 2) Fake city portal login — accepts any credentials and logs every attempt.
@router.post("/portal/login")
async def portal_login(request: Request):
    username = "naməlum"
    try:
        form = await request.form()
        username = form.get("username", username)
    except Exception:
        try:
            body = await request.json()
            username = body.get("username", username)
        except Exception:
            pass

    _record_decoy_hit(
        request, "portal",
        action="POST /decoy/portal/login",
        detail=f"Portal giriş cəhdi (username='{username}')",
        failed=True,
    )
    return {"status": "error", "message": "İstifadəçi adı və ya parol yanlışdır."}


# 3) Canary token — a planted fake "admin_credentials.txt".
@router.get("/canary/{token_id}")
def canary(token_id: str, request: Request):
    _record_decoy_hit(
        request, "canary",
        action=f"GET /decoy/canary/{token_id}",
        detail=f"Canary token oxundu (token_id='{token_id}')",
    )
    text = (
        "# admin_credentials.txt\n"
        "admin:S3cr3t!Pass\n"
        "backup_admin:Backup#2024\n"
    )
    return PlainTextResponse(text)


# 4) Fake camera — mimics an RTSP/HTTP camera stream.
@router.get("/camera/stream")
def camera_stream(request: Request):
    _record_decoy_hit(
        request, "camera",
        action="GET /decoy/camera/stream",
        detail="Kamera video axınına giriş",
    )
    return {
        "device": "IPCamera-Z5",
        "stream": "rtsp://10.0.0.50:554/live.sdp",
        "resolution": "1920x1080",
        "status": "streaming",
    }


# 5) Fake ATM — cash dispense ("jackpotting") and firmware-upload decoys.
@router.post("/atm/dispense")
def atm_dispense(request: Request):
    _record_decoy_hit(
        request, "atm",
        action="POST /decoy/atm/dispense",
        detail="Saxta bankomatda 'jackpotting' (nağd çıxarma) cəhdi",
        failed=True,
    )
    return {"device": "ATM-NCR-6622", "dispense": "error", "code": "HW_FAULT"}


@router.post("/atm/firmware")
def atm_firmware(request: Request):
    _record_decoy_hit(
        request, "atm",
        action="POST /decoy/atm/firmware",
        detail="Saxta bankomata zərərli firmware yükləmə cəhdi",
        failed=True,
    )
    return {"device": "ATM-NCR-6622", "firmware_update": "rejected", "signature": "invalid"}
