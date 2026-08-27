import { Line } from "react-chartjs-2";
import "chart.js/auto";

function formatUtcTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Invalid";
  return date.toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function buildChart(history, field, label, color) {
  return {
    labels: history.map((p) => formatUtcTime(p.timestamp)),
    datasets: [{
      label,
      data: history.map((p) => p[field]),
      borderColor: color,
      backgroundColor: color.replace(")", ", 0.12)").replace("rgb", "rgba"),
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.25,
      fill: true
    }]
  };
}

const chartOptions = (yTitle) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: (items) => (items[0] ? items[0].label + " UTC" : "") } }
  },
  scales: {
    x: { ticks: { maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } },
    y: { title: { display: true, text: yTitle }, beginAtZero: false }
  }
});

function MiniChart({ title, history, field, unit, color }) {
  if (!history || history.length === 0) {
    return (
      <article className="incident-timeline-card">
        <h3>{title}</h3>
        <p className="muted">No history available</p>
      </article>
    );
  }
  const data = buildChart(history, field, title, color);
  return (
    <article className="incident-timeline-card">
      <div className="incident-timeline-card-header">
        <h3>{title}</h3>
        <span className="sample-count">{history.length} samples</span>
      </div>
      <div className="incident-timeline-chart">
        <Line data={data} options={chartOptions(unit)} />
      </div>
    </article>
  );
}

// Devuelve el estado real del payload para un punto de telemetría (campo confirmado: payload_status)
function getPayloadStatus(point) {
  return point.payload_status ?? "—";
}

// Encuentra el índice del punto de history que coincide con el timestamp del incidente (el TRIGGER)
function findTriggerIndex(history, incident) {
  if (!Array.isArray(history) || history.length === 0) return -1;
  if (!incident?.timestamp) return -1;

  const incidentTime = new Date(incident.timestamp).getTime();
  if (Number.isNaN(incidentTime)) return -1;

  const exactIndex = history.findIndex(
    (p) => new Date(p.timestamp).getTime() === incidentTime
  );
  if (exactIndex !== -1) return exactIndex;

  let closestIndex = -1;
  let closestDiff = Infinity;
  history.forEach((p, i) => {
    const diff = Math.abs(new Date(p.timestamp).getTime() - incidentTime);
    if (!Number.isNaN(diff) && diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  });
  return closestIndex;
}

// Calcula el tiempo relativo al TRIGGER: "T-8s", "T+0s", "T+4s"
function relativeToTrigger(timestamp, triggerTimestamp) {
  if (!timestamp || !triggerTimestamp) return "—";
  const t = new Date(timestamp).getTime();
  const triggerT = new Date(triggerTimestamp).getTime();
  if (Number.isNaN(t) || Number.isNaN(triggerT)) return "—";

  const diffSeconds = Math.round((t - triggerT) / 1000);
  if (diffSeconds === 0) return "T+0s";
  return diffSeconds > 0 ? `T+${diffSeconds}s` : `T${diffSeconds}s`;
}

function EvidenceTable({ history, triggerIndex }) {
  const triggerTimestamp = triggerIndex !== -1 ? history[triggerIndex].timestamp : null;

  return (
    <div className="incident-evidence-table-wrapper">
      <h3>Evidence Table</h3>
      <table className="incident-evidence-table">
        <thead>
          <tr>
            <th>Relative Time</th>
            <th>Battery</th>
            <th>Temperature</th>
            <th>CPU</th>
            <th>Signal</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {history.map((point, i) => {
            const status = getPayloadStatus(point);
            const isError = String(status).toUpperCase() === "ERROR";
            return (
              <tr
                key={point.id ?? i}
                className={i === triggerIndex ? "incident-trigger-row" : ""}
              >
                <td>
                  {relativeToTrigger(point.timestamp, triggerTimestamp)}
                  {i === triggerIndex ? " ⚠ TRIGGER" : ""}
                </td>
                <td>{point.battery ?? "—"}</td>
                <td>{point.temperature ?? "—"}</td>
                <td>{point.cpu_load ?? "—"}</td>
                <td>{point.signal_strength ?? "—"}</td>
                <td className={isError ? "payload-error" : ""}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function IncidentTimeline({ history = [], incident }) {
  const safeHistory = Array.isArray(history) ? history : [];
  const anomaly = incident?.primary_anomaly || "unknown";
  const triggerIndex = findTriggerIndex(safeHistory, incident);

  return (
    <section className="incident-timeline-section">
      <div className="section-header">
        <div>
          <h2>Incident Timeline</h2>
          <p>Telemetry progression leading up to the anomaly{anomaly !== "unknown" ? ` (primary: ${anomaly})` : ""}.</p>
        </div>
        <span className="section-badge">{safeHistory.length}</span>
      </div>

      {safeHistory.length === 0 ? (
        <div className="empty-state"><p>No historical telemetry available for this incident window.</p></div>
      ) : (
        <>
          {triggerIndex !== -1 && (
            <div className="incident-trigger-banner">
              TRIGGER detected at {formatUtcTime(safeHistory[triggerIndex].timestamp)} UTC — Payload: {getPayloadStatus(safeHistory[triggerIndex])}
            </div>
          )}

          <div className="incident-timeline-grid">
            <MiniChart title="Temperature" history={safeHistory} field="temperature" unit="°C" color="rgb(245, 158, 11)" />
            <MiniChart title="CPU Load" history={safeHistory} field="cpu_load" unit="%" color="rgb(167, 139, 250)" />
            <MiniChart title="Battery" history={safeHistory} field="battery" unit="%" color="rgb(34, 211, 238)" />
            <MiniChart title="Signal Strength" history={safeHistory} field="signal_strength" unit="dBm" color="rgb(96, 165, 250)" />
          </div>

          <EvidenceTable history={safeHistory} triggerIndex={triggerIndex} />
        </>
      )}
    </section>
  );
}