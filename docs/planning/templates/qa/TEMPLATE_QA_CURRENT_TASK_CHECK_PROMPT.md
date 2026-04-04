---
title: QA current task check prompt template
status: Active
owner: Product / Architecture / QA / Docs
last_reviewed: 2026-04-04
planning_type: template
---

# QA Current Task Check Prompt Template

Use this template for a hard, evidence-first review of the task currently in
progress or just completed.

It preserves the same standards and restrictions as the global QA prompt, but
forces the reviewer to focus on the active task boundaries, declared scope, and
current worktree truth.

## When To Use It

Use this prompt for:

- task-in-progress verification
- pre-commit or pre-PR QA
- scope-drift detection on the current slice
- docs-first / TDD-first completion checks
- implementation-vs-task review before closeout

## Required Deliverables

Any review produced from this prompt MUST return a reusable Markdown artifact,
not only free-form review text.

The output MUST include:

- a Markdown review document focused on the current task
- explicit use of `docs/planning/templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md`
  as the baseline output shape unless a stricter governed format overrides it
- a checklist of corrective, blocking, or closeout tasks for the active slice
- at least one Mermaid diagram that explains the current-task gap, flow, or
  unblock plan
- explicit verification of whether the task-relevant documentation is correct and updated
- documentation update actions when the active-slice docs are stale, incomplete, or inconsistent
- at least one Mermaid diagram of the current state for the active slice when the task touches behavior, architecture, process, or scope
- explicit verification of whether evidence documents and risk-register updates exist when the active task requires them
- a Definition of Done for each proposed task
- a comment with solution rationale for each proposed task or blocker path
- explicit separation between active-slice findings and unrelated worktree
  observations

## Canonical Prompt

