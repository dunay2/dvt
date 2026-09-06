---
title: dbt-osmosis Integration Study
status: Review
owner: Architecture / Product
date: 2026-08-23
last_reviewed: 2026-09-06
planning_type: study
---

> Historical evidence: this study describes DVT baseline
> `ffee4ee479b683e3346d5a96749229f798d4ca41` and the pinned upstream
> revisions below. “Current” and “AS-IS” refer to that snapshot, not today's
> implementation. Integration preserves research evidence only: it adds no
> dependency, runtime integration, implementation commitment, or priority.
> Current disposition and acceptance remain in issue #2619.

# dbt-osmosis integration study

Date: 2026-08-23

DVT baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`

Upstream baseline: `z3z1ma/dbt-osmosis@3cc00a57fa4883050fd5cffeba7adee9d6d0d4d3`

Issue: #2619

## Decision

**ADOPT-BOUNDED**, but not as a direct DVT workspace writer or a replacement for the native dbt analyzer.

The valuable surfaces are:

1. column documentation inheritance / provenance over the dbt lineage graph;
2. read-only schema diff and change classification;
3. optional future bulk YAML refactor as a _candidate generator on an isolated snapshot_, never as the authoritative mutation path.

The following are not adopted as DVT authorities:

- direct YAML writes to the authoritative workspace;
- dbt project/source identity;
- Canvas authoring authority;
- dbt execution/validation authority;
- Source Import identity or source-YAML publication;
- SQL parsing/linting where SQLGlot/dbt-native rails already own the concern;
- Streamlit workbench, LLM helpers or proxy runtime.

## Upstream posture

`dbt-osmosis` 1.5.0 is an Apache-2.0 Python project. At the studied upstream it is active, not archived, and targets Python 3.10-3.13 and dbt Core 1.8+ with audited CI through 1.11.x. The package depends on dbt Core/common/interface, `ruamel.yaml`, SQLGlot and RapidFuzz.

Its primary surfaces are YAML organization/documentation/refactor, documentation inheritance, SQL helpers, generation, schema diff, migration planning, validation, linting and test suggestions.

## DVT AS-IS authority

### File-backed dbt authority

ADR-0060 keeps project SQL/YAML/CSV/macros/tests/packages as product truth in `dbt-project-files` mode. DVT projections must not normalize or rewrite unsupported constructs simply because the visual layer cannot represent them.

### Native analyzer

`DbtCliProjectAnalyzer` already:

- resolves an authorized project root;
- snapshots the dbt source under bounded file/byte/directory/depth limits;
- runs a sanitized server-managed dbt process;
- uses `dbt parse` / selected `dbt compile`;
- produces manifest-based resources/dependencies/diagnostics;
- binds a versioned analysis identity and semantic evidence;
- never analyzes the authoritative working tree in place.

This remains the dbt semantic authority. dbt-osmosis must not become a second analyzer state or project revision owner.

### Direct YAML description edits

DVT already has a stronger safety rail for one supported semantic edit:

`YamlCstDbtDescriptionMutator` parses YAML with source tokens and patches only the relevant description token/range. It deliberately avoids reserializing unrelated YAML.

`ApplyDbtYamlDescriptionEditCommand` additionally proves:

- proposal integrity;
- resource/path identity;
- expected content SHA;
- stale revision conflict;
- atomic workspace batch mutation;
- idempotent receipt behavior;
- post-write fresh dbt graph projection;
- retained file SHA after reanalysis.

This rail must survive.

### Source Import

`DbtProjectFilesWarehouseSourceImportStrategy` uses DVT connection-bound source identity, an explicit file plan, atomic batch mutation, fresh project projection verification and rollback on projection failure. dbt-osmosis source generation does not replace these DVT-specific guarantees.

## What dbt-osmosis adds that DVT does not currently own

### 1. Column documentation inheritance

This is the strongest candidate.

The upstream inheritance engine builds ancestor generations from manifest dependencies and constructs a column knowledge graph. It can:

- trace descriptions and selected metadata through upstream models/sources/seeds;
- use unrendered YAML descriptions;
- merge tags/meta/config metadata;
- resolve column-name variants through plugins;
- handle explicit default/progenitor overrides;
- carry provenance through `osmosis_progenitor` when configured;
- guard recursion/cycles and produce deterministic ancestor ordering.

Repository search at the DVT baseline found no equivalent production implementation.

**DVT use:** project inherited documentation as read-only evidence/provenance. Do not automatically write `osmosis_progenitor` or other dbt-osmosis-specific metadata into customer YAML.

Target projection concept:

```text
DbtColumnDocumentationProjection
  resourceUniqueId
  column
  localDescription?
  inheritedDescription?
  inheritedFromUniqueId?
  lineageDepth?
  confidence / resolution reason
