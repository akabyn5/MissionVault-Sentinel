import PropTypes from "prop-types";

function normalizeStatus(status) {
  if (!status) {
    return "NOT_CONNECTED";
  }

  return String(status).toUpperCase().replace(/[\s-]+/g, "_");
}

function statusLabel(status) {
  const normalized = normalizeStatus(status);

  const labels = {
    CONNECTED: "Connected",
    VERIFIED: "Verified",
    PENDING: "Pending",
    LOCAL_ONLY: "Local Only",
    FAILED: "Failed",
    ERROR: "Error",
    NOT_CONNECTED: "Not Connected",
  };

  return labels[normalized] || status || "Not Connected";
}

function statusClass(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "CONNECTED" || normalized === "VERIFIED") {
    return "midnight-status midnight-status-success";
  }

  if (normalized === "PENDING" || normalized === "LOCAL_ONLY") {
    return "midnight-status midnight-status-pending";
  }

  if (
    normalized === "FAILED" ||
    normalized === "ERROR"
  ) {
    return "midnight-status midnight-status-error";
  }

  return "midnight-status midnight-status-neutral";
}

export default function MidnightPrivacyPanel({
  evidence,
  verification,
  loading = false,
}) {
  const midnight = evidence?.midnight || {};

  const commitment =
    midnight.commitment ||
    evidence?.sha256 ||
    null;

  const network =
    midnight.network ||
    "Midnight";

  const rawStatus =
    midnight.status ||
    (verification?.valid ? "verified" : "pending");

  const displayedStatus = statusLabel(rawStatus);

  return (
    <section className="midnight-privacy-panel">
      <div className="midnight-panel-header">
        <div>
          <p className="midnight-eyebrow">
            PRIVACY LAYER
          </p>

          <h2>Midnight Verification</h2>

          <p className="midnight-description">
            Sensitive mission evidence is represented by a
            verifiable privacy-layer result without exposing
            the full evidence package.
          </p>
        </div>

        <span className={statusClass(rawStatus)}>
          {displayedStatus}
        </span>
      </div>

      <div className="midnight-grid">
        <div className="midnight-field">
          <span className="midnight-field-label">
            Network
          </span>

          <strong>
            {network}
          </strong>
        </div>

        <div className="midnight-field">
          <span className="midnight-field-label">
            Evidence ID
          </span>

          <strong className="mono">
            {evidence?.evidence_id || "—"}
          </strong>
        </div>

        <div className="midnight-field midnight-field-full">
          <span className="midnight-field-label">
            Commitment
          </span>

          <strong className="mono midnight-commitment">
            {commitment || "Waiting for Midnight result"}
          </strong>
        </div>

        <div className="midnight-field">
          <span className="midnight-field-label">
            Verification
          </span>

          <strong>
            {loading
              ? "Verifying..."
              : verification?.valid
                ? "Valid"
                : "Not verified"}
          </strong>
        </div>

        <div className="midnight-field">
          <span className="midnight-field-label">
            Sensitive data
          </span>

          <strong>
            Protected
          </strong>
        </div>
      </div>
    </section>
  );
}

MidnightPrivacyPanel.propTypes = {
  evidence: PropTypes.object,
  verification: PropTypes.object,
  loading: PropTypes.bool,
};