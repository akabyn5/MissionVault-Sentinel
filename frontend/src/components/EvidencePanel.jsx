function deriveSupportingSignals(investigation, anomalyType) {
  const evidence = investigation?.evidence || [];
  const signals = [];
  const lower = evidence.map((e) => e.toLowerCase());
  if (lower.some((e) => e.includes("cpu"))) signals.push("CPU increase");
  if (lower.some((e) => e.includes("temperature") || e.includes("thermal"))) signals.push("Temperature excursion");
  if (lower.some((e) => e.includes("battery") && e.includes("stable"))) signals.push("Stable battery");
  if (lower.some((e) => e.includes("signal") && e.includes("stable"))) signals.push("Stable signal");
  if (lower.some((e) => e.includes("battery") && (e.includes("drop") || e.includes("critical")))) signals.push("Battery drop");
  if (lower.some((e) => e.includes("signal") && (e.includes("degrad") || e.includes("weak") || e.includes("fell")))) signals.push("Signal degradation");
  if (lower.some((e) => e.includes("payload"))) signals.push("Payload error");
  if (signals.length === 0) {
    if (anomalyType === "thermal") signals.push("Temperature excursion", "CPU correlation");
    else if (anomalyType === "battery") signals.push("Battery drop");
    else if (anomalyType === "signal") signals.push("Signal degradation");
    else if (anomalyType === "cpu") signals.push("CPU increase");
    else if (anomalyType === "payload") signals.push("Payload error");
    else signals.push("Threshold crossed");
  }
  return signals;
}

export default function EvidencePanel({ incident, investigation, historyCount = 0 }) {
  if (!investigation) {
    return (
      <section className="evidence-panel idle">
        <h2>Evidence</h2>
        <p className="muted">Evidence will appear after the investigation runs.</p>
      </section>
    );
  }
  const anomalyLabel = incident?.primary_anomaly_label || (incident?.primary_anomaly || "unknown").toUpperCase();
  const supporting = deriveSupportingSignals(investigation, incident?.primary_anomaly);
  const analyzedCount = historyCount > 0 ? historyCount : (investigation.evidence?.length || 0) + 5;
  const timestamp = new Date().toISOString();
  return (
    <section className="evidence-panel">
      <div className="section-header"><h2>Evidence</h2></div>
      <div className="evidence-grid">
        <div className="evidence-field">
          <span className="field-label">Telemetry records analyzed</span>
          <p className="field-value large">{analyzedCount}</p>
        </div>
        <div className="evidence-field">
          <span className="field-label">Primary anomaly</span>
          <p className="field-value">{anomalyLabel}</p>
        </div>
        <div className="evidence-field full-width">
          <span className="field-label">Supporting signals</span>
          <ul className="signal-list">{supporting.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div className="evidence-field">
          <span className="field-label">Analysis timestamp</span>
          <p className="field-value mono">
            {new Date(timestamp).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} UTC
          </p>
        </div>
      </div>
      <p className="evidence-note">Information architecture for the future Evidence Chain (SHA-256 + verification).</p>
    </section>
  );
}
