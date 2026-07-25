# DVT Active Design and Delivery Control

Status: Active  
Owner: Product / Architecture  
Effective date: 2026-07-25

## Purpose

DVT is designed before it is implemented. Architecture and documentation are
mandatory parts of delivery: they define the current product outcome, ownership,
authorities, boundaries, contracts, transaction limits, invariants, failure
behaviour, and allowed dependencies.

The problem to avoid is not documentation. The problem is treating every draft,
review, correction, and closeout as a new canonical state. DVT keeps one active
design. When the design changes, the canonical documentation and Planning DB are
updated in place so that they describe the current design only. Git preserves the
history.

This document governs implementation agents and control agents.

## Product priority

The active product objective is to close the dbt vertical end to end.

This does not define DVT as dbt Cloud and does not limit DVT to dbt. dbt is the
first complete vertical used to prove that the platform can model, project, plan,
execute, persist, and present a real workflow capability. Platform abstractions
must remain reusable by later component types.

## 1. Design before implementation

Before production code is changed, the implementation agent must establish and
record in the active design:

- the user-visible result;
- the source of authority;
- the owning bounded context and component;
- the governing command or query rail;
- the transaction boundary;
- the invariants and failure behaviour;
- the existing ports, adapters, services, and components to reuse;
- the forbidden duplicate or parallel surfaces;
- the end-to-end proof that will close the result.

The design must target the final invariant. It must not deliberately implement an
intermediate architecture that is already known to require redesign to satisfy the
same result.

## 2. One active design

Canonical documentation describes the design that is currently intended to be
implemented or is currently implemented.

When analysis or implementation exposes an error:

1. correct the same canonical design document;
2. update the same active Planning DB records;
3. correct the implementation on the same active branch;
4. rerun the relevant proof.

Do not create a new canonical proposal, review, correction document, closeout, or
database record merely to preserve the superseded state. The branch and Git
history already preserve how the design evolved.

Documentation must remain complete and accurate. Consolidation into the active
state is required; deletion of necessary design information is not.

## 3. Planning DB rule

The Planning DB is the queryable active architecture used before implementation
to determine what already exists and to prevent duplicate components, commands,
queries, ports, adapters, repositories, services, authorities, and responsibilities.

It contains active architectural truth only. It is not a journal of drafts,
reviews, approvals, revisions, closeouts, or historical implementation stages.

Active architecture must be updated through the normal Planning DB command/query
write surface.

A Planning DB migration is permitted only when the physical Planning DB schema or
an indispensable bootstrap seed changes. A feature, design decision, component
status change, test result, evidence result, review, or closeout must not create a
migration.

## 4. Reuse before creation

Before naming a new product element, the agent must query the active Planning DB
and search the repository for an existing owner and rail.

A new component, command, query, port, adapter, repository, or service is allowed
only when no active element already owns the intent. Synonyms, parallel routes,
and duplicate local semantics are prohibited.

## 5. One implementation path per result

Unless the product owner explicitly authorizes independent parallel work:

- one product result has one active implementation branch and PR;
- the tests that expose the defect and the implementation that makes them green
  remain on that path;
- review corrections are applied to that same path;
- the next dependent result does not start until the current result is integrated
  or explicitly stopped.

A red-only PR, review-only PR, or documentation-only branch must not substitute
for the implementation that closes the active product result.

## 6. Product increment rule

Every product PR must answer:

> What can the user or system now do correctly that it could not do correctly
> before?

Design and documentation are required inputs and maintained outputs of that
increment. Catalog updates, gap declarations, evidence declarations, reviews, and
closeouts are not independent product increments.

## 7. Evidence rule

Executable systems provide implementation evidence:

- tests;
- CI workflow runs;
- Git commits;
- runtime telemetry;
- generated or persisted runtime artifacts.

The Planning DB and documentation may reference real evidence. They must not
manufacture it. An agent must not manually insert a `pass` result or a synthetic
hash to make an implementation appear proven.

## 8. Implementation-agent handoff

At the end of every material implementation iteration, the implementation agent
must report on the active PR or control channel:

- **What changed:** behaviour and exact affected surfaces;
- **How:** components, rails, ports, adapters, and transaction boundary used;
- **Why:** design rationale and invariant satisfied;
- **Proof:** exact tests, CI, or runtime evidence;
- **Remaining:** the next bounded step or `NONE`;
- **Deviation:** any difference from the active design or `NONE`.

The report is a handoff, not a new design document or branch.

## 9. Control-agent cycle

A control agent inspects:

- current `main`;
- the active product branch and PR;
- the active design documentation;
- the active Planning DB state;
- the latest implementation-agent handoff;
- CI and unresolved review findings.

The control agent compares implemented behaviour with the active design and checks
for duplication, boundary drift, wrong authority, incomplete transaction limits,
missing negative proof, and lack of product progress.

When there is no material implementation delta, the complete control result is:

`NO MATERIAL DELTA`

In that case the control agent must not create a branch, commit, PR, migration,
review document, closeout, or repeated architecture report.

When a deviation exists, the control agent must issue a bounded correction on the
active PR or control channel containing:

- the violated result or invariant;
- the exact component, file, symbol, contract, or rail involved;
- why the implementation is wrong;
- the required correction;
- the negative and end-to-end proof required.

The implementation agent applies that correction on the same active branch.

## 10. Current dbt execution priority

The immediate result is to close graph-derived dbt project publication as one
server-owned atomic operation:

- graph-draft Canvas is the explicit authority for graph-derived artifacts;
- all artifacts are published or none are published;
- existing batch mutation capabilities are reused;
- the browser does not own a per-file publication transaction or compensation;
- the publication receipt is bound to the exact project content set and analysis
  identity used by Preview and Run;
- external or divergent content is never silently overwritten;
- the complete Canvas -> Preview -> Publish -> Run -> State path is executable and
  proven.

The current open work must be consolidated onto one implementation path. Repeated
review branches and red-only branches do not advance this result.

## Decision test

Before creating any artifact, ask:

1. Does this improve the active design or implement the active product result?
2. Can the existing canonical document or active Planning DB record be updated
   instead?
3. Does Git or CI already preserve the history or evidence?
4. Am I creating a second authority or merely recording an intermediate stage?

If the artifact only preserves an intermediate stage, do not create it.