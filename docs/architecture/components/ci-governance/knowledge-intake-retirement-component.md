---
title: Knowledge Intake Retirement Component
status: Active
owner: Architecture / Planning DB
last_reviewed: 2026-06-04
planning_type: architecture
---

# Knowledge Intake Retirement Component

## Owned Concern

This component owns the DB-first read model used to retire analysis intake files
without keeping `buzon/` as a second authority system.

The component does not delete intake files. It classifies each tracked intake
document into a retirement posture that planning and docs agents can query
before moving or removing files.

## Command And Query Rails

| Rail                                | Type    | DDD owner                             | Read model or projection                                                              | Negative guard                                                            |
| ----------------------------------- | ------- | ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ListKnowledgeIntakeRetirement`     | query   | `KnowledgeIntakeRetirementReadModel`  | `knowledge_intake_retirement_query` and `knowledge_intake_repository_reference_query` | Query must read DB rows and must not parse `buzon/*.md` directly.         |
| `ListDocumentationLifecycleFacts`   | query   | `DocumentationLifecycleReadModel`     | `documentation_lifecycle_query`                                                       | Query must expose lifecycle facts and must not infer state from prose.    |
| `GenerateKnowledgeIntakeLiterature` | command | `KnowledgeIntakeLiteratureProjection` | generated local knowledge-intake literature view                                      | Generator must read the DB retirement query and must not walk `buzon`.    |
| `CheckBuzonIntakeRetirement`        | command | `KnowledgeIntakeRetirementGuard`      | changed-file diff against the repository base                                         | Changed-slice validation must reject added or renamed `buzon/*.md` files. |

## Retirement States

| State          | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `canonized`    | The intake document names a canonical disposition in frontmatter.                |
| `open-actions` | The intake document still has open extracted knowledge action rows.              |
| `referenced`   | Governed docs still reference the intake document but no open action is present. |
| `unclassified` | No disposition, action, or inbound governed reference is visible in DB.          |

## Query Surface

```bash
pnpm planning:db:query knowledge-intake --state unclassified --limit 30
pnpm planning:db:query knowledge-intake --state open-actions --limit 30
pnpm planning:db:query knowledge-intake --path buzon/example.md --limit 5
pnpm planning:db:query knowledge-intake --references --limit 30
pnpm planning:db:query knowledge-intake --references --path buzon/example.md --limit 5
pnpm planning:db:query documentation-lifecycle --gaps true --limit 30
pnpm planning:db:query documentation-lifecycle --duplicates true --limit 30
pnpm planning:db:query documentation-lifecycle --canonicality proposal --state proposed --limit 30
```

The `--references` variant lists DB-backed inbound references from
`knowledge_intake_repository_reference_query`, including non-knowledge source
files such as architecture tests that still name raw `buzon/*.md` paths. It
also projects the current component ownership for the referencing file. This is
the operator surface for retiring live `buzon/` backrefs without running
ad-hoc repository searches.

The `documentation-lifecycle` variant exposes imperative lifecycle facts for
all imported docs: `canonicality`, `lifecycle_state`, `subject_key`,
counterpart counts, duplicate count, open action count, and `lifecycle_gap_kind`.
It is the operator surface for deciding whether a proposal is still proposed,
has been canonized into architecture, lacks a closeout, duplicates another
canonical document, or is safe intake/discard work. Human prose is a generated
view over those facts, not the authority.

## Generated Literature Surface

```bash
pnpm docs:knowledge-intake:generate
pnpm docs:knowledge-intake:check
```

These commands query existing Planning DB authority and do not import it.
Bootstrap or recovery imports are separate, explicit operator operations.

The generated literature source is local and ignored:

```text
.generated-docs/planning/status/generated-knowledge-intake-literature.md
```

An explicit `pnpm docs:publish` request publishes that generator-owned source
at `planning/status/generated-knowledge-intake-literature.md`. No tracked
pointer page or copied literature is permitted.

## Write Retirement Guard

```bash
pnpm planning:db:knowledge-intake:retirement:check
pnpm verify:changed
```

The guard is changed-only. It blocks added or renamed Markdown files under
`buzon/` while allowing existing files to be deleted or moved through governed
canonization work. New Fowler analysis intake must be captured through the
Planning DB command/query rails and then rendered from DB-backed projections.

## Invariants

- `buzon/` is an intake import source, not a canonical planning queue.
- No added or renamed `buzon/*.md` file may enter a changed slice after the
  DB-first retirement guard is active.
- Retirement state is derived from Planning DB knowledge tables, action rows,
  and imported repository backrefs.
- Active reference cleanup is derived from the
  `knowledge_intake_repository_reference_query` and file ownership projections,
  not from raw `rg` output.
- Generated literature must use this DB read model or a later DB projection,
  not raw directory traversal as authority.
- Generated literature must remain outside Git unless a later accepted plan
  moves the canonical content into a DB seed, migration, or other governed
  single-writer store.
- Physical deletion is allowed only after the DB state shows a safe
  disposition and active docs/tests no longer require the raw file.
- Canonization semantic tests must validate canonical plans and mechanization
  tokens instead of reading raw `buzon/*.md` files as proof.

## Flow

```mermaid
flowchart LR
  Buzon["Tracked intake files"] --> Importer["Planning DB knowledge import"]
  Repository["Tracked repository text files"] --> BackrefImport["Repository backref import"]
  Importer --> Knowledge["knowledge_documents / links / actions"]
  BackrefImport --> Backrefs["knowledge_intake_repository_references"]
  Knowledge --> Retirement["knowledge_intake_retirement_query"]
  Backrefs --> Retirement
  Backrefs --> References["knowledge_intake_repository_reference_query"]
  Knowledge --> Lifecycle["documentation_lifecycle_query"]
  Retirement --> Agents["planning:db:query knowledge-intake"]
  References --> Agents
  Lifecycle --> Agents
  Retirement --> Literature["docs:knowledge-intake:generate"]
  ChangedFiles["Changed files"] --> Guard["CheckBuzonIntakeRetirement"]
  Guard --> VerifyChanged["verify:changed"]
  Agents --> CanonicalDocs["canonical docs / tasks / risk"]
  Literature --> LocalRender[".generated-docs literature"]
```

## Validation

- `node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs`
- `node --test scripts/generate-knowledge-intake-literature.test.cjs`
- `node --test scripts/planning-db-query.test.cjs`
- `node --test scripts/planning-db-schema.test.cjs`
- `node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs`
- `pnpm planning:db:knowledge-intake:retirement:check`
- `pnpm docs:knowledge-intake:check`
