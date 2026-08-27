# backend/app/routers/telemetry.py
from typing import Literal

from fastapi import APIRouter, Query, Depends

from app.schemas.telemetry import Telemetry
from app.services.auth_service import get_current_user
from app.services.telemetry_service import (
    save_telemetry,
    get_all_telemetry,
    get_latest_telemetry,
    get_telemetry_stats,
    get_health_metrics,
    get_time_statistics,
    get_mission_summary,
    get_trend_analysis,
    get_dashboard_data,
    get_anomalies,
    get_recent_anomalies,
    get_telemetry_by_severity,
    get_telemetry_by_satellite,
    search_telemetry
)
from app.services.analysis_service import analyze_telemetry

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "MissionVault AI"
    }

@router.post("/telemetry")
def receive_telemetry(data: Telemetry):
    print("\nTelemetry received:")
    print(data)

    analysis = analyze_telemetry(data)

    record = save_telemetry(
        data,
        analysis,
    )

    return {
        "message": "Telemetry received successfully",
        "satellite": data.satellite_id,
        "analysis": analysis,
        "incident": record.get("incident"),
        "midnight": record.get("midnight", {}),
    }

@router.get("/telemetry")
def list_telemetry(current_user=Depends(get_current_user)):
    return get_all_telemetry()

@router.get("/telemetry/latest")
def latest_telemetry(current_user=Depends(get_current_user)):
    return get_latest_telemetry()

@router.get("/telemetry/stats")
def telemetry_stats(current_user=Depends(get_current_user)):
    return get_telemetry_stats()

@router.get("/telemetry/metrics")
def telemetry_metrics(current_user=Depends(get_current_user)):
    return get_health_metrics()

@router.get("/telemetry/time")
def telemetry_time(current_user=Depends(get_current_user)):
    return get_time_statistics()

@router.get("/telemetry/summary")
def telemetry_summary(current_user=Depends(get_current_user)):
    return get_mission_summary()

@router.get("/telemetry/trends")
def telemetry_trends(current_user=Depends(get_current_user)):
    return get_trend_analysis()

@router.get("/telemetry/anomalies")
def telemetry_anomalies(current_user=Depends(get_current_user)):
    return get_anomalies()

@router.get("/telemetry/severity/{level}")
def telemetry_by_severity(level: str, current_user=Depends(get_current_user)):
    return get_telemetry_by_severity(level)

@router.get("/telemetry/satellite/{satellite_id}")
def telemetry_by_satellite(satellite_id: str, current_user=Depends(get_current_user)):
    return get_telemetry_by_satellite(satellite_id)

@router.get("/telemetry/search")
def telemetry_search(
    current_user=Depends(get_current_user),
    satellite_id: str | None = Query(default=None),
    severity: Literal["normal", "warning", "critical"] | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500)
):
    return search_telemetry(
        satellite_id=satellite_id,
        severity=severity,
        limit=limit
    )

@router.get("/telemetry/dashboard")
def telemetry_dashboard(current_user=Depends(get_current_user)):
    return get_dashboard_data()