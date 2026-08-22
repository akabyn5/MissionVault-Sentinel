const MOCKS = {
  thermal: {
    diagnosis: "Computational thermal overload",
    confidence: 0.84,
    evidence: [
      "Temperature increased significantly over the last 10 samples",
      "CPU load increased significantly and remained elevated",
      "Battery remained relatively stable",
      "Signal remained within nominal range"
    ],
    recommended_actions: [
      "Verify payload processing state",
      "Review computational load on the payload processor",
      "Continue thermal monitoring for the next 15 minutes"
    ],
    risk: "Potential thermal escalation if CPU load remains high",
    human_review_required: true
  },
  battery: {
    diagnosis: "Rapid battery discharge event",
    confidence: 0.79,
    evidence: [
      "Battery level dropped below critical threshold",
      "Temperature remained within normal operating range",
      "CPU load did not show abnormal spikes",
      "Signal strength remained stable"
    ],
    recommended_actions: [
      "Confirm power subsystem telemetry",
      "Check for unexpected payload power draw",
      "Evaluate entry into power-saving mode"
    ],
    risk: "Risk of loss of attitude control if battery continues to discharge",
    human_review_required: true
  },
  signal: {
    diagnosis: "Link degradation / possible attitude misalignment",
    confidence: 0.72,
    evidence: [
      "Signal strength fell below -100 dBm",
      "Battery and temperature remained nominal",
      "CPU load showed no correlation with the drop",
      "Payload status remained ACTIVE"
    ],
    recommended_actions: [
      "Review attitude determination and control system (ADCS) data",
      "Check for possible interference or antenna occlusion",
      "Monitor signal recovery over the next pass"
    ],
    risk: "Temporary loss of command and telemetry capability",
    human_review_required: true
  },
  cpu: {
    diagnosis: "Sustained high computational load",
    confidence: 0.81,
    evidence: [
      "CPU load exceeded 95%",
      "Temperature began rising after the CPU spike",
      "Battery showed mild additional drain",
      "Signal remained within limits"
    ],
    recommended_actions: [
      "Identify the process consuming CPU cycles",
      "Consider throttling non-critical payload tasks",
      "Monitor temperature for secondary thermal effects"
    ],
    risk: "Secondary thermal excursion if load is not reduced",
    human_review_required: true
  },
  payload: {
    diagnosis: "Payload subsystem reported ERROR state",
    confidence: 0.88,
    evidence: [
      "Payload status changed to ERROR",
      "Other health metrics (battery, temperature, signal) remained nominal",
      "No preceding CPU overload observed",
      "Anomaly is isolated to the payload subsystem"
    ],
    recommended_actions: [
      "Request detailed payload diagnostic packet",
      "Evaluate safe mode for the payload",
      "Confirm whether the error is recoverable"
    ],
    risk: "Loss of science data collection until payload is recovered",
    human_review_required: true
  },
  unknown: {
    diagnosis: "Unclassified telemetry anomaly",
    confidence: 0.55,
    evidence: [
      "One or more telemetry parameters crossed configured thresholds",
      "Insufficient correlated signals to form a specific diagnosis"
    ],
    recommended_actions: [
      "Review the full telemetry window around the event",
      "Compare against previous similar anomalies",
      "Escalate to senior mission operator if pattern repeats"
    ],
    risk: "Unknown – further investigation required",
    human_review_required: true
  }
};

export function getMockInvestigation(anomalyType = "unknown") {
  const key = (anomalyType || "unknown").toLowerCase();
  const base = MOCKS[key] || MOCKS.unknown;
  return { ...base, _isMock: true, _source: "local-mock-fallback" };
}

export default MOCKS;
