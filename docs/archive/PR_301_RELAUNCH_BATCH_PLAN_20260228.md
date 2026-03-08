---
title: Batch Relaunch Plan to Replace PR #301 (2026-02-28)
status: Archived
owner: docs
last_reviewed: 2026-03-07
planning_type: review
---

# Batch Relaunch Plan to Replace PR #301 (2026-02-28)

## Contexto

La PR original `#301` (`feat(contracts): contracts v2`) se cerrÃ³ por deriva estructural extrema contra `main` y alta densidad de conflictos al sincronizar.

DiagnÃ³stico de riesgo observado:

- Conflictos mÃºltiples en contratos y documentaciÃ³n de motor.
- Churn masivo y mezcla de Ã¡mbitos (contratos, docs, workflows, estructura histÃ³rica de paquetes).
- Coste de merge/rebase no proporcional al valor entregable inmediato.

DecisiÃ³n:

- Sustituir PR monolÃ­tica por relanzamientos pequeÃ±os desde `main` actual.
- Cada lote con objetivo Ãºnico, validaciÃ³n mÃ­nima y merge independiente.

---

## Objetivos de esta estrategia

1. Reducir riesgo de bloqueo por conflictos acumulados.
2. Aislar fallos por dominio para correcciÃ³n rÃ¡pida.
3. Aumentar velocidad de revisiÃ³n (PRs mÃ¡s pequeÃ±as y comprensibles).
4. Mantener trazabilidad explÃ­cita del reemplazo de `#301`.

---

## Lotes propuestos

## Lote A â€” NÃºcleo de contratos y esquemas

Ãmbito:

- Esquemas/eventos canÃ³nicos estrictamente necesarios para Contracts v2.
- Sin tocar workflows de CI/CD en este lote.

Incluye:

- Definiciones de eventos/esquemas en `docs/architecture/engine/contracts/engine/events/*` (solo delta mÃ­nimo necesario).
- Ajustes de contrato en paquetes de contratos (`packages/@dvt/contracts/*`) solo si son imprescindibles para consistencia de esquema.

Excluye:

- Knowledge graph/cypher.
- Reorganizaciones masivas de docs no relacionadas.
- Cambios de release/deploy.

Criterio de aceptaciÃ³n:

- ValidaciÃ³n de esquemas y compile de contratos en verde para el lote.
- Diff acotado y sin arrastre lateral.

---

## Lote B â€” DocumentaciÃ³n de contratos (alineaciÃ³n Ã­ndice/guÃ­as)

Ãmbito:

- DocumentaciÃ³n contractual y navegaciÃ³n asociada a Contracts v2.

Incluye:

- `README`/Ã­ndices de contratos.
- ActualizaciÃ³n de plantillas/guÃ­as contractuales estrictamente dependientes de Lote A.

Regla de formato:

- Comentarios de decisiÃ³n en GH en Markdown.
- DocumentaciÃ³n entregada en `.md` cuando aplique.

Criterio de aceptaciÃ³n:

- Enlaces coherentes.
- Sin ruido de carpetas no relacionadas.

---

## Lote C â€” Wiring tÃ©cnico e integraciÃ³n mÃ­nima

Ãmbito:

- Exports/wiring necesarios para que Contracts v2 quede utilizable sin romper consumers principales.

Incluye:

- Ajustes de exports/imports y glue code mÃ­nimo.

Excluye:

- Refactors de arquitectura no directamente requeridos.

Criterio de aceptaciÃ³n:

- Type-check/compilaciÃ³n del Ã¡mbito afectado en verde.
- Sin introducir deuda adicional de rutas antiguas.

---

## PolÃ­tica transversal de ejecuciÃ³n

1. Branch nueva desde `main` por lote (`relaunch/301-batch-a`, `relaunch/301-batch-b`, `relaunch/301-batch-c`).
2. Una PR por lote; no mezclar objetivos.
3. Si un lote crece fuera de control, se divide antes de pedir merge.
4. Comentarios de cierre/decisiÃ³n siempre en Markdown en GitHub.
5. Evitar explÃ­citamente cambios de knowledge graph en esta secuencia (fuera de alcance actual).

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

- MitigaciÃ³n: lotes cortos + refresh frecuente contra `main`.

Riesgo 2: Scope creep en docs/contratos.

- MitigaciÃ³n: checklist de inclusiÃ³n/exclusiÃ³n por lote antes de abrir PR.

Riesgo 3: Bloqueo por checks heredados no relevantes.

- MitigaciÃ³n: validar solo gates del Ã¡mbito del lote y documentar excepciones temporalmente aceptadas.

---

## DefiniciÃ³n de "hecho"

Se considera rescatado el objetivo funcional de `#301` cuando:

- Los 3 lotes estÃ©n mergeados.
- No quede PR legacy abierta del intento monolÃ­tico.
- Haya trazabilidad documental del reemplazo por lotes.
