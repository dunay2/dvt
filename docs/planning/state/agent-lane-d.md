---
title: Agent Lane D - Scale And Go-To-Market
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
planning_type: status
---

Eres Dana, lider de escala y GTM readiness. Tu foco es sostenibilidad operativa y riesgos residuales explicitamente gestionados.

## Principios obligatorios

- Escala con limites: retencion, costos y crecimiento acotados
- Correctitud de snapshot y storage por encima de throughput bruto
- Riesgo explicito: lo diferido debe tener dueno y razon no-bloqueante
- GTM desacoplado de cambios runtime de alto riesgo
- Priorizar capacidad operativa antes de optimizacion prematura

## Forma de trabajo

- Convertir riesgos en backlog ejecutable y medible
- Definir criterios de cierre por capacidad (no solo actividad)
- Mantener separacion entre roadmap comercial y hardening tecnico

## Restricciones

- No introducir complejidad de escala sin evidencia de cuello real
- No mezclar tareas P3 de negocio con bloqueantes del MVP
- No cerrar riesgos sin evidencia de mitigacion verificable

# Agent Lane D - Scale And Go-To-Market

Generated from the verified lane registry `agent-lane-d.yaml`. Use this file when assigning Agent D.

## Goal

Prepare the system for scale and for the first enterprise customer.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-03-31`
- Total tasks: `23`
- Total effort points: `124`
- Completed weighted points: `30`
- Lane progress: `24%`
- Notes: Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.

## Tasks

> Verified registry source: `agent-lane-d.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [x] `P0` `MVP-D1` `done` `M` `5pt` `100%`: define the residual-risk baseline explicitly accepted after MVP backend operability reset, including what is deferred and why it does not block MVP.
- [x] `P1` `run event log retention + TTL` `done` `L` `8pt` `100%`: bound storage growth and automate archival.
- [x] `P1` `G5-PR2` `done` `L` `8pt` `100%`: add deferred deletion and restore flow for archived events.
- [x] `P1` `S15` `done` `M` `3pt` `100%`: add monotonic CAS guard on run_snapshots.last_run_seq upsert to prevent snapshot regression under concurrency.
- [x] `P1` `S15-F1` `done` `M` `3pt` `100%`: surface CAS no-op outcome for stale snapshot writes so repair callers can observe discard.
- [x] `P1` `S14` `done` `M` `3pt` `100%`: preserve gateway evaluation context across `continueAsNew` segments.
- [ ] `P2` `cost attribution model` `blocked` `L` `8pt` `0%`: support billing and finance reporting.
- [ ] `P2` `run_events partitioning` `queued` `L` `8pt` `0%`: reduce storage and write-path pressure.
- [ ] `P2` `read replica query path` `blocked` `M` `5pt` `0%`: offload read traffic from primary.
- [ ] `P2` `projector event-driven invalidation` `blocked` `M` `5pt` `0%`: remove polling bottlenecks.
- [ ] `P2` `Temporal -> API backpressure` `blocked` `M` `5pt` `0%`: protect admission under saturation.
- [ ] `P1` `AR-D1` `queued` `L` `8pt` `0%`: implement incremental snapshot projection (apply event delta instead of full replay) so that getRunStatus does not degrade to O(n) for high-step-count DAGs when snapshot is stale.
- [ ] `P2` `AR-D2` `queued` `S` `2pt` `0%`: define Temporal continueAsNew threshold as a governed contract parameter with documented SLA for maximum workflow history size and step count per segment.
- [ ] `P2` `AR-D3` `queued` `S` `3pt` `0%`: document worker scaling strategy for 1000+ tenants — per-tenant workers vs shared pool, task queue density model, cold-start latency targets, and worker auto-scaling policy.
- [ ] `P2` `AR-D4` `queued` `L` `8pt` `0%`: design and implement zero-downtime schema rollback strategy to eliminate the maintenance-mode requirement for state-store schema changes in a multi-tenant SaaS environment.
- [ ] `P2` `AR-D5` `queued` `M` `5pt` `0%`: add tenant-configurable retention policies so enterprise tenants can retain data longer and free-tier tenants have aggressive purging, instead of one-size-fits-all hotRetentionDays.
- [ ] `P1` `MW-D1` `queued` `L` `8pt` `0%`: create an SDK/API for external plan definition that allows systems outside the dbt ecosystem to submit DAGs to the planner without going through the dbt manifest format.
- [ ] `P2` `MW-D2` `queued` `M` `5pt` `0%`: define worker routing model by step kind — which workers execute which types of steps, how task queues are assigned per step kind, and how worker images are specialized (e.g., a SPARK_JOB worker needs Spark client, not dbt CLI).
- [ ] `P2` `AR-D6` `queued` `S` `1pt` `0%`: assess triple versioning (planVersion + schemaVersion + contractVersion) governance burden after 6 months — if still only planVersion '1.0', evaluate whether the overhead is justified and consider simplification.
- [ ] `P3` `first enterprise pilot` `blocked` `L` `8pt` `0%`: validate product-market fit.
- [ ] `P3` `billing integration` `blocked` `M` `5pt` `0%`: turn usage into invoicing.
- [ ] `P3` `compliance documentation pack` `blocked` `M` `5pt` `0%`: prepare regulated customer onboarding.
- [ ] `P3` `acquisition positioning deck` `blocked` `M` `5pt` `0%`: support GTM narrative and exit positioning.

## Dependencies

- `MVP-D1` is now closed as the explicit residual-risk baseline for MVP backend operability, but the underlying scope-drift risk entry remains open.
- `run event log retention + TTL` is now verified as delivered by closeout plus accepted evidence from 2026-03-30.
- `G5-PR2`, `S15`, `S15-F1`, and `S14` are closed with code-backed closeouts.
- `cost attribution model` remains blocked on `S05` and on retention being fully operationalized.
- `projector event-driven invalidation` stays blocked on the read-your-writes contract even though the staleness surface is now caller-visible.
- `first enterprise pilot`, billing, compliance, and acquisition collateral remain explicit GTM backlog rather than implementation work.
- `AR-D1` through `AR-D6` originate from the 2026-04-02 deep architectural review: incremental snapshot projection (P1), continueAsNew governance (P2), worker scaling docs (P2), zero-downtime rollback (P2), tenant-configurable retention (P2), and triple versioning assessment (P2).
- `MW-D1` and `MW-D2` are multi-workflow scale tasks: external plan SDK/API (P1, depends on MW-A2) and worker routing model by step kind (P2, depends on MW-C1).

## Expected Outcome

- storage and read-path scale are bounded
- snapshot correctness is preserved
- GTM work is separated from code execution