```

The authoritative YAML remains unchanged until the user explicitly accepts a bounded edit.

### 2. Schema diff

`dbt-osmosis` already classifies YAML-vs-database changes:

- column added;
- column removed;
- type changed;
- potential rename using RapidFuzz;
- safe/moderate/breaking severity.

This can become useful DVT technical evidence, but fuzzy rename is a suggestion, never identity truth.

DVT already owns connection scope, source identity and authorization. A future adapter must consume governed DVT connection/target context rather than create a second credentials or connection model.

### 3. Bulk YAML organization/refactor

`dbt-osmosis` uses `ruamel.yaml`, retains unknown top-level sections, preserves their relative top-level order, writes through a temporary file and atomically replaces the target, and supports dry-run/check modes.

This is mature enough to avoid writing our own generalized dbt YAML organizer.

However it is **not byte-preserving** in the sense required by DVT direct semantic edits:

- it re-renders the complete managed YAML representation;
- its default `preserve_quotes` is false;
- it deliberately normalizes scalar styles, e.g. folded/literal descriptions;
- the writer compares the whole rendered byte stream with the original.

Therefore it must not replace the CST range mutator for surgical edits.

A safe future DVT bulk flow is:

```text
authoritative project revision
        |
        v
DVT bounded project snapshot
        |
        v
dbt-osmosis modifies snapshot only
        |
        v
changed-file candidate set + before/after hashes
        |
        v
DVT preview / proposal
        |
        v
existing IWorkspaceFileBatchMutationPort
(expected authoritative SHAs)
        |
        v
fresh DVT dbt analysis
        |
        v
accepted receipt or rollback/refusal
```

No direct dbt-osmosis write to the workspace is allowed.

## Component disposition

| DVT / upstream concern                  | Decision                    | Reason                                                                    |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `DbtCliProjectAnalyzer`                 | KEEP                        | server-owned bounded native dbt analysis is already correct authority     |
| `ProjectDbtGraphFromFilesUseCase`       | KEEP / simplify under #2171 | DVT scope, connection and editability projection                          |
| `YamlCstDbtDescriptionMutator`          | KEEP                        | stronger surgical byte-preservation than whole-file osmosis render        |
| `ApplyDbtYamlDescriptionEditCommand`    | KEEP                        | DVT CAS/idempotency/batch/reanalysis guarantees                           |
| DVT Source Import YAML plan             | KEEP                        | connection-bound identity, projection proof and rollback are DVT-specific |
| osmosis column inheritance              | ADOPT-BOUNDED               | high-value missing capability; read-only first                            |
| osmosis schema diff                     | ADOPT-BOUNDED               | useful technical evidence; rename remains advisory                        |
| osmosis YAML writer/refactor            | SNAPSHOT-ONLY candidate     | useful bulk transformation, unsafe as authoritative direct writer         |
| osmosis source/staging/model generation | REFERENCE-ONLY              | overlaps DVT Source Import/generation but lacks DVT authority guarantees  |
| osmosis SQL compile/run                 | REJECT as duplicate         | dbt native analyzer/runtime remains authority                             |
| osmosis SQL lint                        | COORDINATE WITH #2618       | it already depends on SQLGlot; do not add a second SQL semantic path      |
| osmosis migration planner               | DEFER                       | no current bounded DVT product need                                       |
| osmosis test suggestions                | DEFER                       | evaluate with profiling/dbt-doctor study rather than duplicate            |
| osmosis LLM/NL/workbench/proxy          | REJECT                      | product/UI/runtime duplication and unnecessary operational surface        |

## Integration shape

Do not add dbt-osmosis to the Node/TypeScript dependency graph.

If adopted, install it only in the server-managed dbt analysis toolchain/container where Python/dbt already exists. Use the current process-runner isolation model and an exact pinned dbt-osmosis version.

Preferred first proof:

```text
DVT snapshot + native manifest
          |
          v
read-only dbt-osmosis enrichment
          |
          v
DVT-owned bounded projection
```

A second process must not trigger another unbounded `dbt parse` if the same manifest/snapshot can be reused. #2171 already owns analyzer-invocation convergence and is a prerequisite to any production integration that would duplicate parse work.

## Minimum proof slice

### Experiment A — documentation inheritance

Use one real dbt fixture with:

```text
source -> staging -> intermediate -> mart
```

and columns covering:

- exact same name;
- alias/renamed column;
- local description override;
- missing local description with upstream description;
- divergent upstream candidates;
- source/seed ancestor;
- versioned model if current fixture supports it.

Measure:

- inherited description correctness;
- provenance correctness;
- unsupported/ambiguous result posture;
- incremental process cost above existing DVT native analysis;
- whether the result can be produced without a second dbt parse.

Success means DVT gains useful provenance without any YAML mutation.

### Experiment B — schema diff

Against a governed dbt target, prove:

- add column;
- remove column;
- compatible type widening;
- breaking type change;
- likely rename with similarity score;
- no cross-connection/scope leakage.

The DVT result must label fuzzy rename as `candidate`, not as canonical rename truth.

## Stop conditions

Reject production dependency if any of these are true:

- it requires an independent authoritative project snapshot or dbt parse for every DVT graph read;
- it cannot operate within server-owned dbt credentials/target policy;
- it requires direct writes to the authoritative workspace;
- it introduces dbt-osmosis-specific metadata as DVT product truth;
- it broadens the Python/runtime surface more than the removed DVT implementation cost;
- version coupling to dbt materially reduces the support posture of the existing DVT analyzer.

## Net recommendation

Do **not** replace working DVT YAML or analyzer infrastructure.

Use dbt-osmosis to avoid implementing two hard capabilities ourselves:

1. documentation inheritance/provenance;
2. schema-drift classification.

Keep generalized YAML refactoring as an explicit snapshot-generated proposal capability only if a later product need justifies it.

This yields the intended reduction: DVT owns authority, security, revisions and receipts; dbt-osmosis supplies specialized dbt knowledge.
