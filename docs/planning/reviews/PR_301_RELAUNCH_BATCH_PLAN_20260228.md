---
title: Plan de relanzamiento por lotes para sustitución de PR #301 (2026-02-28)
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: review
---
# Plan de relanzamiento por lotes para sustitución de PR #301 (2026-02-28)

## Contexto

La PR original `#301` (`feat(contracts): contracts v2`) se cerró por deriva estructural extrema contra `main` y alta densidad de conflictos al sincronizar.

Diagnóstico de riesgo observado:

- Conflictos múltiples en contratos y documentación de motor.
- Churn masivo y mezcla de ámbitos (contratos, docs, workflows, estructura histórica de paquetes).
- Coste de merge/rebase no proporcional al valor entregable inmediato.

Decisión:

- Sustituir PR monolítica por relanzamientos pequeños desde `main` actual.
- Cada lote con objetivo único, validación mínima y merge independiente.

---

## Objetivos de esta estrategia

1. Reducir riesgo de bloqueo por conflictos acumulados.
2. Aislar fallos por dominio para corrección rápida.
3. Aumentar velocidad de revisión (PRs más pequeñas y comprensibles).
4. Mantener trazabilidad explícita del reemplazo de `#301`.

---

## Lotes propuestos

## Lote A — Núcleo de contratos y esquemas

Ámbito:

- Esquemas/eventos canónicos estrictamente necesarios para Contracts v2.
- Sin tocar workflows de CI/CD en este lote.

Incluye:

- Definiciones de eventos/esquemas en `docs/architecture/engine/contracts/engine/events/*` (solo delta mínimo necesario).
- Ajustes de contrato en paquetes de contratos (`packages/@dvt/contracts/*`) solo si son imprescindibles para consistencia de esquema.

Excluye:

- Knowledge graph/cypher.
- Reorganizaciones masivas de docs no relacionadas.
- Cambios de release/deploy.

Criterio de aceptación:

- Validación de esquemas y compile de contratos en verde para el lote.
- Diff acotado y sin arrastre lateral.

---

## Lote B — Documentación de contratos (alineación índice/guías)

Ámbito:

- Documentación contractual y navegación asociada a Contracts v2.

Incluye:

- `README`/índices de contratos.
- Actualización de plantillas/guías contractuales estrictamente dependientes de Lote A.

Regla de formato:

- Comentarios de decisión en GH en Markdown.
- Documentación entregada en `.md` cuando aplique.

Criterio de aceptación:

- Enlaces coherentes.
- Sin ruido de carpetas no relacionadas.

---

## Lote C — Wiring técnico e integración mínima

Ámbito:

- Exports/wiring necesarios para que Contracts v2 quede utilizable sin romper consumers principales.

Incluye:

- Ajustes de exports/imports y glue code mínimo.

Excluye:

- Refactors de arquitectura no directamente requeridos.

Criterio de aceptación:

- Type-check/compilación del ámbito afectado en verde.
- Sin introducir deuda adicional de rutas antiguas.

---

## Política transversal de ejecución

1. Branch nueva desde `main` por lote (`relaunch/301-batch-a`, `relaunch/301-batch-b`, `relaunch/301-batch-c`).
2. Una PR por lote; no mezclar objetivos.
3. Si un lote crece fuera de control, se divide antes de pedir merge.
4. Comentarios de cierre/decisión siempre en Markdown en GitHub.
5. Evitar explícitamente cambios de knowledge graph en esta secuencia (fuera de alcance actual).

---

## Secuencia operativa recomendada

1. Crear PR Lote A y validar.
2. Merge Lote A.
3. Rebase/refresh de rama Lote B contra `main` actualizado.
4. Merge Lote B.
5. Rebase/refresh de rama Lote C.
6. Merge Lote C.

---

## Riesgos y mitigaciones

Riesgo 1: Reaparece deriva por cambios concurrentes en `main`.

- Mitigación: lotes cortos + refresh frecuente contra `main`.

Riesgo 2: Scope creep en docs/contratos.

- Mitigación: checklist de inclusión/exclusión por lote antes de abrir PR.

Riesgo 3: Bloqueo por checks heredados no relevantes.

- Mitigación: validar solo gates del ámbito del lote y documentar excepciones temporalmente aceptadas.

---

## Definición de "hecho"

Se considera rescatado el objetivo funcional de `#301` cuando:

- Los 3 lotes estén mergeados.
- No quede PR legacy abierta del intento monolítico.
- Haya trazabilidad documental del reemplazo por lotes.
