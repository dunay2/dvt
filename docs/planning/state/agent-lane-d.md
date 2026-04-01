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
- Total tasks: `15`
- Total effort points: `84`
- Completed weighted points: `30`
- Lane progress: `36%`
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

## Expected Outcome

- storage and read-path scale are bounded
- snapshot correctness is preserved
- GTM work is separated from code execution
