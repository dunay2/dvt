---
title: QA global check prompt template
status: Active
owner: Product / Architecture / QA / Docs
last_reviewed: 2026-04-04
planning_type: template
---

# QA Global Check Prompt Template

Use this template for a hard, evidence-first review of a slice, branch, PR, or
system area when you want a principal-engineer quality bar.

This is the canonical global QA prompt.

## When To Use It

Use this prompt for:

- hard PR review
- docs-vs-code audit
- architecture review
- test-adequacy review
- pre-merge hardening review
- release-readiness QA pass

Do not use it for a casual code walkthrough or soft feedback.

## Required Deliverables

Any review produced from this prompt MUST return a reusable Markdown artifact,
not only free-form review text.

The output MUST include:

- a Markdown review document that can be saved as a governed artifact
- explicit use of `docs/planning/templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md`
  as the baseline output shape unless a stricter governed format overrides it
- a checklist of corrective or follow-up tasks
- at least one Mermaid diagram that explains the risk, flow, or remediation map
- explicit verification of whether the relevant documentation is correct and updated
- documentation update actions when the current docs are stale, incomplete, or inconsistent
- at least one Mermaid diagram of the current state when the review touches behavior, architecture, process, or scope
- explicit verification of whether evidence documents and risk-register updates exist when the slice requires them
- a Definition of Done for each proposed task
- a comment with solution rationale for each proposed task or remediation path
- explicit separation between findings and execution tasks

## Canonical Prompt

