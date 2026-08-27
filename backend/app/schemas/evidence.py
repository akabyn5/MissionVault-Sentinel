# backend/app/schemas/evidence.py

from typing import Any

from pydantic import BaseModel, Field


class EvidenceVerificationRequest(BaseModel):
    evidence_package: dict[str, Any] = Field(
        ...,
        description="Canonical MissionVault Sentinel evidence package.",
    )

    expected_sha256: str = Field(
        ...,
        min_length=64,
        max_length=64,
        description="Expected SHA-256 fingerprint.",
    )


class EvidenceVerificationResponse(BaseModel):
    valid: bool
    status: str
    computed_sha256: str | None = None
    expected_sha256: str | None = None