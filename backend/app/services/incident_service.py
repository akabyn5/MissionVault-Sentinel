# backend/app/services/incident_service.py

import json
from datetime import datetime, timezone

from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent


def _utc_now() -> str:
    """Return the current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _detect_primary_anomaly(alerts: list[str]) -> str:
    """
    Determine the primary anomaly type from the existing
    telemetry analysis alerts.
    """

    if not alerts:
        return "unknown"

    first_alert = alerts[0].lower()

    if "battery" in first_alert:
        return "battery"

    if "temperature" in first_alert:
        return "temperature"

    if "signal" in first_alert:
        return "signal"

    if "cpu" in first_alert:
        return "cpu"

    if "payload" in first_alert:
        return "payload"

    return "unknown"


def _extract_numeric_value(data, anomaly_type: str) -> float:
    """Extract the relevant telemetry value for an anomaly."""

    if anomaly_type == "battery":
        return float(data.battery)

    if anomaly_type == "temperature":
        return float(data.temperature)

    if anomaly_type == "signal":
        return float(data.signal_strength)

    if anomaly_type == "cpu":
        return float(data.cpu_load)

    # Payload status is not numeric.
    return 0.0


def create_incident(data, analysis: dict) -> dict | None:
    """
    Create a new incident when telemetry analysis reports an anomaly.

    Returns:
        Serialized incident dictionary if an anomaly exists.
        None if telemetry is normal.
    """

    if not analysis.get("is_anomaly", False):
        return None

    severity = str(
        analysis.get("severity", "warning")
    ).lower()

    alerts = analysis.get("alerts", [])

    if not isinstance(alerts, list):
        alerts = []

    primary_anomaly = _detect_primary_anomaly(alerts)

    created_at = _utc_now()

    incident = Incident(
        satellite_id=data.satellite_id,
        created_at=created_at,
        severity=severity,
        status="open",
        primary_anomaly=primary_anomaly,
    )

    with SessionLocal() as db:
        db.add(incident)
        db.commit()
        db.refresh(incident)

        # Create the first event associated with the incident.
        event = IncidentEvent(
            incident_id=incident.id,
            timestamp=data.timestamp.isoformat(),
            metric=primary_anomaly,
            value=_extract_numeric_value(
                data,
                primary_anomaly,
            ),
            event_type="anomaly_detected",
        )

        db.add(event)
        db.commit()

        return {
            "id": incident.id,
            "satellite_id": incident.satellite_id,
            "created_at": incident.created_at,
            "severity": incident.severity,
            "status": incident.status,
            "primary_anomaly": incident.primary_anomaly,
        }


def get_incident(incident_id: int) -> dict | None:
    """Return one incident by ID."""

    with SessionLocal() as db:
        incident = db.scalar(
            select(Incident).where(
                Incident.id == incident_id
            )
        )

        if incident is None:
            return None

        return {
            "id": incident.id,
            "satellite_id": incident.satellite_id,
            "created_at": incident.created_at,
            "severity": incident.severity,
            "status": incident.status,
            "primary_anomaly": incident.primary_anomaly,
        }


def get_all_incidents() -> list[dict]:
    """Return all incidents ordered by newest first."""

    with SessionLocal() as db:
        incidents = db.scalars(
            select(Incident).order_by(
                Incident.id.desc()
            )
        ).all()

        return [
            {
                "id": incident.id,
                "satellite_id": incident.satellite_id,
                "created_at": incident.created_at,
                "severity": incident.severity,
                "status": incident.status,
                "primary_anomaly": incident.primary_anomaly,
            }
            for incident in incidents
        ]