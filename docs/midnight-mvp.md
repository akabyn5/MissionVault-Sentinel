# MissionVault Sentinel — Midnight MVP

## Problem

Satellite telemetry and incident investigations may contain operationally
sensitive mission information.

## Existing workflow

Telemetry
→ Incident
→ AI Investigation
→ Operator Decision
→ SHA-256 Evidence

## Hackathon workflow

Telemetry
→ Incident
→ AI Investigation
→ Human Decision
→ Evidence Package
→ Midnight
→ Verification

## Private information

The private side may include:

- Sensitive telemetry
- Investigation information
- Operator-related information
- Full evidence package

## Verifiable information

The public/verifiable side should expose only what is required to verify
the result, such as:

- Evidence identifier
- Commitment
- Verification result
- Non-sensitive metadata

## Success criteria

The user can:

1. Detect or create an incident.
2. Run the AI investigation.
3. Record a human decision.
4. Generate the evidence package.
5. Create a Midnight-backed privacy/verification result.
6. Verify the result.
7. Demonstrate that changing the evidence changes the integrity result.

## Safety boundary

The application does not issue autonomous spacecraft commands.

Human operator review remains mandatory.