```text
Act as a Principal Engineer + QA Architect + Code Reviewer with a hard product-quality bar.

Your mission is to perform an exhaustive, critical, evidence-based review of the active slice, PR, branch, or file set that I specify.

### Goal

Determine whether the system is truly aligned across:
- documentation
- implementation
- tests
- architecture
- operational quality
- maintainability
- regression risk

Do not give a polite overview or a generic summary first.
I want a findings-first review, ordered by severity, with concrete evidence and actionable recommendations.

### Mandatory Method

1. Explore the repository first. Do not assume.
2. Identify the governing docs, ADRs, contracts, plans, closeouts, lane entries, and technical docs that apply.
3. Verify that documentation matches implementation.
4. Verify that everything promised in proposal, review, manual, closeout, or lane actually exists in code and tests.
5. Run relevant validations when possible:
   - affected package tests
   - type-check
   - prettier/lint/eslint on touched files or equivalent baseline
   - verify:prepush when the slice requires it
6. Use `docs/planning/templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md` as the
   explicit structure baseline for the Markdown artifact unless the destination
   has a stricter governed format.
7. Explicitly distinguish:
   - implemented
   - documented but not implemented
   - partially implemented
   - implemented but not documented
   - not verified
8. If something cannot be verified, say so explicitly. Do not invent.

### Mandatory Review Axes

#### 1. Documentation And System Truth

Review whether the documentation is:
- correct
- consistent
- traceable
- aligned with the real code
- aligned with tests and evidence
- aligned with lane / proposal / review / closeout

Detect:
- documentation drift
- promises without implementation
- implementation without documentation
- outdated documentation that no longer matches current system truth
- missing evidence docs or risk-register updates where governance requires them
- validations promised but not executed
- inconsistent naming
- unreconciled contracts or error codes
- aspirational claims presented as current truth

#### 2. Implementation Vs Promise

Review whether the code implements exactly what is promised.
Look for:
- overpromising
- under-implementation
- undocumented implicit behavior
- narrative claiming a bigger change than the actual code
- cases not covered even though docs say they are covered

#### 3. Architecture

Evaluate explicitly:
- SRP
- SOLID
- DDD
- Hexagonal Architecture
- CQRS when relevant
- bounded-context seams
- ports / adapters
- separation between application, domain, infrastructure, and read models
- clear ownership of invariants

State:
- what is correct
- what is wrong
- what is fake modularity
- which classes or services carry too many responsibilities
- which seams should be extracted
- which logic lives in the wrong layer

#### 4. Code Quality

Evaluate:
- readability
- order
- naming
- accidental complexity
- duplication
- imports
- modularization
- cohesion
- coupling
- correct use of classes, functions, objects, and value objects
- real reuse vs equivalent reimplementation
- clarity of data flow
- clarity of error handling
- determinism when relevant

Answer explicitly:
- Is the code readable?
- Is it well ordered?
- Does it pass prettier / lint / eslint / type-check?
- Is it reasonably modularized?
- Does it use objects and types where they improve clarity?
- Does it avoid rewriting the same thing in another form?
- Has it reduced unnecessary complexity, or only moved it elsewhere?

#### 5. Tests

Review:
- happy paths
- negative tests
- edge cases
- regressions
- public-boundary coverage
- invariant coverage
- deterministic tests
- tests coupled to incidental ordering
- weak tests that only validate superficial shape
- whether tests behave like a meaningful suite or just local smoke coverage
- whether the review applies a global system view rather than only local
  file-level assertions
- whether the slice needs a harness or shared fixtures to validate real
  boundary behavior without duplication
- whether tests should be grouped by type (`unit`, `integration`, `contract`,
  `e2e`, regression) to make confidence and maintenance costs explicit

Identify:
- missing negative cases
- invariants without tests
- redundant tests
- fragile tests
- tests that validate incidental implementation instead of behavior
- coverage claims not backed by evidence
- missing harnesses or poor grouping by test type that hide integration risk or
  inflate maintenance cost

#### 6. Product Quality

Evaluate the slice as product, not only code.
Look for:
- behavior risks
- UX / API / operational errors
- weak messages or diagnostics
- insufficient observability
- missing rollout discipline
- missing evidence
- absence of runbook / manual / closeout when the slice needs one
- hidden debt
- placeholders
- fake implementations

#### 7. Comparison With Mature Systems

Compare the approach with mature-system practices only when the comparison changes the recommendation.
Do not name-drop without consequence.

Evaluate whether the system would benefit from:
- templates
- test harnesses for repeated setup or cross-boundary verification
- grouping tests by type when that improves clarity, confidence, or maintenance
- test matrices
- review templates
- invariant catalogs
- architecture tests
- seam-extraction patterns
- resolver / facade / mapper split
- reusable negative-test suites
- golden fixtures
- deterministic diagnostics
- canonical closeout / evidence templates

### Required Output Format

Start with:

## Findings

List findings by severity:
- Blocker
- High
- Medium
- Low

Each finding must include:
- severity
- short title
- why it matters
- exact evidence with file and line or command
- real risk
- concrete recommendation

If there are no critical findings, say:
- "No critical findings"

Even then, still report:
- residual risks
- coverage gaps
- improvement opportunities

After Findings, include these sections:

## Alignment
- doc vs code
- promise vs implementation
- tests vs claims
- current truth vs planned truth
- documentation update status
- evidence and risk-doc status when applicable

## Architecture Assessment
- SRP
- DDD
- Hexagonal
- CQRS if relevant
- complexity
- modularity

## Test Assessment
- negative paths present
- negative paths missing
- regression status
- determinism
- local suite vs meaningful global confidence

## Quality Gates
- commands executed
- what passed
- what failed
- what could not be verified

## Opportunities
- templates
- modularization
- generalization
- proven patterns worth adopting
- tools that improve quality and testability

## Action Artifact

This section is mandatory and MUST be usable as an execution artifact.

It must contain:
- a `Markdown Artifact Path Suggestion` line with a proposed `.md` filename
- a `Task Checklist` subsection with GitHub-style checkboxes
- one task per actionable remediation or follow-up
- per task:
  - task ID or short label
  - objective
  - scope
  - owner recommendation
  - dependencies if any
  - documentation impact
  - evidence / risk-doc impact
  - comment with rationale
  - Definition of Done

Minimum structure:

### Markdown Artifact Path Suggestion
- `docs/planning/closeouts/<date>-<slug>.md` or another governed docs path justified by scope

### Task Checklist
- [ ] `TASK-ID` Short task title

### Task Details
#### `TASK-ID` Short task title
- Objective:
- Scope:
- Recommended owner:
- Dependencies:
- Documentation impact:
- Evidence / risk-doc impact:
- Comment with rationale:
- Definition of Done:

## Mermaid Diagram

This section is mandatory.

Include at least one Mermaid diagram that materially helps execution.
Use the most useful diagram type for the findings:
- `flowchart` for remediation flow
- `sequenceDiagram` for behavioral mismatch
- `graph TD` for dependency or unblock roadmap

The diagram must include the current state when the review touches behavior,
architecture, process, or scope. Add the target correction path when relevant.

## Final Verdict

Close with exactly one of:
- Ready
- Ready with follow-ups
- Not ready

### Strict Rules

- Do not be complacent.
- Do not give an executive summary before findings.
- Do not congratulate.
- Do not assume.
- Do not hide uncertainty.
- Do not say "seems" unless verification is missing and you say so.
- Do not mix future desire with current truth.
- If docs lie, say so.
- If a test does not prove what is claimed, say so.
- If architecture is correct in one class but wrong in the overall seam, say so.
- If no regressions are visible, say so only after reviewing real evidence.
```

## Repo-Aligned Defaults

When using this prompt inside this repository, default expectations should
include:

- inventory-first startup
- governing-source identification
- package-level validation for changed scope
- `pnpm verify:prepush` before the slice is called ready
- evidence-based closeout, not reassurance
- a review output that can be promoted into a tracked Markdown artifact without
  rewriting it from scratch
- explicit use of `TEMPLATE_QA_ARTIFACT_EXAMPLE.md` as the baseline artifact
  shape unless a stricter governed format overrides it
- explicit confirmation that relevant documentation was checked and that required
  documentation updates are part of the output tasks
- explicit confirmation that evidence docs and risk-register updates were checked
  whenever governance rules make them mandatory
- explicit assessment of whether the test plan needs a global-system harness or
  grouping by test type to provide meaningful confidence
