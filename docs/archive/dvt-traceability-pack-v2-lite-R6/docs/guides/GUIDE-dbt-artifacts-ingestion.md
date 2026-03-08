---
title: Guide — dbt Artifacts Ingestion (manifest/run_results/catalog)
status: Guide
tags: [dbt, artifacts, ingestion, manifest, catalog]
---

# dbt Artifacts Ingestion (manifest/run_results/catalog)

Use when changes affect:

- graph building from dbt artifacts
- UI ingestion pipelines
- state enrichment from run_results
- schema/metadata from catalog

## 1) Artifacts are immutable inputs

Treat artifacts as immutable snapshots:

- store with content hashes
- cache by (project, env, hash)

## 2) Partial artifact handling

`catalog.json` may be partial (selected models only).
Rules:

- missing catalog entry ≠ object does not exist
- represent “unknown” explicitly in UI/read models

## 3) Versioning and compatibility

- Pin supported dbt artifact schema versions
- Add a compatibility layer if artifact formats evolve

## 4) Verification

- Fixture-based tests using real artifact samples
- Golden graph snapshot tests (manifest → graph nodes/edges)
- Ensure ingestion fails gracefully on missing/partial data

References:

- dbt artifacts: https://docs.getdbt.com/docs/build/artifacts
