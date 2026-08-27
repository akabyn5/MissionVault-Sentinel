# backend/app/services/evidence_service.py

import json
import hmac
from typing import Any

from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.investigation import Investigation
from app.models.operator_decision import OperatorDecision
from app.models.telemetry import TelemetryRecord
from app.services.incident_service import reconstruct_incident
from app.services.midnight_service import build_commitment


def _load_investigation_data(
    investigation: Investigation,
) -> dict[str, Any]:
    """
    Decode the structured JSON stored in the Investigation.evidence field.
    """

    try:
        data = json.loads(
            investigation.evidence or "{}"
        )
    except (
        json.JSONDecodeError,
        TypeError,
    ):
        return {}

    if not isinstance(data, dict):
        return {}

    return data


def _get_latest_investigation(
    db,
    incident_id: int,
) -> Investigation | None:
    """
    Return the newest investigation for the incident.
    """

    return db.scalar(
        select(Investigation)
        .where(
            Investigation.incident_id == incident_id
        )
        .order_by(
            Investigation.id.desc()
        )
        .limit(1)
    )


def _get_latest_operator_decision(
    db,
    incident_id: int,
) -> OperatorDecision | None:
    """
    Return the newest human operator decision.
    """

    return db.scalar(
        select(OperatorDecision)
        .where(
            OperatorDecision.incident_id == incident_id
        )
        .order_by(
            OperatorDecision.id.desc()
        )
        .limit(1)
    )


def _serialize_telemetry_record(
    record: TelemetryRecord | None,
) -> dict[str, Any] | None:
    """
    Convert telemetry into a JSON-safe dictionary.
    """

    if record is None:
        return None

    return {
        "id": record.id,
        "satellite_id": record.satellite_id,
        "timestamp": record.timestamp,
        "battery": record.battery,
        "temperature": record.temperature,
        "signal_strength": record.signal_strength,
        "cpu_load": record.cpu_load,
        "payload_status": record.payload_status,
        "is_anomaly": bool(record.is_anomaly),
        "severity": record.severity,
        "alerts": record.alerts,
    }


def _extract_trigger_telemetry(
    reconstruction: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Extract the telemetry packet that triggered the incident.
    """

    timeline = reconstruction.get(
        "timeline",
        [],
    )

    if not isinstance(timeline, list):
        return None

    for item in timeline:
        if not isinstance(item, dict):
            continue

        if item.get("role") == "trigger":
            telemetry = item.get(
                "telemetry"
            )

            if isinstance(telemetry, dict):
                return telemetry

    return None


def _build_evidence_package(
    incident: Incident,
    reconstruction: dict[str, Any],
    investigation: Investigation,
    operator_decision: OperatorDecision,
) -> dict[str, Any]:
    """
    Build the canonical evidence package.

    This object is deliberately composed from existing mission records.
    No additional database model is required for the MVP.
    """

    investigation_data = _load_investigation_data(
        investigation
    )

    incident_data = reconstruction.get(
        "incident",
        {},
    )

    timeline = reconstruction.get(
        "timeline",
        [],
    )

    trigger_telemetry = _extract_trigger_telemetry(
        reconstruction
    )

    package = {
        "incident_id": incident.id,
        "satellite_id": incident.satellite_id,
        "timestamp": incident.created_at,
        "severity": incident.severity,
        "primary_anomaly": incident.primary_anomaly,

        "telemetry_snapshot": (
            trigger_telemetry
        ),

        "timeline": timeline,

        "diagnosis": investigation.diagnosis,

        "confidence": investigation.confidence,

        "evidence": investigation_data.get(
            "supporting_evidence",
            [],
        ),

        "recommended_actions": investigation_data.get(
            "recommended_actions",
            [],
        ),

        "risk": investigation_data.get(
            "risk",
            "Unknown",
        ),

        "uncertainty": investigation_data.get(
            "uncertainty",
            "Unknown",
        ),

        "operator_decision": {
            "id": operator_decision.id,
            "decision": operator_decision.decision,
            "note": operator_decision.note,
            "timestamp": operator_decision.timestamp,
        },
    }

    return package


def get_incident_evidence(
    incident_id: int,
) -> dict[str, Any] | None:
    """
    Build the evidence package and return its SHA-256 fingerprint.

    Evidence requires:
    - an existing incident
    - an existing investigation
    - an existing human operator decision
    """

    with SessionLocal() as db:
        incident = db.scalar(
            select(Incident)
            .where(
                Incident.id == incident_id
            )
        )

        if incident is None:
            return None

        investigation = _get_latest_investigation(
            db,
            incident_id,
        )

        if investigation is None:
            raise ValueError(
                "Incident has no completed investigation."
            )

        operator_decision = _get_latest_operator_decision(
            db,
            incident_id,
        )

        if operator_decision is None:
            raise ValueError(
                "Incident has no operator decision."
            )

        reconstruction = reconstruct_incident(
            incident_id=incident_id,
            before=10,
            after=5,
        )

        if reconstruction is None:
            raise ValueError(
                "Unable to reconstruct incident telemetry."
            )

        package = _build_evidence_package(
            incident=incident,
            reconstruction=reconstruction,
            investigation=investigation,
            operator_decision=operator_decision,
        )

        sha256 = build_commitment(
            package
        )

        return {
            "evidence_id": (
                f"MV-INC-{incident.id:04d}"
            ),
            "incident_id": incident.id,
            "package": package,
            "sha256": sha256,
        }


def verify_evidence_package(
    evidence_package: dict[str, Any],
    expected_sha256: str,
) -> dict[str, Any]:
    """
    Recalculate the SHA-256 fingerprint and compare it
    against the expected fingerprint.
    """

    if not isinstance(
        evidence_package,
        dict,
    ):
        return {
            "valid": False,
            "status": "INVALID_PACKAGE",
            "computed_sha256": None,
            "expected_sha256": expected_sha256,
        }

    if not expected_sha256:
        return {
            "valid": False,
            "status": "MISSING_EXPECTED_HASH",
            "computed_sha256": None,
            "expected_sha256": expected_sha256,
        }

    computed_sha256 = build_commitment(
        evidence_package
    )

    valid = hmac.compare_digest(
        computed_sha256,
        expected_sha256.strip().lower(),
    )

    return {
        "valid": valid,
        "status": (
            "VALID"
            if valid
            else "INTEGRITY_MISMATCH"
        ),
        "computed_sha256": computed_sha256,
        "expected_sha256": expected_sha256,
    }