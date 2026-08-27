# backend/app/services/telemetry_service.py
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.database.database import SessionLocal
from app.models.telemetry import TelemetryRecord
from app.schemas.telemetry import Telemetry
from app.services.midnight_service import anchor_telemetry
from app.services.incident_service import create_incident

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)


def _serialize_record(record: TelemetryRecord) -> dict:
    return {
        "telemetry": {
            "satellite_id": record.satellite_id,
            "battery": record.battery,
            "temperature": record.temperature,
            "signal_strength": record.signal_strength,
            "cpu_load": record.cpu_load,
            "payload_status": record.payload_status,
            "timestamp": record.timestamp
        },
        "analysis": {
            "is_anomaly": record.is_anomaly,
            "severity": record.severity,
            "alerts": json.loads(record.alerts or "[]")
        },
        "midnight": {
            "enabled": bool(record.midnight_enabled),
            "status": record.midnight_status,
            "network": record.midnight_network,
            "contract_address": record.midnight_contract_address,
            "commitment": record.midnight_commitment,
            "tx_hash": record.midnight_tx_hash,
            "anchored_at": record.midnight_anchored_at,
            "error": record.midnight_error,
        }
    }


def _parse_timestamp(timestamp: str) -> datetime:
    parsed = datetime.fromisoformat(timestamp)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def save_telemetry(data: Telemetry, analysis: dict) -> dict:
    """
    Persist telemetry, perform Midnight anchoring, and automatically
    create a MissionVault Sentinel incident when an anomaly is detected.
    """

    incident = None

    # ---------------------------------------------------------
    # Create telemetry database record
    # ---------------------------------------------------------
    record = TelemetryRecord(
        satellite_id=data.satellite_id,
        battery=data.battery,
        temperature=data.temperature,
        signal_strength=data.signal_strength,
        cpu_load=data.cpu_load,
        payload_status=data.payload_status,
        timestamp=data.timestamp.isoformat(),
        is_anomaly=analysis.get("is_anomaly", False),
        severity=analysis.get("severity", "normal"),
        alerts=json.dumps(
            analysis.get("alerts", [])
        ),
    )

    with SessionLocal() as db:
        db.add(record)
        db.commit()
        db.refresh(record)

        # -----------------------------------------------------
        # Midnight anchoring
        # -----------------------------------------------------
        anchor_payload = {
            "record_id": record.id,
            "telemetry": {
                "satellite_id": record.satellite_id,
                "battery": record.battery,
                "temperature": record.temperature,
                "signal_strength": record.signal_strength,
                "cpu_load": record.cpu_load,
                "payload_status": record.payload_status,
                "timestamp": record.timestamp,
            },
            "analysis": {
                "is_anomaly": record.is_anomaly,
                "severity": record.severity,
                "alerts": json.loads(
                    record.alerts or "[]"
                ),
            },
        }

        midnight_receipt = anchor_telemetry(
            anchor_payload
        )

        record.midnight_enabled = bool(
            midnight_receipt.get("enabled", False)
        )

        record.midnight_status = midnight_receipt.get(
            "status",
            "local-only",
        )

        record.midnight_network = midnight_receipt.get(
            "network"
        )

        record.midnight_contract_address = (
            midnight_receipt.get(
                "contract_address"
            )
        )

        record.midnight_commitment = (
            midnight_receipt.get(
                "commitment"
            )
        )

        record.midnight_tx_hash = (
            midnight_receipt.get(
                "tx_hash"
            )
        )

        record.midnight_anchored_at = (
            midnight_receipt.get(
                "anchored_at"
            )
        )

        record.midnight_error = (
            midnight_receipt.get(
                "error"
            )
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        logger.info(
            "Stored telemetry packet ID: %d",
            record.id,
        )

        logger.info(
            "Total stored packets: %d",
            db.scalar(
                select(func.count(TelemetryRecord.id))
            ),
        )

        serialized_record = _serialize_record(
            record
        )

    # ---------------------------------------------------------
    # MissionVault Sentinel incident creation
    #
    # This happens AFTER the telemetry transaction has
    # completed, so incident_service can safely open its
    # own database session.
    # ---------------------------------------------------------
    if analysis.get("is_anomaly", False):
        incident = create_incident(
            data=data,
            analysis=analysis,
        )

    serialized_record["incident"] = incident

    return serialized_record


def get_all_telemetry() -> list[dict]:
    with SessionLocal() as db:
        statement = select(TelemetryRecord).order_by(TelemetryRecord.id.asc())
        records = db.scalars(statement).all()
        return [_serialize_record(record) for record in records]


def get_latest_telemetry() -> dict | None:
    with SessionLocal() as db:
        statement = select(TelemetryRecord).order_by(TelemetryRecord.id.desc()).limit(1)
        record = db.scalars(statement).first()

        if record is None:
            logger.warning("No telemetry records found.")
            return None

        return _serialize_record(record)


def get_current_mission_status() -> str:
    latest = get_latest_telemetry()
    if latest is None:
        return "Unknown"

    severity = latest["analysis"].get("severity", "normal").lower()

    if severity == "critical":
        return "Critical"
    if severity == "warning":
        return "Warning"
    return "Healthy"


def get_telemetry_stats() -> dict:
    with SessionLocal() as db:
        total_packets = db.scalar(select(func.count(TelemetryRecord.id))) or 0
        normal = db.scalar(
            select(func.count(TelemetryRecord.id)).where(TelemetryRecord.severity == "normal")
        ) or 0
        warning = db.scalar(
            select(func.count(TelemetryRecord.id)).where(TelemetryRecord.severity == "warning")
        ) or 0
        critical = db.scalar(
            select(func.count(TelemetryRecord.id)).where(TelemetryRecord.severity == "critical")
        ) or 0

        anomalies = warning + critical

        return {
            "total_packets": total_packets,
            "normal": normal,
            "warning": warning,
            "critical": critical,
            "anomalies": anomalies
        }


def get_health_metrics() -> dict:
    with SessionLocal() as db:
        total_packets = db.scalar(select(func.count(TelemetryRecord.id))) or 0

        if total_packets == 0:
            return {
                "battery": {"average": 0, "minimum": 0, "maximum": 0},
                "temperature": {"average": 0, "minimum": 0, "maximum": 0},
                "cpu": {"average": 0, "minimum": 0, "maximum": 0},
                "signal": {"average": 0, "minimum": 0, "maximum": 0},
            }

        battery_stats = db.execute(
            select(func.avg(TelemetryRecord.battery), func.min(TelemetryRecord.battery), func.max(TelemetryRecord.battery))
        ).one()
        temperature_stats = db.execute(
            select(func.avg(TelemetryRecord.temperature), func.min(TelemetryRecord.temperature), func.max(TelemetryRecord.temperature))
        ).one()
        cpu_stats = db.execute(
            select(func.avg(TelemetryRecord.cpu_load), func.min(TelemetryRecord.cpu_load), func.max(TelemetryRecord.cpu_load))
        ).one()
        signal_stats = db.execute(
            select(func.avg(TelemetryRecord.signal_strength), func.min(TelemetryRecord.signal_strength), func.max(TelemetryRecord.signal_strength))
        ).one()

        return {
            "battery": {
                "average": round(battery_stats[0], 2),
                "minimum": battery_stats[1],
                "maximum": battery_stats[2]
            },
            "temperature": {
                "average": round(temperature_stats[0], 2),
                "minimum": temperature_stats[1],
                "maximum": temperature_stats[2]
            },
            "cpu": {
                "average": round(cpu_stats[0], 2),
                "minimum": cpu_stats[1],
                "maximum": cpu_stats[2]
            },
            "signal": {
                "average": round(signal_stats[0], 2),
                "minimum": signal_stats[1],
                "maximum": signal_stats[2]
            }
        }


def get_time_statistics() -> dict:
    with SessionLocal() as db:
        packet_count = db.scalar(select(func.count(TelemetryRecord.id))) or 0

        if packet_count == 0:
            return {
                "first_packet": None,
                "last_packet": None,
                "mission_duration_seconds": 0,
                "packets": 0,
                "average_interval_seconds": 0,
                "packets_per_minute": 0,
                "packets_per_hour": 0
            }

        first_record = db.scalars(
            select(TelemetryRecord).order_by(TelemetryRecord.id.asc()).limit(1)
        ).first()
        last_record = db.scalars(
            select(TelemetryRecord).order_by(TelemetryRecord.id.desc()).limit(1)
        ).first()

        first_packet = _parse_timestamp(first_record.timestamp)
        last_packet = _parse_timestamp(last_record.timestamp)

        mission_duration = (last_packet - first_packet).total_seconds()

        if mission_duration <= 0:
            average_interval = 0
            packets_per_minute = 0
            packets_per_hour = 0
        else:
            average_interval = mission_duration / (packet_count - 1) if packet_count > 1 else 0
            packets_per_minute = packet_count / (mission_duration / 60)
            packets_per_hour = packet_count / (mission_duration / 3600)

        return {
            "first_packet": first_record.timestamp,
            "last_packet": last_record.timestamp,
            "mission_duration_seconds": round(mission_duration, 2),
            "packets": packet_count,
            "average_interval_seconds": round(average_interval, 2),
            "packets_per_minute": round(packets_per_minute, 2),
            "packets_per_hour": round(packets_per_hour, 2)
        }


def get_mission_summary() -> dict:
    latest = get_latest_telemetry()
    statistics = get_telemetry_stats()

    return {
        "statistics": statistics,
        "metrics": get_health_metrics(),
        "time": get_time_statistics(),
        "latest": latest,
        "anomalies": statistics["anomalies"]
    }


def get_trend_analysis() -> dict:
    with SessionLocal() as db:
        first = db.scalars(
            select(TelemetryRecord).order_by(TelemetryRecord.id.asc()).limit(1)
        ).first()
        latest = db.scalars(
            select(TelemetryRecord).order_by(TelemetryRecord.id.desc()).limit(1)
        ).first()

        if first is None or latest is None or first.id == latest.id:
            return {"message": "At least two telemetry packets are required."}

        def calculate_trend(first_value, latest_value):
            if latest_value > first_value:
                return "increasing"
            if latest_value < first_value:
                return "decreasing"
            return "stable"

        return {
            "battery": {
                "first": first.battery,
                "latest": latest.battery,
                "trend": calculate_trend(first.battery, latest.battery)
            },
            "temperature": {
                "first": first.temperature,
                "latest": latest.temperature,
                "trend": calculate_trend(first.temperature, latest.temperature)
            },
            "cpu": {
                "first": first.cpu_load,
                "latest": latest.cpu_load,
                "trend": calculate_trend(first.cpu_load, latest.cpu_load)
            },
            "signal": {
                "first": first.signal_strength,
                "latest": latest.signal_strength,
                "trend": calculate_trend(first.signal_strength, latest.signal_strength)
            }
        }


def get_anomalies() -> list[dict]:
    with SessionLocal() as db:
        statement = (
            select(TelemetryRecord)
            .where(TelemetryRecord.is_anomaly.is_(True))
            .order_by(TelemetryRecord.id.asc())
        )
        records = db.scalars(statement).all()
        return [_serialize_record(record) for record in records]


def get_recent_anomalies(limit: int = 10) -> list[dict]:
    if limit <= 0:
        return []

    with SessionLocal() as db:
        statement = (
            select(TelemetryRecord)
            .where(TelemetryRecord.is_anomaly.is_(True))
            .order_by(TelemetryRecord.id.desc())
            .limit(limit)
        )
        records = list(reversed(db.scalars(statement).all()))
        return [_serialize_record(record) for record in records]


def get_telemetry_by_severity(level: str) -> list[dict]:
    level = level.lower()
    with SessionLocal() as db:
        statement = (
            select(TelemetryRecord)
            .where(TelemetryRecord.severity == level)
            .order_by(TelemetryRecord.id.asc())
        )
        records = db.scalars(statement).all()
        return [_serialize_record(record) for record in records]


def get_telemetry_by_satellite(satellite_id: str) -> list[dict]:
    with SessionLocal() as db:
        statement = (
            select(TelemetryRecord)
            .where(TelemetryRecord.satellite_id == satellite_id)
            .order_by(TelemetryRecord.id.asc())
        )
        records = db.scalars(statement).all()
        return [_serialize_record(record) for record in records]


def search_telemetry(
    satellite_id: str | None = None,
    severity: str | None = None,
    limit: int = 100
) -> list[dict]:
    if satellite_id is not None:
        satellite_id = satellite_id.strip() or None

    if severity is not None:
        severity = severity.lower().strip() or None

    if limit <= 0:
        return []

    limit = min(limit, 500)

    with SessionLocal() as db:
        statement = select(TelemetryRecord)

        if satellite_id is not None:
            statement = statement.where(TelemetryRecord.satellite_id == satellite_id)

        if severity is not None:
            statement = statement.where(TelemetryRecord.severity == severity)

        statement = statement.order_by(TelemetryRecord.id.desc()).limit(limit)
        records = db.scalars(statement).all()

        return [_serialize_record(record) for record in records]


def get_chart_data(limit: int = 120) -> list[dict]:
    if limit <= 0:
        return []

    with SessionLocal() as db:
        statement = (
            select(TelemetryRecord)
            .order_by(TelemetryRecord.id.desc())
            .limit(limit)
        )
        records = list(reversed(db.scalars(statement).all()))

        return [
            {
                "timestamp": record.timestamp,
                "satellite_id": record.satellite_id,
                "battery": record.battery,
                "temperature": record.temperature,
                "cpu_load": record.cpu_load,
                "signal_strength": record.signal_strength
            }
            for record in records
        ]


def get_dashboard_data() -> dict:
    latest = get_latest_telemetry()
    statistics = get_telemetry_stats()
    recent_alerts = get_recent_anomalies(limit=10)
    mission_status = get_current_mission_status()
    chart_history = get_chart_data(limit=120)

    return {
        "mission_status": mission_status,
        "latest": latest,
        "statistics": statistics,
        "metrics": get_health_metrics(),
        "time": get_time_statistics(),
        "trends": get_trend_analysis(),
        "alerts": recent_alerts,
        "alert_count": statistics["anomalies"],
        "history": chart_history
    }