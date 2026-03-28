---
title: Carencias — Migración de Esquema Intent Store
status: Draft
last_reviewed: 2026-03-15
owner: engine
---

# Carencias — Migración de Esquema Intent Store

Este documento registra las carencias y riesgos detectados en el modelado y migración de esquema del Intent Store (StartRunIntentSchemaManager).

## Carencias Detectadas

### 1. Evolución de status

- Enum de status limitado a PENDING, DISPATCHED, RESOLVED, EXPIRED; no contempla estados intermedios o fallidos.
- Falta formalización de estados de error, intentos fallidos, o transición a DLQ.

### 2. Constraints y validación

- Constraint engine_run_ref shape valida solo provider y tenantId; no valida runId, ni otros campos críticos.
- Falta constraint para garantizar unicidad de intentos por runId en todos los estados relevantes.
- No existe constraint para evitar intents huérfanos indefinidamente (no hay expiración automática).

### 3. Auditoría y trazabilidad

- Falta modelado de auditoría de migraciones (quién, cuándo, por qué).
- No se registra el historial de cambios de status en intents.

### 4. Integración con agregados

- Falta integración formal con agregados de error, DLQ, reconciliación y auditoría.
- No se modela la relación entre intents y run metadata en el esquema.

### 5. Riesgos operativos

- Migraciones concurrentes pueden causar race conditions si el lock advisory falla.
- Falta validación de rollback seguro ante errores de migración.
- No se modela la evolución del enum de status para futuras extensiones.

## Oportunidades de Mejora

- Ampliar el enum de status para contemplar estados de error y transición a DLQ.
- Formalizar constraints para shape completo de engine_run_ref y unicidad de intents.
- Documentar y modelar auditoría de migraciones y cambios de status.
- Integrar el esquema con agregados de error, reconciliación y DLQ.
- Revisar y robustecer la estrategia de locking y rollback en migraciones concurrentes.

---

**Actualizar este documento conforme se cierren carencias o se formalicen nuevos agregados o constraints.**
