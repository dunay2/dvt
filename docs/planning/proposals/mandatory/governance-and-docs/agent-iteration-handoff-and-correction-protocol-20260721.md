---
title: Agent Iteration Handoff and Correction Protocol
status: Review
owner: Product Architecture / Delivery Governance
last_reviewed: 2026-07-21
planning_type: mandatory-proposal
canonical_operational_authority: Planning DB
companion_guide: docs/planning/proposals/mandatory/frontend-and-ux/dvt-product-priority-execution-guide-20260721.md
---

# Agent Iteration Handoff and Correction Protocol

## 1. Purpose

Every implementation iteration must end with an auditable handoff before the implementation agent starts unrelated work. The handoff explains:

- what was changed;
- how it was implemented;
- why that design was selected;
- what user or operational outcome it advances;
- what evidence proves the claims;
- what remains unresolved.

The review agent validates that handoff against repository sources, identifies deviation from the approved product route, and issues concrete corrective instructions with both implementation method and purpose.

This protocol does not replace Planning DB. Planning DB remains authoritative for task state, claims, approved design, components, command/query rails, evidence, risk, and completion. The protocol makes each iteration reviewable and prevents undocumented implementation drift.

## 2. Separation of duties

The implementation agent owns:

- product and infrastructure changes within the claimed task;
- tests and runtime proof;
- the end-of-iteration handoff;
- applying blocking corrections;
- updating Planning DB evidence through approved rails.

The review agent owns:

- source-backed validation of the handoff;
- Fowler/DDD/architecture review;
- identifying deviations and missing proof;
- defining corrections, including how and why;
- verifying corrections after implementation;
- publishing the cycle review report.

The review agent must not silently change runtime code while claiming independent verification. Corrections are applied by the implementation agent in a traceable commit and are then revalidated. This preserves review independence and makes the correction history auditable.

## 3. Mandatory iteration handoff

At the end of every implementation iteration, the implementation agent must publish a top-level PR comment headed exactly:

```markdown
## Iteration Handoff
```

A tracked closeout or evidence file may also be required by the approved Planning DB design, but the PR handoff is mandatory because it identifies the exact branch and final head being reviewed.

A PR description alone is insufficient unless it is updated after the final commit and contains every required field below.

### 3.1 Required identity

The handoff must include:

- task ID and architecture design ID;
- iteration identifier;
- exact base SHA;
- exact final head SHA;
- branch;
- PR;
- commit range;
- claimed component/domain owner;
- start and completion time or explicit unfinished status.

### 3.2 What changed

List the actual behavioral and structural delta:

- user-visible behavior;
- domain behavior;
- contracts and schemas;
- commands and queries;
- ports and adapters;
- persistence or migrations;
- Web/API/runtime changes;
- observability and security changes;
- tests and evidence;
- intentionally unchanged boundaries.

Do not describe files as outcomes. Explain the product or operational result first, then identify supporting files.

### 3.3 How it was implemented

Describe:

- domain objects and invariants used;
- command/query rails reused or changed;
- ports and adapters involved;
- transaction and concurrency model;
- authority and revision identity;
- error, conflict, retry, idempotency, and rollback behavior;
- HTTP/runtime validation;
- observability signals;
- security and data-handling posture;
- compatibility and migration strategy.

For every new rail, contract, port, state, or repository, identify the approved Planning DB design row that authorizes it. Missing authorization is a deviation.

### 3.4 Why this design

Explain:

- the user problem being closed;
- why the selected owner is correct;
- why existing repository semantics were reused;
- alternatives considered and rejected;
- how the design advances the stable priority guide;
- why the change is the smallest complete vertical slice;
- what was deliberately deferred.

Statements such as “cleaner”, “more scalable”, or “best practice” are insufficient without repository-specific forces and evidence.

### 3.5 Evidence executed

Separate executed evidence from intended evidence.

The handoff must list:

- red tests written before production changes;
- focused unit and architecture commands with results;
- contract, API, Web, typecheck, lint, migration, integrity, and governance commands run;
- strict live browser or integration proof;
- failure-injection or concurrency proof where relevant;
- CI workflows and exact head SHA;
- review threads resolved or still open;
- Planning DB evidence and gap updates.

Use repository paths, command output summaries, workflow links, or exact identifiers. “Tests pass” without commands and head identity is not evidence.

### 3.6 Risk and remaining work

State explicitly:

- unresolved correctness risks;
- known degraded paths;
- unproven assumptions;
- temporary compatibility behavior;
- rollback limitations;
- security or privacy concerns;
- observability gaps;
- deviations from the approved scope;
- next recommended iteration.

The handoff must not mark the task complete when any required acceptance criterion lacks evidence.

## 4. Required handoff template

```markdown
## Iteration Handoff

### Identity
- Task:
- Architecture design:
- Iteration:
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Commit range:
- Domain owner:

### Goal
- User/operational outcome:
- Acceptance criteria targeted:

### What changed
- Product behavior:
- Domain/contracts:
- Commands/queries:
- Ports/adapters:
- Persistence/migrations:
- UI/API/runtime:
- Observability/security:

### How
- Authority and revision model:
- Transaction/concurrency model:
- Error/conflict/retry/idempotency:
- Compatibility/migration:
- Rollback:

### Why
- Root cause:
- Selected design and repository fit:
- Alternatives rejected:
- Scope deliberately deferred:

### Evidence executed
- Red tests:
- Focused tests:
- Architecture/contracts:
- Live/integration proof:
- CI on exact head:
- Planning DB/evidence:
- Review threads:

### Risks and deviations
- Open risks:
- Unproven claims:
- Scope deviations:
- Follow-up tasks:

### Next iteration
- Recommended slice:
- Preconditions:
- Required proof:
```

