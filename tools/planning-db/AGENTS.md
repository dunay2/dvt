# Planning DB Agent Instructions

Read `/DELIVERY_CONTROL.md` before changing `tools/planning-db/**`.

The Planning DB is the queryable current architecture and operational planning
state. It contains the active truth required to design before implementation and
to prevent duplicate components, responsibilities, commands, queries, ports,
adapters, repositories, services, and authorities.

## Mandatory rules

- Query the current Planning DB before naming or creating a product element.
- Update active architectural and planning records through the normal command and
  query write surfaces.
- Keep only the current active state. Do not model draft, review, approval,
  revision, correction, closeout, or historical stages in the Planning DB.
- Git is the history of prior definitions.
- Create a migration only when the physical Planning DB schema or an indispensable
  bootstrap seed changes.
- Never create a migration for a feature design, component registration, status
  update, test registration, evidence result, implementation completion, review,
  handoff, or closeout.
- Never insert a manual `pass` result or synthetic evidence hash. Reference real
  CI, tests, commits, telemetry, or runtime artifacts instead.

When an active design changes before or during implementation, update the same
active records in place and continue on the same implementation path.