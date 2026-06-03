---
title: Fowler Analysis - Documentation Usability Canon
status: Accepted
owner: Codex / Architecture / Docs
last_reviewed: 2026-05-24
---

# Fowler Analysis - Documentation Usability Canon

## Fowler Analysis

The root issue is information-architecture drift. The repository has many
valid documents, but reader intent is not always represented as a domain
concept. That creates duplicate active entry points, hidden package docs, and
syntax-passing changes that still make consultation harder.

## Mature-System Comparison

Mature documentation systems separate navigation, canonical source, status,
decisions, evidence, and local reference material. They treat consultation
paths as owned read models and validate usefulness as a product quality, not as
an incidental property of markdown files.

## Improved Patterns

- `ClassifyDocumentationEntryPoint` names entry-point semantics before moves or
  aliases.
- `QueryDocumentationConsultationPath` treats reader orientation as a read
  model.
- `ValidateDocumentationUsefulness` guards against regressions that markdown
  syntax checks cannot see.

## Antipatterns

- Folder shape substituting for information architecture.
- Roadmap, status, and historical analysis competing under similar names.
- Package/app docs staying important but unpublished.
- CI checking hygiene while missing discoverability and consultation drift.

## Drift

The original 2026-03-08 proposal described the target operating model but did
not provide a component API, rails, or semantic guard. This slice aligns the
proposal, domain note, component guide, stories, analysis, and test around the
same consultation semantics.

## Repetitions

The same reader need appeared as navigation redesign, home rewrite, package doc
surfacing, concept layer, roadmap consolidation, and traceability metadata.
Those are grouped under documentation consultation semantics so future tasks
can split by reader path instead of re-opening a broad IA plan.

## Opportunities

- Add a machine-readable documentation entry-point registry.
- Add a usefulness checker for governed docs metadata.
- Convert package/app doc classification into linked-local evidence.
- Add contributor-oriented smoke tests for "find roadmap/status/glossary".

## Applied Pattern

Applied Fowler-style semantic encapsulation: documentation usability is now
owned by a component with explicit queries and policy instead of scattered
navigation prose. No documentation tree move is performed in this slice.
