# backend/app/schemas/investigation.py

from pydantic import BaseModel, Field, field_validator


class InvestigationResponse(BaseModel):
    """
    Canonical structured response produced by the AI investigation
    service.

    This schema is shared conceptually by:
    Gemini -> backend -> database -> frontend
    """

    diagnosis: str = Field(
        ...,
        min_length=1,
        description=(
            "Most likely explanation of the already-detected "
            "incident."
        ),
    )

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Confidence in the diagnosis, from 0.0 to 1.0."
        ),
    )

    evidence: list[str] = Field(
        default_factory=list,
        description=(
            "Specific telemetry observations supporting "
            "the diagnosis."
        ),
    )

    recommended_actions: list[str] = Field(
        default_factory=list,
        description=(
            "Non-autonomous actions for a human operator "
            "to review."
        ),
    )

    risk: str = Field(
        ...,
        min_length=1,
        description=(
            "Potential operational risk associated with "
            "the incident."
        ),
    )

    uncertainty: str = Field(
        ...,
        min_length=1,
        description=(
            "Important uncertainty or missing evidence."
        ),
    )

    human_review_required: bool = Field(
        default=True,
        description=(
            "Human operator review must remain required."
        ),
    )

    @field_validator("human_review_required")
    @classmethod
    def enforce_human_review(
        cls,
        value: bool,
    ) -> bool:
        """
        MissionVault Sentinel does not permit autonomous
        spacecraft control.
        """
        return True