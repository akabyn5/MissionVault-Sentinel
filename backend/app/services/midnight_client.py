from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class MidnightResult:
    status: str
    network: str
    commitment: str | None = None
    transaction_hash: str | None = None
    contract_address: str | None = None
    error: str | None = None


class MidnightClient:
    """
    Boundary between MissionVault Sentinel and Midnight.

    The client owns Midnight-specific operations.
    MissionVault domain services should not know the details
    of wallet SDK, Compact, or transaction handling.
    """

    def __init__(
        self,
        *,
        network: str,
        proof_server_url: str,
        contract_address: str | None = None,
    ) -> None:
        self.network = network
        self.proof_server_url = proof_server_url
        self.contract_address = contract_address

    def commit_evidence(
        self,
        *,
        commitment: str,
        evidence_id: str,
    ) -> MidnightResult:
        """
        Submit an evidence commitment through the Midnight client.

        This method intentionally does not fabricate transaction
        identifiers. The real client implementation must provide
        the transaction/proof result.
        """

        return MidnightResult(
            status="not_implemented",
            network=self.network,
            commitment=commitment,
            contract_address=self.contract_address,
            error="Midnight client implementation pending.",
        )