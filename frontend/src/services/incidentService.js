const API_BASE_URL = "http://127.0.0.1:8000";

async function apiFetch(
  path,
  { method = "GET", token = "", body = null } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    throw new Error(
      `HTTP ${response.status}${text ? `: ${text}` : ""}`
    );
  }

  return response.json();
}

export async function investigateIncident(incident, token = "") {
  const incidentId = incident?.incident_id || incident?.id;

  if (!incidentId) {
    throw new Error("Incident ID is missing.");
  }

  const data = await apiFetch(
    `/incidents/${incidentId}/investigate`,
    {
      method: "POST",
      token,
      body: {
        satellite_id: incident.satellite_id,
        primary_anomaly: incident.primary_anomaly,
        severity: incident.severity,
        timestamp: incident.timestamp,
      },
    }
  );

  const investigation = data?.investigation || data;

  return {
    id: investigation.id ?? null,

    incident_id:
      investigation.incident_id ?? incidentId,

    diagnosis:
      investigation.diagnosis ||
      "No diagnosis provided.",

    confidence:
      typeof investigation.confidence === "number"
        ? investigation.confidence
        : 0,

    evidence:
      Array.isArray(investigation.evidence)
        ? investigation.evidence
        : [],

    recommended_actions:
      Array.isArray(investigation.recommended_actions)
        ? investigation.recommended_actions
        : [],

    risk:
      investigation.risk || "Unknown",

    uncertainty:
      investigation.uncertainty || "Not specified",

    human_review_required:
      investigation.human_review_required !== false,

    created_at:
      investigation.created_at || null,

    _source: "backend",
  };
}

export async function createOperatorDecision(
  incidentId,
  decision,
  note = "",
  token = ""
) {
  if (!incidentId) {
    throw new Error("Incident ID is missing.");
  }

  return apiFetch(
    `/incidents/${incidentId}/decision`,
    {
      method: "POST",
      token,
      body: {
        decision,
        note: note || null,
      },
    }
  );
}

export async function getIncidentEvidence(
  incidentId,
  token = ""
) {
  if (!incidentId) {
    throw new Error("Incident ID is missing.");
  }

  return apiFetch(
    `/incidents/${incidentId}/evidence`,
    {
      method: "GET",
      token,
    }
  );
}

export async function verifyEvidence(
  evidencePackage,
  expectedSha256,
  token = ""
) {
  return apiFetch(
    `/evidence/verify`,
    {
      method: "POST",
      token,
      body: {
        evidence_package: evidencePackage,
        expected_sha256: expectedSha256,
      },
    }
  );
}