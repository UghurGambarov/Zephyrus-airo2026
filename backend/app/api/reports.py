"""Incident-report route (optional Claude enrichment)."""

from fastapi import APIRouter

from app.engine.report import ai_report
from app.store import store

router = APIRouter(prefix="/api", tags=["reports"])


@router.post("/report/{alert_id}/ai")
def generate_ai_report(alert_id: int):
    """Generate an AI (Claude) report for an alert; falls back to template."""
    alert = next((a for a in store.alerts if a.get("id") == alert_id), None)
    if alert is None:
        return {"error": "Belə siqnal tapılmadı.", "alert_id": alert_id}
    return ai_report(alert)
