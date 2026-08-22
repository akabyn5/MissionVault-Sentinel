import { getSeverityClass } from "../utils/incidentUtils";

export default function IncidentSummaryCard({ incident, onInvestigate, investigating }) {
  if (!incident) return null;
  const severityClass = getSeverityClass(incident.severity);
  return (
    <section className={`incident-summary-card severity-${severityClass}`}>
      <div className="incident-summary-header">
        <div>
          <p className="incident-product-label">MISSIONVAULT SENTINEL</p>
          <h2 className="incident-id">Incident #{incident.incident_id?.replace("INC-", "") || "0001"}</h2>
        </div>
        <span className={`incident-severity-badge severity-${severityClass}`}>
          {(incident.severity || "unknown").toUpperCase()}
        </span>
      </div>
      <div className="incident-summary-grid">
        <div className="incident-summary-field">
          <span className="field-label">Satellite</span>
          <strong className="field-value mono">{incident.satellite_id}</strong>
        </div>
        <div className="incident-summary-field">
          <span className="field-label">Status</span>
          <strong className="field-value">{incident.status || "OPEN"}</strong>
        </div>
        <div className="incident-summary-field">
          <span className="field-label">Primary anomaly</span>
          <strong className="field-value">{incident.primary_anomaly_label}</strong>
        </div>
        <div className="incident-summary-field">
          <span className="field-label">Detected at</span>
          <strong className="field-value mono">
            {incident.timestamp
              ? new Date(incident.timestamp).toLocaleString("en-GB", { timeZone: "UTC", hour12: false }) + " UTC"
              : "—"}
          </strong>
        </div>
      </div>
      {incident.messages?.length > 0 && (
        <div className="incident-messages">
          <span className="field-label">Alert messages</span>
          <ul>{incident.messages.map((msg, i) => <li key={i}>{msg}</li>)}</ul>
        </div>
      )}
      <div className="incident-summary-actions">
        <button type="button" className="btn-investigate" onClick={onInvestigate} disabled={investigating}>
          {investigating ? "Analyzing…" : "INVESTIGATE"}
        </button>
      </div>
    </section>
  );
}
