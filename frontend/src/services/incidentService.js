import { getMockInvestigation } from "../data/incidentMocks";

const API_BASE_URL = "http://127.0.0.1:8000";

async function apiFetch(path, { method = "GET", token = "", body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`);
  }
  return response.json();
}

export async function investigateIncident(incident, token = "") {
  const incidentId = incident?.incident_id || incident?.id || "unknown";
  try {
    const data = await apiFetch(`/incidents/${incidentId}/investigate`, {
      method: "POST",
      token,
      body: {
        satellite_id: incident.satellite_id,
        primary_anomaly: incident.primary_anomaly,
        severity: incident.severity,
        timestamp: incident.timestamp
      }
    });
    return {
      diagnosis: data.diagnosis ?? data.likely_cause ?? "No diagnosis provided",
      confidence: typeof data.confidence === "number" ? data.confidence : 0,
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
      recommended_actions: Array.isArray(data.recommended_actions)
        ? data.recommended_actions
        : Array.isArray(data.recommended_review) ? data.recommended_review : [],
      risk: data.risk || "",
      human_review_required: data.human_review_required !== false,
      _isMock: false,
      _source: "backend"
    };
  } catch (err) {
    console.warn(`[incidentService] Real endpoint unavailable (${err.message}). Using mock.`);
    return getMockInvestigation(incident.primary_anomaly);
  }
}

export async function createOperatorDecision(
  incidentId,
  decision,
  note = "",
  token = ""
) {
  if (!incidentId) {
    throw new Error(
      "Incident ID is missing."
    );
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