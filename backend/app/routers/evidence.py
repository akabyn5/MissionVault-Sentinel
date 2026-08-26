# backend/app/routers/evidence.py

from fastapi import APIRouter, HTTPException

from app.schemas.evidence import (
    EvidenceVerificationRequest,
    EvidenceVerificationResponse,
)
from app.services.evidence_service import (
    verify_evidence_package,
)


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"],
)


@router.post(
    "/verify",
    response_model=EvidenceVerificationResponse,
)
def verify_evidence(
    payload: EvidenceVerificationRequest,
):
    """
    Recalculate the SHA-256 fingerprint of an evidence
    package and compare it with the supplied expected hash.
    """

    try:
        result = verify_evidence_package(
            evidence_package=payload.evidence_package,
            expected_sha256=payload.expected_sha256,
        )

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Evidence verification failed: {exc}",
        ) from exc