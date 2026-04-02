---
title: Riesgos y mitigaciones - Retención y Archivado de Eventos
status: Draft
owner: Architecture / Runtime / QA
last_reviewed: 2026-03-29
planning_type: review
---

# Riesgos y Mitigaciones

## QA Dura Fowler — DDD / SOLID

Revisión crítica del slice de retención y archivado de eventos en `outbox-worker`, bajo principios DDD y SOLID, con enfoque en riesgos, mitigaciones y controles de calidad.

---

## Riesgo 1: Carga de trabajo y picos de I/O

**Mitigación:**

- Intervalos de ejecución configurables (`DVT_RUN_EVENT_RETENTION_INTERVAL_MS`).
- Límite de tamaño de batch y control de concurrencia.
- Ejecución fuera de horas pico recomendada.
- Observabilidad de métricas de duración y fallos.

---

## Riesgo 2: Pérdida de datos o corrupción en el archivado

**Mitigación:**

- Verificación de integridad (checksums SHA256, manifest).
- Logs estructurados y métricas de fallos.
- Política fail-soft: un fallo en una unidad no detiene el ciclo completo.
- Tests de integración y simulación de fallos.

---

## Riesgo 3: Configuración insegura en producción

**Mitigación:**

- Validación estricta en el loader de env: prohíbe `file://` en producción.
- Tests que rechazan configuraciones inseguras.
- Documentación visible en `.env.example` y ADRs.

---

## Riesgo 4: No eliminación real (acumulación de datos)

**Mitigación:**

- Este slice solo archiva; la eliminación está planificada en el siguiente slice (`G5-PR2`).
- Monitoreo del tamaño de tablas y alertas de crecimiento.
- QA: Validar que el archivado no elimina datos del hot store prematuramente.

---

## Riesgo 5: No restauración operativa

**Mitigación:**

- Interfaces de restauración (`RunArchiveRestorer`) ya diseñadas.
- QA: Validar que los datos archivados sean recuperables manualmente.
- Siguiente fase: automatizar y testear restauración.

---

## Riesgo 6: Regresiones o impacto en el worker principal

**Mitigación:**

- Runtime de retención completamente aislado y opt-in.
- Tests de integración: arranque/parada limpia, sin interferencia con el worker principal.
- QA: Validar que la activación/desactivación no afecta la entrega de eventos.

---

## Riesgo 7: Falta de observabilidad y alertas

**Mitigación:**

- Logs estructurados y métricas de unidades archivadas/fallidas.
- QA: Simular fallos y verificar que se registran y alertan correctamente.
- Plan futuro: integración con sistemas de alertas (Prometheus, Sentry, etc).

---

## Riesgo 8: No cumplimiento de políticas de compliance

**Mitigación:**

- Políticas de retención explícitas y documentadas (90 días hot, configurable).
- QA: Validar que los datos no se retienen más allá del periodo configurado.
- Siguiente fase: implementar redacción/erasure para GDPR.

---

## QA Dura Fowler — DDD / SOLID

- **Dominio separado:** La lógica de retención y archivado está en `@dvt/state-store`, no en el worker.
- **Puertos y adaptadores:** Separación clara entre dominio, adaptador y runtime.
- **SRP:** Cada clase tiene una única responsabilidad (scheduler, coordinator, exporter, deleter).
- **Opt-in y sin deuda:** El feature es opt-in, sin stubs ni bypasses.
- **Cobertura de tests:** Tests unitarios y de integración para wiring, errores y validación de env.
- **Gobernanza:** Cumple ADRs y reglas de cierre de slice (no deuda, no stubs, evidencia de validación).

---

> Documento generado por QA duro Fowler siguiendo principios DDD/SOLID y gobernanza del repositorio.
