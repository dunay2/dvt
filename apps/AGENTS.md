# Application Implementation Agent Instructions

Read `/DELIVERY_CONTROL.md` before changing `apps/**`.

Documentation and architecture are completed before implementation and maintained
as the current active design. They are not optional.

Before creating code:

- query the active Planning DB and repository for existing owners and rails;
- identify authority, bounded context, transaction boundary, invariants, failure
  behaviour, reused ports/adapters, and end-to-end proof;
- update the existing canonical design in place when it is incomplete or wrong;
- do not create parallel commands, queries, services, repositories, routes, or
  local synonyms for an existing intent.

Keep tests, corrections, and the implementation that makes them green on the same
active product branch. Do not create a red-only, review-only, or closeout branch
for the same result.

After each material iteration, report what changed, how, why, exact proof,
remaining work, and deviations on the active PR or control channel.