```text
Act as a Principal Engineer + QA Architect + Code Reviewer with a hard product-quality bar.

Your mission is to review the current task in progress or just completed, using the same standards and restrictions as the global QA review, but focused on the active task scope, current worktree, and declared task intent.

### Goal

Determine whether the current task is truly aligned across:
- task intent
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

1. Explore the repository and current worktree first. Do not assume.
2. Identify the governing docs, ADRs, contracts, proposals, reviews, closeouts, lane entries, and task-tracking surfaces that define the current task.
3. Verify that the current task scope matches what is actually changed in the worktree or branch.
4. Verify that everything promised for the current task actually exists in code, docs, and tests.
5. Run relevant validations when possible:
   - affected package tests
   - type-check
   - prettier/lint/eslint on changed files or equivalent baseline
   - verify:prepush when the task requires readiness evidence
6. Use `docs/planning/templates/qa/TEMPLATE_QA_ARTIFACT_EXAMPLE.md` as the
   explicit structure baseline for the Markdown artifact unless the destination
   has a stricter governed format.
7. Explicitly distinguish:
   - implemented in this task
   - documented but not implemented in this task
   - partially implemented in this task
   - implemented but not documented in this task
   - unrelated changes present in the worktree
   - not verified
8. If something cannot be verified, say so explicitly. Do not invent.

### Mandatory Review Axes

#### 1. Task Scope And Documentation Truth

Review whether the current task is:
- correctly scoped
- correctly documented
- traceable to the governing planning surfaces
- aligned with the real code and tests
- aligned with lane / proposal / review / closeout

Detect:
- scope drift
- promises without implementation
- implementation outside declared task scope
- documentation without code
- code without required documentation
- outdated task-relevant documentation that no longer matches current task truth
- missing evidence docs or risk-register updates where governance requires them
- validations promised but not executed
- mismatched naming, task IDs, or contract terms

#### 2. Implementation Vs Task Promise

Review whether the current task implements exactly what it claims to implement.
Look for:
- overpromising
- under-implementation
- hidden side effects outside task scope
- narrative claiming a bigger change than the actual code
- missing cases that task docs say are covered

#### 3. Architecture

Evaluate explicitly:
- SRP
- SOLID
- DDD
- Hexagonal Architecture
- CQRS when relevant
- bounded-context seams touched by the current task
- ports / adapters touched by the current task
- separation between application, domain, infrastructure, and read models
- ownership of invariants inside the active slice

State:
- what is correct
- what is wrong
- what is fake modularity
- which classes or services in the task carry too many responsibilities
- which seams should be extracted next
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
- whether the current task meaningfully improves confidence or just adds smoke coverage
- whether the task review uses a global view of the affected system rather than
  only local file behavior
- whether the active slice needs a harness or shared fixtures to validate real
  boundary behavior without duplication
- whether tests should be grouped by type (`unit`, `integration`, `contract`,
  `e2e`, regression) so intent, cost, and confidence are explicit

Identify:
- missing negative cases
- invariants without tests
- redundant tests
- fragile tests
- tests that validate incidental implementation instead of behavior
- coverage claims not backed by evidence
- missing harnesses or poor grouping by test type that hide task risk or make
  the suite harder to maintain

#### 6. Product Quality

Evaluate the current task as product, not only code.
Look for:
- behavior risks introduced by the task
- UX / API / operational errors
- weak messages or diagnostics
- insufficient observability
- missing rollout discipline
- missing evidence
- absence of runbook / manual / closeout when the task needs one
- hidden debt
- placeholders
- fake implementations

#### 7. Comparison With Mature Systems

Compare the current task approach with mature-system practices only when the comparison changes the recommendation.
Do not name-drop without consequence.

Evaluate whether this task would benefit from:
- templates
- test harnesses for repeated setup or cross-boundary verification
- grouping tests by type when that improves maintenance, confidence, or reviewability
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

## Task Alignment
- declared task vs actual changes
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
- local suite vs meaningful confidence for this task

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

This section is mandatory and MUST be usable as an execution artifact for the
current task.

It must contain:
- a `Markdown Artifact Path Suggestion` line with a proposed `.md` filename
- a `Task Checklist` subsection with GitHub-style checkboxes
- one task per corrective action, closeout action, or blocker resolution
- per task:
  - task ID or short label
  - objective
  - scope
  - whether it belongs to the current task or is explicitly out of scope
  - dependencies if any
  - documentation impact
  - evidence / risk-doc impact
  - comment with rationale
  - Definition of Done

Minimum structure:

### Markdown Artifact Path Suggestion
- `docs/planning/closeouts/<date>-<slug>.md` or another governed docs path justified by the active task

### Task Checklist
- [ ] `TASK-ID` Short task title

### Task Details
#### `TASK-ID` Short task title
- Objective:
- Scope:
- In current task scope:
- Dependencies:
- Documentation impact:
- Evidence / risk-doc impact:
- Comment with rationale:
- Definition of Done:

## Mermaid Diagram

This section is mandatory.

Include at least one Mermaid diagram that materially helps execution of the
current task.
Use the most useful diagram type for the active slice:
- `flowchart` for task flow or gap resolution
- `sequenceDiagram` for behavior mismatch or boundary propagation
- `graph TD` for dependency or unblock roadmap

The diagram must distinguish:
- current task truth
- target state for this task
- blockers or follow-up edges where relevant

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

## Task-Focused Defaults

When using this prompt inside this repository, default expectations should
include:

- inventory-first startup
- governing-source identification
- current worktree inspection before conclusions
- package-level validation for the changed scope
- `pnpm verify:prepush` before the task is called ready, unless the user
  explicitly limits validation
- a review output that can be promoted into a tracked Markdown task artifact
  without restructuring it later
- explicit use of `TEMPLATE_QA_ARTIFACT_EXAMPLE.md` as the baseline artifact
  shape unless a stricter governed format overrides it
- explicit confirmation that task-relevant documentation was checked and that
  required documentation updates are captured in the task artifact
- explicit confirmation that evidence docs and risk-register updates were checked
  whenever governance rules make them mandatory for the active slice
- explicit assessment of whether the slice needs a global-system harness or
  grouping by test type to achieve meaningful confidence
