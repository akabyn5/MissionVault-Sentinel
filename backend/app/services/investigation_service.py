# backend/app/services/investigation_service.py

from datetime import datetime, timezone
import json

from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.investigation import Investigation
from app.services.incident_service import reconstruct_incident


def _utc_now() -> str:
    """Return the current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _serialize_investigation(
    investigation: Investigation,
) -> dict:
    """Serialize an investigation database record."""

    try:
        evidence = json.loads(
            investigation.evidence or "[]"
        )
    except (json.JSONDecodeError, TypeError):
        evidence = []

    return {
        "id": investigation.id,
        "incident_id": investigation.incident_id,
        "diagnosis": investigation.diagnosis,
        "confidence": investigation.confidence,
        "evidence": evidence,
        "created_at": investigation.created_at,
    }


def get_investigation(
    incident_id: int,
) -> dict | None:
    """Return the latest investigation for an incident."""

    with SessionLocal() as db:
        investigation = db.scalar(
            select(Investigation)
            .where(
                Investigation.incident_id == incident_id
            )
            .order_by(
                Investigation.id.desc()
            )
            .limit(1)
        )

        if investigation is None:
            return None

        return _serialize_investigation(
            investigation
        )


def create_initial_investigation(
    incident_id: int,
) -> dict | None:
    """
    Create a temporary deterministic investigation record.

    This is the API foundation for the later Gemini-powered
    investigation service.
    """

    reconstruction = reconstruct_incident(
        incident_id=incident_id
    )

    if reconstruction is None:
        return None

    incident = reconstruction.get("incident")

    if incident is None:
        return None

    timeline = reconstruction.get(
        "timeline",
        [],
    )

    trigger = reconstruction.get(
        "trigger",
    )

    evidence = []

    if timeline:
        evidence.append(
            f"{len(timeline)} telemetry records were "
            f"reconstructed around the incident."
        )

    if trigger:
        evidence.append(
            f"Trigger telemetry record ID: "
            f"{trigger.get('telemetry_id')}."
        )

    diagnosis = (
        f"Incident requires investigation of "
        f"{incident.get('primary_anomaly', 'unknown')} "
        f"anomaly."
    )

    investigation = Investigation(
        incident_id=incident_id,
        diagnosis=diagnosis,
        confidence=0.0,
        evidence=json.dumps(evidence),
        created_at=_utc_now(),
    )

    with SessionLocal() as db:
        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        return _serialize_investigation(
            investigation
        )