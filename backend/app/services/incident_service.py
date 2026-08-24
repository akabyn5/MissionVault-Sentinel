# backend/app/services/incident_service.py

from datetime import datetime, timezone

from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.telemetry import TelemetryRecord


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

    for alert in alerts:
        normalized = str(alert).lower()

        if "battery" in normalized:
            return "battery"

        if "temperature" in normalized:
            return "temperature"

        if "signal" in normalized:
            return "signal"

        if "cpu" in normalized:
            return "cpu"

        if "payload" in normalized:
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

    # Payload status is textual, so there is no numeric value.
    return 0.0


def _serialize_telemetry(record: TelemetryRecord) -> dict:
    """Convert a telemetry database record to a JSON-safe dictionary."""

    return {
        "id": record.id,
        "satellite_id": record.satellite_id,
        "timestamp": record.timestamp,
        "temperature": record.temperature,
        "battery": record.battery,
        "cpu_load": record.cpu_load,
        "signal_strength": record.signal_strength,
        "payload_status": record.payload_status,
        "is_anomaly": bool(record.is_anomaly),
        "severity": record.severity,
        "alerts": record.alerts,
    }


def _serialize_incident(incident: Incident) -> dict:
    """Convert an incident model to a dictionary."""

    return {
        "id": incident.id,
        "satellite_id": incident.satellite_id,
        "created_at": incident.created_at,
        "severity": incident.severity,
        "status": incident.status,
        "primary_anomaly": incident.primary_anomaly,
    }

def manually_create_incident(
    satellite_id: str,
    severity: str,
    primary_anomaly: str,
) -> dict:
    """
    Manually create an incident through the API.
    """

    incident = Incident(
        satellite_id=satellite_id,
        created_at=_utc_now(),
        severity=severity.lower(),
        status="open",
        primary_anomaly=primary_anomaly.lower(),
    )

    with SessionLocal() as db:
        db.add(incident)
        db.commit()
        db.refresh(incident)

        return _serialize_incident(incident)

def create_incident(data, analysis: dict) -> dict | None:
    """
    Create a new incident when telemetry analysis reports an anomaly.
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

        return _serialize_incident(incident)


def _find_incident_trigger_record(
    db,
    incident: Incident,
) -> TelemetryRecord | None:
    """
    Find the telemetry record that triggered the incident.

    IncidentEvent stores the telemetry timestamp, so we use that
    timestamp together with the satellite ID to identify the
    original telemetry record.
    """

    event = db.scalar(
        select(IncidentEvent)
        .where(
            IncidentEvent.incident_id == incident.id
        )
        .order_by(IncidentEvent.id.asc())
        .limit(1)
    )

    if event is None:
        return None

    record = db.scalar(
        select(TelemetryRecord)
        .where(
            TelemetryRecord.satellite_id == incident.satellite_id,
            TelemetryRecord.timestamp == event.timestamp,
        )
        .order_by(TelemetryRecord.id.asc())
        .limit(1)
    )

    return record


def reconstruct_incident(
    incident_id: int,
    before: int = 10,
    after: int = 5,
) -> dict | None:
    """
    Reconstruct the telemetry context around an incident.

    Default:
        10 telemetry packets before the triggering packet
        1 triggering packet
        5 telemetry packets after the triggering packet

    The number of packets can be changed through the optional
    before/after parameters.
    """

    if before < 0:
        before = 0

    if after < 0:
        after = 0

    # Protect the endpoint from excessively large requests.
    before = min(before, 100)
    after = min(after, 100)

    with SessionLocal() as db:
        incident = db.scalar(
            select(Incident).where(
                Incident.id == incident_id
            )
        )

        if incident is None:
            return None

        trigger_record = _find_incident_trigger_record(
            db,
            incident,
        )

        if trigger_record is None:
            return {
                "incident": _serialize_incident(incident),
                "trigger": None,
                "timeline": [],
                "context": {
                    "before": before,
                    "after": after,
                    "available_after_packets": 0,
                    "message": (
                        "The telemetry record that triggered "
                        "this incident could not be found."
                    ),
                },
            }

        # ---------------------------------------------------------
        # Get previous telemetry
        # ---------------------------------------------------------
        previous_records = list(
            db.scalars(
                select(TelemetryRecord)
                .where(
                    TelemetryRecord.satellite_id
                    == incident.satellite_id,
                    TelemetryRecord.id < trigger_record.id,
                )
                .order_by(TelemetryRecord.id.desc())
                .limit(before)
            ).all()
        )

        previous_records.reverse()

        # ---------------------------------------------------------
        # Get subsequent telemetry
        # ---------------------------------------------------------
        following_records = list(
            db.scalars(
                select(TelemetryRecord)
                .where(
                    TelemetryRecord.satellite_id
                    == incident.satellite_id,
                    TelemetryRecord.id > trigger_record.id,
                )
                .order_by(TelemetryRecord.id.asc())
                .limit(after)
            ).all()
        )

        timeline_records = (
            previous_records
            + [trigger_record]
            + following_records
        )

        return {
            "incident": _serialize_incident(incident),
            "trigger": {
                "telemetry_id": trigger_record.id,
                "relative_position": 0,
            },
            "timeline": [
                {
                    "position": index - len(previous_records),
                    "role": (
                        "before"
                        if index < len(previous_records)
                        else (
                            "trigger"
                            if index == len(previous_records)
                            else "after"
                        )
                    ),
                    "telemetry": _serialize_telemetry(
                        record
                    ),
                }
                for index, record in enumerate(
                    timeline_records
                )
            ],
            "context": {
                "requested_before": before,
                "requested_after": after,
                "available_before_packets": len(
                    previous_records
                ),
                "available_after_packets": len(
                    following_records
                ),
                "total_packets": len(
                    timeline_records
                ),
            },
        }


def get_incident(
    incident_id: int,
    include_reconstruction: bool = False,
) -> dict | None:
    """Return one incident by ID."""

    with SessionLocal() as db:
        incident = db.scalar(
            select(Incident).where(
                Incident.id == incident_id
            )
        )

        if incident is None:
            return None

        result = _serialize_incident(incident)

    if include_reconstruction:
        reconstruction = reconstruct_incident(
            incident_id
        )

        result["reconstruction"] = reconstruction

    return result


def get_all_incidents() -> list[dict]:
    """Return all incidents ordered by newest first."""

    with SessionLocal() as db:
        incidents = db.scalars(
            select(Incident).order_by(
                Incident.id.desc()
            )
        ).all()

        return [
            _serialize_incident(incident)
            for incident in incidents
        ]