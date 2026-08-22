# backend/app/models/recommendation.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database.database import Base


class Recommendation(Base):
    """
    Persistent database model for operator recommendations
    generated from an incident investigation.
    """

    __tablename__ = "recommendations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    incident_id = Column(
        Integer,
        ForeignKey("incidents.id"),
        nullable=False,
        index=True
    )

    action = Column(
        Text,
        nullable=False
    )

    rationale = Column(
        Text,
        nullable=False
    )

    risk = Column(
        Text,
        nullable=False
    )