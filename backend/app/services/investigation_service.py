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
from app.models.investigation import Investigation
from app.schemas.investigation import InvestigationResponse
from app.services.incident_service import reconstruct_incident


load_dotenv()

logger = logging.getLogger(__name__)


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    "",
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
).strip()


def _utc_now() -> str:
    """Return the current UTC timestamp as ISO-8601."""
    return datetime.now(
        timezone.utc
    ).isoformat()


def _serialize_investigation(
    investigation: Investigation,
) -> dict:
    """
    Convert a database investigation record into the
    canonical MissionVault Sentinel API representation.
    """

    try:
        stored_data = json.loads(
            investigation.evidence or "{}"
        )
    except (
        json.JSONDecodeError,
        TypeError,
    ):
        stored_data = {}

    return {
        "id": investigation.id,
        "incident_id": investigation.incident_id,
        "diagnosis": investigation.diagnosis,
        "confidence": investigation.confidence,
        "evidence": stored_data.get(
            "supporting_evidence",
            [],
        ),
        "recommended_actions": stored_data.get(
            "recommended_actions",
            [],
        ),
        "risk": stored_data.get(
            "risk",
            "Unknown",
        ),
        "uncertainty": stored_data.get(
            "uncertainty",
            "Unknown",
        ),
        "human_review_required": True,
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

    Gemini receives the already-detected incident and its
    telemetry context. It does not determine whether the
    telemetry is anomalous.
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

Your task is to investigate the already-detected incident
using ONLY the supplied incident context and telemetry.

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
- Use telemetry history to compare conditions before,
  during, and after the anomaly when available.
- Distinguish observations from conclusions.
- Return exactly the fields defined by the response schema.
- Do not return Markdown.
- Do not wrap the response in code fences.
- Do not add additional fields.

Incident context:

{serialized_context}
""".strip()


def _run_gemini_investigation(
    reconstruction: dict,
) -> InvestigationResponse:
    """
    Send reconstructed incident evidence to Gemini and
    return a strictly validated structured investigation.
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

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InvestigationResponse,
                temperature=0.2,
            ),
        )
    except Exception as exc:
        logger.exception(
            "Gemini API request failed."
        )

        raise RuntimeError(
            f"Gemini API request failed: {exc}"
        ) from exc

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    try:
        result = (
            InvestigationResponse.model_validate_json(
                response.text
            )
        )
    except ValidationError as exc:
        logger.exception(
            "Gemini returned invalid structured output."
        )

        raise RuntimeError(
            "Gemini returned an invalid investigation response."
        ) from exc

    # MissionVault Sentinel safety invariant.
    # AI investigation always requires human review.
    result.human_review_required = True

    return result


def create_initial_investigation(
    incident_id: int,
) -> dict | None:
    """
    Run the Gemini-powered investigation for an incident.

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
                "uncertainty": (
                    ai_result.uncertainty
                ),
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

        return _serialize_investigation(
            investigation
        )