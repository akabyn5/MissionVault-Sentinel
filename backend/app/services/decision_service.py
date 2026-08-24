# backend/app/services/decision_service.py

from datetime import datetime, timezone

from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.operator_decision import OperatorDecision


def _utc_now() -> str:
    """Return the current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def create_operator_decision(
    incident_id: int,
    decision: str,
    note: str | None = None,
) -> dict | None:
    """
    Store a human operator decision for an incident.
    """

    with SessionLocal() as db:
        incident = db.scalar(
            select(Incident).where(
                Incident.id == incident_id
            )
        )

        if incident is None:
            return None

        operator_decision = OperatorDecision(
            incident_id=incident_id,
            decision=decision,
            note=note,
            timestamp=_utc_now(),
        )

        db.add(operator_decision)

        # The incident is no longer waiting for a decision.
        incident.status = "reviewed"

        db.add(incident)
        db.commit()
        db.refresh(operator_decision)

        return {
            "id": operator_decision.id,
            "incident_id": operator_decision.incident_id,
            "decision": operator_decision.decision,
            "note": operator_decision.note,
            "timestamp": operator_decision.timestamp,
            "incident_status": incident.status,
        }