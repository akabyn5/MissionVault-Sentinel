/**
 * Converts an existing alert into an Incident object.
 */
export function deriveAnomalyType(alertMessages = []) {
  const joined = (alertMessages || []).join(" ").toLowerCase();
  if (joined.includes("temperature") || joined.includes("thermal") || joined.includes("°c") || joined.includes("temp")) return "thermal";
  if (joined.includes("battery")) return "battery";
  if (joined.includes("signal")) return "signal";
  if (joined.includes("cpu")) return "cpu";
  if (joined.includes("payload")) return "payload";
  return "unknown";
}

export function buildIncidentFromAlert(alert, index = 0) {
  if (!alert) return null;
  const telemetry = alert.telemetry || {};
  const analysis = alert.analysis || {};
  const messages = Array.isArray(analysis.alerts) ? analysis.alerts : [];
  const severity = (analysis.severity || "unknown").toLowerCase();
  const anomalyType = deriveAnomalyType(messages);
  const primaryAnomalyLabels = {
    thermal: "THERMAL EXCURSION",
    battery: "BATTERY CRITICAL",
    signal: "SIGNAL DEGRADATION",
    cpu: "CPU OVERLOAD",
    payload: "PAYLOAD ERROR",
    unknown: "TELEMETRY ANOMALY"
  };
  const incidentId = `INC-${String(index + 1).padStart(4, "0")}`;
  return {
    id: incidentId,
    incident_id: incidentId,
    satellite_id: telemetry.satellite_id || "UNKNOWN",
    severity,
    status: "OPEN",
    primary_anomaly: anomalyType,
    primary_anomaly_label: primaryAnomalyLabels[anomalyType] || primaryAnomalyLabels.unknown,
    messages,
    timestamp: telemetry.timestamp || null,
    telemetry,
    analysis,
    sourceAlert: alert
  };
}

export function getSeverityClass(severity) {
  const s = (severity || "unknown").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "warning") return "warning";
  if (s === "normal") return "normal";
  return "unknown";
}
