# backend/app/services/investigation_service.py

import json
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import ValidationError
from sqlalchemy import select

from app.database.database import SessionLocal
from app.models.incident import Incident
from app.models.investigation import Investigation
from app.schemas.investigation import AIInvestigationResponse
from app.services.incident_service import reconstruct_incident

load_dotenv()

logger = logging.getLogger(__name__)


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    "",
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash",
).strip()


def _utc_now() -> str:
    """Return the current UTC timestamp as ISO-8601."""
    return datetime.now(
        timezone.utc
    ).isoformat()


def _serialize_investigation(
    investigation: Investigation,
) -> dict:
    """Serialize an investigation database record."""

    try:
        evidence = json.loads(
            investigation.evidence or "[]"
        )
    except (
        json.JSONDecodeError,
        TypeError,
    ):
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
                Investigation.incident_id
                == incident_id
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


def _build_incident_prompt(
    reconstruction: dict,
) -> str:
    """
    Build a controlled prompt from reconstructed incident data.

    The prompt explicitly tells Gemini that anomaly
    classification has already happened elsewhere.
    """

    incident = reconstruction.get(
        "incident",
        {},
    )

    timeline = reconstruction.get(
        "timeline",
        [],
    )

    context = reconstruction.get(
        "context",
        {},
    )

    evidence_payload = {
        "incident": incident,
        "timeline": timeline,
        "context": context,
    }

    serialized_context = json.dumps(
        evidence_payload,
        indent=2,
        ensure_ascii=False,
    )

    return f"""
You are an AI mission-operations investigation assistant.

IMPORTANT:
The deterministic telemetry analysis system has ALREADY
identified this event as an anomaly and created an incident.

You are NOT responsible for deciding whether the telemetry
is anomalous.

Your job is only to investigate the already-detected incident.

Analyze ONLY the supplied incident context and telemetry.

Determine:

1. The most likely explanation for the incident.
2. The telemetry evidence supporting that explanation.
3. Reasonable non-autonomous actions for a human operator
   to review.
4. Potential operational risk.
5. Important uncertainty or missing evidence.

Rules:

- Do not invent telemetry values.
- Do not invent subsystem states.
- Do not claim certainty when evidence is insufficient.
- Do not issue spacecraft commands.
- Do not recommend autonomous spacecraft control.
- Human review must remain required.
- Use the telemetry history to compare conditions before,
  during, and after the anomaly when available.
- Distinguish observations from conclusions.

Return ONLY the structured response defined by the schema.

Incident context:

{serialized_context}
""".strip()


def _run_gemini_investigation(
    reconstruction: dict,
) -> AIInvestigationResponse:
    """
    Send reconstructed incident evidence to Gemini and
    return a validated structured investigation.
    """

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )

    client = genai.Client(
        api_key=GEMINI_API_KEY
    )

    prompt = _build_incident_prompt(
        reconstruction
    )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AIInvestigationResponse,
            temperature=0.2,
        ),
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    try:
        result = AIInvestigationResponse.model_validate_json(
            response.text
        )
    except ValidationError as exc:
        logger.exception(
            "Gemini returned invalid structured output."
        )
        raise RuntimeError(
            "Gemini returned an invalid investigation response."
        ) from exc

    # Safety invariant for this prototype.
    result.human_review_required = True

    return result


def create_initial_investigation(
    incident_id: int,
) -> dict | None:
    """
    Run the real Gemini-powered investigation for an incident.

    The incident must already exist and must already have a
    deterministic anomaly classification.
    """

    reconstruction = reconstruct_incident(
        incident_id=incident_id
    )

    if reconstruction is None:
        return None

    incident = reconstruction.get(
        "incident"
    )

    if incident is None:
        return None

    ai_result = _run_gemini_investigation(
        reconstruction
    )

    investigation = Investigation(
        incident_id=incident_id,
        diagnosis=ai_result.diagnosis,
        confidence=ai_result.confidence,
        evidence=json.dumps(
            {
                "supporting_evidence": (
                    ai_result.evidence
                ),
                "recommended_actions": (
                    ai_result.recommended_actions
                ),
                "risk": ai_result.risk,
                "uncertainty": ai_result.uncertainty,
                "human_review_required": True,
            },
            ensure_ascii=False,
        ),
        created_at=_utc_now(),
    )

    with SessionLocal() as db:
        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        result = _serialize_investigation(
            investigation
        )

    # Add the AI-specific fields to the API response.
    result["recommended_actions"] = (
        ai_result.recommended_actions
    )

    result["risk"] = ai_result.risk
    result["uncertainty"] = (
        ai_result.uncertainty
    )

    result["human_review_required"] = True

    return result