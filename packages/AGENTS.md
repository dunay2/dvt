# Package Implementation Agent Instructions

Read `/DELIVERY_CONTROL.md` before changing `packages/**`.

Architecture, contracts, and documentation are designed before implementation and
maintained as the single current active design.

Before creating a package-level element:

- query the active Planning DB and repository for an existing owner and rail;
- identify the bounded context, authority, transaction boundary, invariants,
  failure behaviour, public contract, ports, adapters, and end-to-end proof;
- reuse existing components and contracts before creating new ones;
- update the existing canonical design and active Planning DB records in place
  when the design changes;
- do not create parallel contracts, ports, adapters, repositories, services, or
  synonyms for an existing product intent.

Keep the exposing test, implementation, corrections, and final proof on the same
active product branch. Intermediate design stages are not separate canonical
documents or Planning DB states; Git preserves their history.

After each material iteration, report what changed, how, why, exact proof,
remaining work, and deviations on the active PR or control channel.