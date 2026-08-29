const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function apiFetch(
    path,
    {
        method = "GET",
        token = "",
        body = null
    } = {}
) {
    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(
        `${API_BASE_URL}${path}`,
        options
    );

    const text = await response.text();

    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        const detail =
            data?.detail ||
            data?.message ||
            `HTTP ${response.status}`;

        throw new Error(detail);
    }

    return data;
}

function normalizeIncidentId(incidentOrId) {
    const value =
        typeof incidentOrId === "object"
            ? incidentOrId?.id ?? incidentOrId?.incident_id
            : incidentOrId;

    if (typeof value === "number" && Number.isInteger(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (/^\d+$/.test(trimmed)) {
            return Number(trimmed);
        }

        const match = trimmed.match(/^INC-(\d+)$/i);

        if (match) {
            return Number(match[1]);
        }
    }

    return null;
}

export async function listIncidents(token = "") {
    return await apiFetch(
        "/incidents",
        {
            token
        }
    );
}

export async function getIncident(
    incidentId,
    token = ""
) {
    const numericId =
        normalizeIncidentId(incidentId);

    if (!numericId) {
        throw new Error(
            "A valid numeric incident ID is required."
        );
    }

    return await apiFetch(
        `/incidents/${numericId}`,
        {
            token
        }
    );
}

export async function getIncidentReconstruction(
    incidentId,
    token = "",
    before = 10,
    after = 5
) {
    const numericId =
        normalizeIncidentId(incidentId);

    if (!numericId) {
        throw new Error(
            "A valid numeric incident ID is required."
        );
    }

    return await apiFetch(
        `/incidents/${numericId}/reconstruction?before=${before}&after=${after}`,
        {
            token
        }
    );
}

export async function investigateIncident(
    incident,
    token = ""
) {
    const incidentId =
        normalizeIncidentId(incident);

    if (!incidentId) {
        throw new Error(
            "The selected incident does not contain a valid backend ID."
        );
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
                timestamp:
                    incident.timestamp ||
                    incident.created_at,
                force_refresh: false
            }
        }
    );

    const investigation =
        data?.investigation ?? data;

    if (!investigation) {
        throw new Error(
            "Backend returned an empty investigation."
        );
    }

    return {
        id: investigation.id ?? null,
        incident_id:
            investigation.incident_id ??
            incidentId,
        diagnosis:
            investigation.diagnosis || "",
        confidence:
            typeof investigation.confidence === "number"
                ? investigation.confidence
                : 0,
        evidence:
            Array.isArray(investigation.evidence)
                ? investigation.evidence
                : [],
        recommended_actions:
            Array.isArray(
                investigation.recommended_actions
            )
                ? investigation.recommended_actions
                : [],
        risk:
            investigation.risk || "",
        uncertainty:
            investigation.uncertainty || "",
        human_review_required: true,
        created_at:
            investigation.created_at || null,
        _source: "backend"
    };
}

export async function createOperatorDecision(
    incidentId,
    decision,
    note = "",
    token = ""
) {
    const numericId =
        normalizeIncidentId(incidentId);

    if (!numericId) {
        throw new Error(
            "A valid numeric incident ID is required."
        );
    }

    if (!decision) {
        throw new Error(
            "Operator decision is required."
        );
    }

    return await apiFetch(
        `/incidents/${numericId}/decision`,
        {
            method: "POST",
            token,
            body: {
                decision,
                note: note || null
            }
        }
    );
}

export async function getIncidentEvidence(
    incidentId,
    token = ""
) {
    const numericId =
        normalizeIncidentId(incidentId);

    if (!numericId) {
        throw new Error(
            "A valid numeric incident ID is required."
        );
    }

    return await apiFetch(
        `/incidents/${numericId}/evidence`,
        {
            token
        }
    );
}

export async function verifyEvidence(
    evidencePackage,
    expectedSha256,
    token = ""
) {
    if (!evidencePackage) {
        throw new Error(
            "Evidence package is required."
        );
    }

    if (!expectedSha256) {
        throw new Error(
            "Expected SHA-256 hash is required."
        );
    }

    return await apiFetch(
        "/evidence/verify",
        {
            method: "POST",
            token,
            body: {
                evidence_package:
                    evidencePackage,
                expected_sha256:
                    expectedSha256
            }
        }
    );
}