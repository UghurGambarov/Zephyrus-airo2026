"""Log analysis routes: bundled sample CSV and uploaded (converted) rows."""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.ingestion import analyze_csv, analyze_rows

router = APIRouter(prefix="/api", tags=["analysis"])


class UploadPayload(BaseModel):
    rows: list[dict[str, Any]] = []
    reset: bool = True


@router.post("/analyze-logs")
def analyze_logs(reset: bool = True):
    """Analyze the bundled sample CSV (data/sample-data.csv)."""
    return analyze_csv(reset_first=reset)


@router.post("/analyze-upload")
def analyze_upload(payload: UploadPayload):
    """Analyze uploaded logs already normalized client-side."""
    if not payload.rows:
        return {"error": "Heç bir sətir göndərilmədi."}
    return analyze_rows(payload.rows, reset_first=payload.reset)
