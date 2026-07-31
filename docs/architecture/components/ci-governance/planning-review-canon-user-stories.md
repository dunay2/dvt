---
title: Planning Review Canon User Stories
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-07-31
component_type: governance
---

# Planning Review Canon User Stories

## Story 1 - Review Steward Links Executable Work To GitHub

As a review steward, I want findings that require execution linked to GitHub
Issues so that task identity and lifecycle have one authority.

Acceptance:

- A finding with no execution need remains reference context.
- A finding with execution need links to an existing issue or creates one
  directly in GitHub.
- The review document records the issue link but does not own lifecycle state.

## Story 2 - Sprint Operator Avoids A Parallel Backlog

As a sprint operator, I want local planning documents to remain context rather
than a second backlog so that issue status cannot drift.

Acceptance:

- GitHub Issues is the canonical MVP execution queue.
- Local documents may describe rationale, architecture, and evidence.
- Assignment, status, blockers, dependencies, and closure remain GitHub-owned.

## Story 3 - Reviewer Checks Naming And Linkage Drift

As a reviewer, I want review filenames and executable findings checked against
canonical policy so that review material remains discoverable and actionable.

Acceptance:

- Review filenames follow `YYYYMMDD-<topic>-review.md`.
- Review rows distinguish reference material from executable follow-up.
- Executable follow-up names a GitHub Issue.

## Story 4 - Agent Selects The Next MVP Issue From GitHub

As an agent, I want continuation to inspect the active GitHub MVP epic and its
open issues so that the next task comes from current product state.

Acceptance:

- The GitHub MVP issue workflow is the governing task procedure.
- The component guide names only the implemented traceability query rail.
- The semantic test rejects Planning DB task commands and local lane authority.
