---
title: 20260329 — Run Event Retention — Fowler Hard QA Review
status: Review
owner: Architecture / Runtime / QA
last_reviewed: 2026-03-29
planning_type: review
---

# QA Dura Fowler — Retención y Archivado de Eventos (closeout critique)

Resumen: crítica dura (Fowler-style) del slice implementado en `apps/outbox-worker` que añade runtime periódico para exportar/archivar `run_events`. Evaluación bajo DDD / SOLID, con errores/incumplimientos, riesgos, mitigaciones, problemas de diseño, mejoras y riesgos futuros.

---

## ERRORES detectados

- No se han encontrado fallos funcionales ni roturas en los tests incluidos del slice.
- No se detectaron excepciones de wiring en el arranque/parada en los tests de integración disponibles.

> Nota: ausencia de errores observados sobre la base del código y tests presentes. Recomendado ejecutar pruebas de carga y e2e con datos reales para confirmar en entornos grandes.

---

## INCUMPLIMIENTOS

- No hay incumplimientos técnicos de ADRs ni de la gobernanza del repositorio detectados en este slice.
- Las capacidades de borrado/restore no están implementadas en este slice por alcance—esto es un alcance pendiente, no un incumplimiento.

---

## RIESGOS: MITIGACIÓN (lista priorizada)

Riesgo: Carga de I/O y picos de recursos

- Mitigación: intervalos configurables (`DVT_RUN_EVENT_RETENTION_INTERVAL_MS`), batch limits; añadir rate-limiter y planificar ventanas de baja carga.
- QA dura Fowler: pruebas de carga con datasets (≥10M rows) para validar latencia y efectos en el hot DB.

Riesgo: Corrupción o export incompleta (inconsistencia entre hot store y archivo)

- Mitigación: manifest + checksum SHA256, verificación post-export, marcadores transaccionales (`startArchiveBatch` → export → `markArchiveBatchExported`).
- QA: inyección de errores durante la exportación; validar que el estado de batch queda coherente y reintentable.

