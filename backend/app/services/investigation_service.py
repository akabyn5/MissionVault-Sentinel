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
    Build a controlled, evidence-bound prompt for Gemini.

    Gemini investigates an incident that has already been
    classified by the deterministic telemetry engine.
    Gemini does not decide whether an anomaly exists.
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
    You are MissionVault Sentinel's AI Mission Investigation
    Assistant.
    
    ROLE:
    Investigate an already-detected satellite telemetry incident
    for a human mission operator.
    IMPORTANT:
    The deterministic telemetry analysis system has ALREADY
    classified the telemetry as anomalous and created this incident.
    
    You must NOT determine whether the telemetry is anomalous.
    
    Your task is to investigate the incident using ONLY the
    supplied incident metadata, telemetry timeline, and analysis
    context.
    
    OBJECTIVES:
    
    1. Determine the most likely cause or explanation.
    2. Identify the specific telemetry evidence supporting the
    conclusion.
    3. Identify relevant uncertainty, missing information, or
    alternative explanations.
    4. Recommend non-autonomous actions that a human operator
    should review.
    5. Identify the potential operational risk.
    
    EVIDENCE RULES:
    - Use only information contained in the supplied incident
    context.
    - Do not invent telemetry values.
    - Do not invent subsystem states.
    - Do not invent events that are not present in the timeline.
    - Do not assume hardware behavior that is not supported by
    the supplied evidence.
    - Distinguish observed telemetry from inferred conclusions.
    - When evidence is insufficient, explicitly state that it is
    insufficient.
    - Do not claim certainty when the evidence only supports a
    possibility.

    SAFETY RULES:

    - Do not issue spacecraft commands.
    - Do not recommend autonomous spacecraft control.
    - Do not instruct the system to directly control the spacecraft.
    - All recommendations must be non-autonomous review actions.
    - human_review_required MUST be true.
    
    ANALYSIS RULES:

    - Compare telemetry before, during, and after the incident
    when those records are available.
    - Look for relationships between temperature, battery,
    CPU load, signal strength, and payload status.
    - Prefer explanations supported by multiple telemetry
    observations over explanations supported by a single value.
    - Explicitly identify uncertainty when multiple causes are
    plausible.
    - Do not treat correlation as proof of causation.

    OUTPUT RULES:
    
    Return ONLY the structured response defined by the supplied
    InvestigationResponse schema.
    
    The response must contain:
    
    - diagnosis
    - confidence
    - evidence
    - recommended_actions
    - risk
    - uncertainty
    - human_review_required
    
    Do not return Markdown.
    Do not use code fences.
    Do not add extra fields.
    Do not omit required fields.
    
    INCIDENT DATA:
    
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