## 5. Review cycle validation

At the start of each four-hour review cycle, the review agent must locate the latest implementation handoff and validate it against:

- commits and final diff;
- current main and branch ancestry;
- Planning DB task, claim, design, component, rail, port, evidence, risk, and gap records;
- actual contracts, code, migrations, and runtime boundaries;
- unit, architecture, integration, and live tests;
- CI workflows on the exact head;
- unresolved and resolved review threads;
- stable product priority guide;
- accepted ADRs and mandatory proposals.

The handoff is not trusted merely because it is detailed.

## 6. Claim-to-evidence matrix

Each cycle report must contain a table equivalent to:

| Claim | Claimed source | Repository evidence | Status | Correction |
| --- | --- | --- | --- | --- |
| Example claim | Handoff section | Exact file/test/workflow | VERIFIED / PARTIAL / CONTRADICTED / NOT PROVEN | Required action |

Status meaning:

- `VERIFIED`: source and executed evidence prove the claim on the exact head;
- `PARTIAL`: some behavior is proven, but scope or failure modes remain unproven;
- `CONTRADICTED`: repository evidence conflicts with the handoff;
- `NOT PROVEN`: no executed or source evidence supports the claim.

A material `CONTRADICTED` or `NOT PROVEN` acceptance claim blocks task completion.

## 7. Deviation classes

The review agent must check for at least:

- duplicate semantic authority;
- new command/query rails that duplicate existing language;
- wrong domain ownership;
- route or React component orchestration owning transactions;
- hidden latest-state reads presented as revision identity;
- sequential writes where atomic authority exists;
- broad shotgun surgery without a cohesive owner;
- Planning DB records updated after rather than before architecture-impacting work;
- migrations used as narrative instead of executable authority;
- runtime JSON trusted through TypeScript casts;
- tests that mock the critical production path;
- green CI on a different SHA;
- missing negative, failure, concurrency, or reopen proof;
- missing rollback or compensation;
- missing or unsafe observability;
- raw SQL, YAML, credentials, profiles, or transport errors logged;
- unbounded payload, path, process, or resource behavior;
- scope expansion into unrelated maintenance or framework work;
- work that does not advance the approved user transaction.

## 8. Corrective instruction contract

For every deviation, the review agent must state:

1. **What is wrong.** Concrete behavior or architecture defect.
2. **Evidence.** Exact source, diff, test, workflow, or Planning DB record.
3. **Why it matters.** User, integrity, security, operability, or maintainability impact.
4. **Owner.** Component or domain that must own the correction.
5. **How to correct it.** Repository-compatible steps using existing semantics.
6. **What not to introduce.** Duplicate rails, hidden authority, shortcuts, or accidental scope.
7. **Red proof.** Test that must fail before the correction.
8. **Green proof.** Focused, architecture, integration, and live evidence required.
9. **Acceptance criteria.** Observable completion conditions.
10. **Rollback.** Safe reversal or compensation posture.
11. **Observability and security.** Required signals and data-handling limits.
12. **Purpose restored.** How the correction returns the iteration to the approved product route.

Corrections are classified as:

- `BLOCKING`: must be applied before merge or before unrelated work;
- `REQUIRED NEXT`: may follow in the same claimed task but must remain sequenced;
- `FOLLOW-UP`: recorded in Planning DB and does not block the current complete vertical.

## 9. Missing handoff policy

When no valid handoff exists, the review cycle must report:

```text
DELIVERY-HANDOFF-MISSING
```

It must list the missing fields and treat the iteration as not auditable. The implementation agent must publish the missing handoff before beginning unrelated work.

Missing documentation does not automatically mean the implementation is defective. It means completion, scope, and next-step claims are not accepted until verified.

## 10. Correction loop

The operating loop is:

```text
implementation iteration
-> implementation handoff
-> source-backed review
-> claim/evidence classification
-> blocking corrections with how and why
-> implementation correction commit
-> updated handoff
-> verification on exact head
-> acceptance or next bounded iteration
```

A correction is not closed by a reply promising future work. It is closed by changed code or authoritative records plus executed evidence.

## 11. Cycle report requirements

Every review cycle report must include:

- exact reviewed main SHA;
- implementation handoff link or `DELIVERY-HANDOFF-MISSING`;
- what the agent changed, how, and why;
- claim-to-evidence matrix;
- deviations and severity;
- blocking corrections with method and purpose;
- fixed, active, superseded, and disproved findings;
- CI and review-thread status;
- impact on stable priorities;
- next implementation slice;
- the exact handoff expected at the end of that slice.

The cycle report is review evidence. It does not replace Planning DB as current operational authority.

## 12. Success criterion

This protocol succeeds when each iteration has:

- a clear intended outcome;
- an auditable implementation explanation;
- source-backed independent validation;
- deviations corrected before they compound;
- no undocumented authority or scope drift;
- a justified and bounded next iteration.

The goal is not more documentation. The goal is shorter feedback loops, earlier detection of wrong direction, and evidence that each iteration advances a coherent product transaction.
