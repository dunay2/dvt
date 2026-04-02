---
title: RC-A2 Architectural Review Hard Mode
status: Historical
owner: Architecture
last_reviewed: 2026-03-22
planning_type: review
---

# 1. Resumen ejecutivo (max 10 lineas)

El cambio RC-A2 resuelve un problema real y bien definido: cumplimiento de `INV-INTENT-011` para evitar conflicto de intentos activos por IDs no deterministas en crash-retry.  
La solucion es proporcional y de bajo impacto: no reestructura runtime ni altera el flujo ADR-0030; sustituye un punto puntual (`eventId()` por derivacion determinista).  
Arquitectonicamente, mantiene coherencia con ADR-0030 y evita under-engineering.  
No se detectan hacks ni shortcuts operativos.  
El principal gap es de endurecimiento contractual y de tests negativos de frontera (input normalization/canonicalization), no de diseno macro.  
Existe un riesgo medio de colisiones semanticas por usar concatenacion con separador sin canonical serializer.  
El cambio es aceptable, pero requiere condiciones para blindar evolucion y evitar drift futuro entre contrato, implementacion e invariante.

# 2. Hallazgos arquitectonicos

1. Problema e intencion: correctamente identificado.
   - `INV-INTENT-011` exige `intentId` determinista para `(tenantId, runId)`.
   - Antes habia UUID aleatorio en el punto de creacion de intent.
   - El cambio corrige justo ese desalineamiento.

2. Proporcionalidad de la solucion: adecuada.
   - Cambia solo el builder y el call-site en `WorkflowEngine`.
   - No introduce nueva infraestructura ni complejidad accidental alta.

3. Coherencia global del sistema: buena.
   - Alinea con ADR-0030 (pre-dispatch intent log y crash consistency).
   - Preserva que otros eventos sigan con `eventId()` aleatorio.
   - Mantiene la separacion actual de responsabilidades en runtime.

4. Drift contrato/implementacion/intencion: parcial.
   - Contrato extendido y uso en runtime estan alineados.
   - Falta formalizar en el metodo nuevo reglas de canonicalizacion para evitar ambiguedades de preimagen hash.

5. Cambio accidental no justificado: no encontrado.
   - No hay side-effects visibles fuera de la ruta `startRun` intent ID.

# 3. Violaciones SOLID

- **S (Single Responsibility)**: sin violacion critica.
  - `WorkflowEngine` ya es un orquestador grande, pero RC-A2 no incrementa su multiproposito de forma significativa.
- **O (Open/Closed)**: leve tension (menor).
  - Se agrego metodo a interfaz concreta del builder; extensibilidad aceptable, pero aumenta superficie de contrato.
- **L (Liskov)**: sin evidencia de ruptura.
  - Implementacion `IdempotencyKeyBuilder` sigue cumpliendo expectativas de uso.
- **I (Interface Segregation)**: riesgo menor.
  - `IIdempotencyKeyBuilder` suma otra responsabilidad (run events + signals + start-run intent). No rompe hoy, pero muestra tendencia a crecer como “god utility”.
- **D (Dependency Inversion)**: correcto.
  - `WorkflowEngine` depende de abstraccion (`idempotency`) y no de detalles concretos.

# 4. Problemas hexagonales

1. No hay fuga fuerte de infraestructura al dominio en este cambio.
   - La derivacion hash permanece en servicio de aplicacion/orquestacion, no en adapter IO.

2. Punto de atencion:
   - El algoritmo de derivacion (`tenantId|runId|START_RUN_INTENT`) esta embebido en builder tecnico sin contrato canonico de serializacion.
   - Esto puede derivar en divergencia futura entre adapters/servicios si otro componente necesita reproducir el mismo ID.

# 5. Riesgos

- 🟠 **Alto**: no se define canonical serializer del preimage.
  - Uso de concatenacion delimitada por `|` puede volverse ambiguo ante valores con delimitador o normalizacion diferente (espacios, unicode normalization, case policy futura).
  - Impacto: potencial colision semantica o incompatibilidad cross-component al reproducir IDs.

