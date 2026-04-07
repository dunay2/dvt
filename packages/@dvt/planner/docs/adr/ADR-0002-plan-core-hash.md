# ADR-0002: planCore Hash Boundary

Decision:

- Define `planCore` as the only object hashed to generate planId.
- Return `canonicalPlanCoreJson = JCS(planCore)`.

Rationale:

- Guarantees caller-verifiable plan identity.
- Allows post-hash provenance fields without changing planId.
