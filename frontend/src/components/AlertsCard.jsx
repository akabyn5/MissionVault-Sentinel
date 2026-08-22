function getAlertTitle(message) {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("battery")) return "Battery Low";
  if (normalizedMessage.includes("temperature")) return "Temperature High";
  if (normalizedMessage.includes("signal")) return "Signal Weak";
  if (normalizedMessage.includes("cpu")) return "CPU Load High";
  if (normalizedMessage.includes("payload")) return "Payload Error";
  return "Telemetry Anomaly";
}

function formatUtcTime(timestamp) {
  if (!timestamp) return "Unknown time";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Invalid time";
  return date.toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";
}

export default function AlertsCard({ alerts, onViewIncident }) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const orderedAlerts = [...safeAlerts].reverse();

  return (
    <section className="alerts-section">
      <div className="alerts-section-header">
        <div>
          <h2>Recent Alerts</h2>
          <p className="alerts-section-description">Latest telemetry anomalies detected by MissionVault AI.</p>
        </div>
        <span className="alerts-count">{safeAlerts.length}</span>
      </div>

      {orderedAlerts.length === 0 ? (
        <div className="alerts-empty-state">
          <span className="alerts-empty-indicator" />
          <div>
            <strong>No recent alerts</strong>
            <p>Current telemetry is within normal limits.</p>
          </div>
        </div>
      ) : (
        <div className="alerts-grid">
          {orderedAlerts.map((alert, index) => {
            const telemetry = alert?.telemetry || {};
            const analysis = alert?.analysis || {};
            const severity = analysis.severity?.toLowerCase() || "unknown";
            const messages = Array.isArray(analysis.alerts) ? analysis.alerts : [];
            const satelliteId = telemetry.satellite_id || "Unknown satellite";
            const timestamp = telemetry.timestamp;
            const originalIndex = safeAlerts.length - 1 - index;

            return (
              <article className={`alert-card alert-card-${severity}`} key={`${timestamp || "alert"}-${index}`}>
                <div className="alert-card-header">
                  <span className={`alert-severity-badge alert-severity-${severity}`}>{severity.toUpperCase()}</span>
                  <time className="alert-time" dateTime={timestamp}>{formatUtcTime(timestamp)}</time>
                </div>
                <div className="alert-card-events">
                  {messages.length === 0 ? (
                    <div className="alert-event">
                      <h3>Telemetry Anomaly</h3>
                      <p>An anomaly was detected, but no description was provided.</p>
                    </div>
                  ) : (
                    messages.map((message, messageIndex) => (
                      <div className="alert-event" key={`${message}-${messageIndex}`}>
                        <h3>{getAlertTitle(message)}</h3>
                        <p>{message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="alert-card-footer">
                  <span>Satellite</span>
                  <strong>{satelliteId}</strong>
                </div>
                {typeof onViewIncident === "function" && (
                  <div className="alert-card-actions">
                    <button type="button" className="btn-view-incident" onClick={() => onViewIncident(alert, originalIndex)}>
                      View Incident →
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
