# Mission Evidence Contract

## Purpose

The Mission Evidence Contract defines the Midnight privacy boundary
for MissionVault Sentinel.

## Application-owned data

MissionVault Sentinel continues to manage:

- Telemetry
- Incidents
- Investigations
- Operator decisions
- Evidence packages

## Midnight-owned verification boundary

Midnight is responsible for representing a verifiable commitment/state
without exposing the complete sensitive evidence package.

## Design principle

The system must distinguish:

- Local SHA-256 integrity fingerprint
- Midnight commitment
- Midnight transaction
- Midnight verification result

A local SHA-256 calculation must never be presented as a Midnight proof.
