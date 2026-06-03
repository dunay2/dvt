---
title: Planning Review Canon User Stories
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-05-24
component_type: governance
---

# Planning Review Canon User Stories

## Story 1 - Review steward promotes a finding to Planning DB

As a review steward, I want review findings that require execution promoted to
Planning DB tasks so that claims, dependencies, progress, and evidence have one
owner.

Acceptance:

- A finding with no execution need remains reference context.
- A finding with execution need links to an existing task or creates one via
  `pnpm planning:db:operate`.
- The review board records linkage but does not own lifecycle state.

## Story 2 - Sprint operator avoids a parallel board backlog

As a sprint operator, I want sprint board files to group work without becoming a
second backlog so that sprint prose and task state cannot drift.

Acceptance:

- Sprint board rules state that Planning DB is the canonical execution queue.
- Board files may include needs and user stories.
- Claims, status, progress, blockers, and evidence remain DB-owned.

## Story 3 - Reviewer checks naming and linkage drift

As a reviewer, I want review filenames and workboard linkage checked against
canonical policy so that review material remains discoverable after refactors.

Acceptance:

- Review filenames follow `YYYYMMDD-<topic>-review.md`.
- Review rows distinguish reference, accepted, active, review, queued, and done
  posture.
- Active follow-up rows name Planning DB task IDs.

## Story 4 - Agent selects the next task from DB state

As an agent, I want continuation to use `planning:db:query open` and
`planning:db:query next` so that the next task is selected from current DB
state, not stale sprint text.

Acceptance:

- The canon plan names `GD-REV-PLANNING-CANON`.
- The component guide names the planning review rails.
- The semantic test fails when board files imply execution outside Planning DB.