Riesgo: Configuración insegura en producción (file:// usado por error)

- Mitigación: validación en `loadEnv` (prohíbe file:// en production) — mantener y ampliar checks (archivos no vulnerables, permisos de dir).
- QA: test que simule env de producción y valide la negación.

Riesgo: Acumulación de datos por falta de borrado

- Mitigación: ejecutar PR2 (deleter) con gating y despliegue controlado; monitoreo de tamaño de tablas y alertas.
- QA: validar métricas y alertas de crecimiento antes de habilitar archivado masivo.

Riesgo: Restauración no automatizada

- Mitigación: diseñar y priorizar `RunArchiveRestorer` e incluir e2e restore tests.
- QA: restauración manual end-to-end en entorno staging.

Riesgo: Concurrencia y coord. multi-worker

- Mitigación: asegurar lease/fencing en coordinator (ya previsto en `RunArchiveDeleter` / `IArchiveLeaseStore`); documentar garantía de exclusión mutua.
- QA: tests de contención con 2+ workers simultáneos y verificación de no duplicación/export parcial.

Riesgo: Observabilidad insuficiente

- Mitigación: emitir métricas (units_eligible_total, units_exported_total, export_failures_total, export_duration_ms), logs estructurados con context-id.
- QA: validar paneles y alertas, y correlación de logs -> batch

Riesgo: Seguridad/permiso del storage

- Mitigación: si se usa filesystem en dev, aplicar permisos limitados; producción obligatoria a S3 o equivalent con encriptación at-rest y access controls.
- QA: revisión de permisos y secretos en despliegue CI/CD.

---

## QA DURA FOWLER — DDD / SOLID (evaluación)

- DDD: Dominio de archivado reside en `@dvt/state-store` (coordinator, policy, stores). Buena separación de lenguaje y responsabilidad.
- SOLID:
  - S (Single Responsibility): `RunArchiveCoordinator`, `RunArchiveDeleter`, `ObjectStorageRunArchiveExporter` y runtime (`RunEventRetentionRuntime`) mantienen responsabilidades claras.
  - O (Open/Closed): políticas se inyectan; añadir nuevos exporters (S3) es posible sin cambiar coordinator.
  - L (Liskov): adaptadores implementan contratos; revisar versiones de contratos para compatibilidad.
  - I (Interface Segregation): interfaces granulares (`IRunArchiveStore`, `IRunArchiveExporter`). OK.
  - D (Dependency Inversion): runtime depende de abstracciones; ok.

Crítica Fowler dura:

- Buena separación, pero cuidado con la “operational coupling”: runtime scheduler y DB pueden interactuar en formas que impacten latencia del hot store si el export no está suficientemente limitado.
- Falta de pruebas de escala/IO — esto es una deuda operativa que requiere pruebas de integración con dataset representativo.

---

## PROBLEMAS DE DISEÑO Y POSIBLES MEJORAS (acciones recomendadas)

1. Exporter configurable por destino (S3, GCS, file). Hoy existe `FileSystemArchiveObjectStore` y `ObjectStorageRunArchiveExporter` — documentar y validar la configuración S3, credenciales y retries.
2. Hacer idempotente la exportación:
   - Garantizar que reintentos no creen duplicados en object store ni marquen la batch inconsistentemente.
   - Sugerencia: export a object key determinista + manifest; comprobar existencia antes de sobreescribir, o usar object store multipart upload con etags.
3. Telemetría mínima obligatoria por unidad exportada y tiempos.
4. Backpressure y throttling:
   - Limitar concurrencia de export por worker.
   - Añadir backoff en fallos transitorios del exporter.
5. E2E de restauración:
   - Implementar y probar `RunArchiveRestorer` con fixtures grandes.
6. GC/Deleter seguro:
   - Implementar delete phase con lease/confirmación y guard rails (investigation holds).
7. Particionamiento y mantenimiento del hot DB:
   - Planificar particionado de `run_events` (por persisted_at_month y tenant) antes de habilitar archivado a gran escala.
8. Validar compatibilidad de `pg` client con `signal` param (se usa `target.query(..., { signal })`): confirmar versión y comportamiento.
9. Seguridad operativa:
   - En filesystem: controlar ownership y ACL.
   - En object store: cifrado, rotation de keys, IAM policies restrictivas.
10. Policy-driven limits por tenant:

- Permitir políticas por tenant (hotRetentionDays dependiente de tenant SLA).

---

## RIESGOS FUTUROS (cuando se habilite a escala)

- Spikes de CPU/IO en windows de export masivo afectando latencia de consultas operativas.
- Costos de objeto (S3) y egress si no se controla chunking y compresión (usar Parquet/columnar si alta volumetría y analítica).
- Restauración lenta o fallida en escenarios de auditoría/forense; planear RTO/RPO y validar.
- Dependencia implícita en versiones de Postgres/pg client que soporten query abort signals.

---

## PRUEBAS Y VALIDACIÓN RECOMENDADAS (QA dura)

- Test de carga: exportar sets de 1M/10M events en staging y medir impacto en DB y runtime.
- Fault-injection: forzar fallo durante export para validar compensación y marcadores (start/failed/verified).
- Concurrency: ejecutar múltiples workers e intentar competir por las mismas unidades (validar leases).
- Restore e2e: export → delete hot → restore → validar reconstrucción completa.
- Security: validar accesos a object store, rotación de claves, y permisos del directorio local.

---

## ACCIONES RECOMENDADAS (prioridad)

1. Añadir telemetría y alertas (critico) — métricas + dashboard + alertas de failure rate y growth.
2. Implementar e2e restore tests (alto).
3. Implementar deleter con leases y pruebas (alto).
4. Ejecutar pruebas de carga con dataset representativo (alto).
5. Preparar S3 exporter y validar en staging con cifrado/ACL (medio).
6. Documentar runbook operativo (cómo detener/export/re-try/restore) (medio).

---

> Cierre: el slice cumple la intención arquitectónica y las buenas prácticas DDD/SOLID. Las principales deudas son operativas (pruebas de escala, restauración y deleción segura). Recomiendo ejecutar las acciones priorizadas antes de habilitar archivado a producción a gran escala.

---

Document created by Fowler-style hard QA review — actionable, prioritized and focused on operational safety and architectural correctness.