- 🟡 **Medio**: cobertura negativa insuficiente para el nuevo contrato.
  - No hay tests de frontera para `startRunIntentId` (inputs extremos y reglas de canonicalizacion).
  - Impacto: drift silencioso en futuras refactors.

- 🟡 **Medio**: validacion de criterio de salida incompleta respecto al plan.
  - La propuesta pide confirmar que uso de `eventId()` fuera de start-run no cambia; no hay prueba dedicada explicita a ese criterio.

# 6. Oportunidades de mejora

1. Definir serializer canonico para `startRunIntentId`.
   - Ejemplo: `sha256Hex(JSON.stringify({v:1, tenantId, runId, kind:"startRunIntent"}))` o encoder con longitud-prefijo.
   - Documentar invariantes de serializacion en contrato.

2. Agregar tests negativos/edge para `startRunIntentId`.
   - Strings con delimitadores, unicode normalizado/no normalizado, limites de longitud.

3. Proteger no-regresion de `eventId()` en rutas no-intent.
   - Test focal que demuestre que `buildRunEvent` y `emitSignalDerivedRunEvent` mantienen estrategia actual.

4. Evitar crecimiento monolitico del builder.
   - Si aparecen mas familias de IDs, separar estrategia por bounded concern (`RunEventKeyPolicy`, `IntentKeyPolicy`, `SignalKeyPolicy`).

# 7. Comentarios inline (formato PR)

```md
// file: packages/@dvt/engine/src/core/idempotency.ts

[ARCH][MAJOR] `startRunIntentId()` usa concatenacion con separador (`tenantId|runId|START_RUN_INTENT`) sin serializer canonico versionado. Esto deja riesgo de ambiguedad semantica y drift cross-component. Recomiendo encoder canonico con version de esquema.

[ARCH][MINOR] Falta explicitar invariantes del metodo nuevo (normalizacion de strings, policy de case, caracteres especiales) como comentario de contrato tecnico.

[ARCH][SUGGESTION] Si el builder sigue creciendo, separar estrategias por concern para mantener ISP y evitar “utility god object”.

// file: packages/@dvt/engine/src/core/WorkflowEngine.ts

[ARCH][MINOR] Correcta alineacion con ADR-0030/INV-INTENT-011 en `_createStartRunIntent`; buen cambio puntual y proporcional.

[ARCH][SUGGESTION] Agregar referencia de invariante junto al call-site (`INV-INTENT-011`) para reducir riesgo de regresion por futuras refactors.

// file: packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts

[ARCH][MAJOR] Cobertura positiva correcta, pero faltan negativos de frontera (delimitadores, unicode normalization, entradas extremas). Sin estos tests, el contrato de derivacion sigue fragil ante cambios.

[ARCH][MINOR] No hay test explicito del criterio de salida #3 del plan (que `eventId()` sigue intacto fuera de start-run intent).

// file: packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts

[ARCH][MINOR] Extender `IIdempotencyKeyBuilder` aqui es coherente con el cambio, pero revisar si esta interfaz deberia mantenerse acotada por sub-interfaces para evitar acoplar demasiadas politicas de identidad en un solo contrato.
```

# 11. Veredicto

**ACCEPT WITH CONDITIONS**

Condiciones:

1. Definir y documentar serializer canonico/versionado de `startRunIntentId`.
2. Agregar tests negativos de frontera para el metodo nuevo.
3. Agregar prueba explicita de no-regresion para `eventId()` fuera de la ruta start-run intent.

## Incident Status

- Condition 1 (canonical serializer/versioning): `CLOSED`
  - Implemented with canonical versioned payload in `packages/@dvt/engine/src/core/idempotency.ts`
  - Contract note aligned in `packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts`
- Condition 2 (negative tests): `CLOSED`
  - Added in `packages/@dvt/engine/test/idempotency.vectors.test.ts`
- Condition 3 (eventId non-regression): `CLOSED`
  - Added in `packages/@dvt/engine/test/idempotency.vectors.test.ts`
