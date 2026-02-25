# DVT — Temporal worker DB coupling: diseño correcto desde día 0 (Hexagonal + CQRS + engine-agnostic)

**Fecha:** 2026-02-25  
**Origen del hallazgo:** [`DVT+ — Principal Architect Review260225000000.md`](docs/audit/DVT+%20%E2%80%94%20Principal%20Architect%20Review260225000000.md)

---

## 1) Posición arquitectónica (alineada con DVT)

Tu punto es correcto: en DVT no se trata de “arreglar algo roto”, sino de **no introducir deuda estructural** cuando todavía se está definiendo el núcleo.

Si el objetivo explícito es:

- arquitectura hexagonal por dominio,
- CQRS real (write/read separados),
- engine agnóstico,
- intercambiabilidad (Temporal hoy, otros motores mañana),

entonces la regla fundacional es:

> Ningún worker de engine escribe infraestructura de estado directamente.

No porque “hoy falle”, sino porque **rompe el contrato de diseño base** que queremos congelar temprano.

---

## 2) Caso de uso real de DVT (qué debe pasar)

En una ejecución de run:

1. El adapter de engine recibe señales/avances del workflow.
2. El dominio decide transición válida (invariantes).
3. El write model persiste estado autoritativo.
4. El read model proyecta vistas para API/UI.

En este flujo, el engine adapter es un **transportador de intención** y correlación, no dueño de persistencia.

---

## 3) Problema técnico reformulado correctamente

No es “Temporal acoplado a Postgres” como accidente operativo:  
es **violación de borde hexagonal** si un adapter cruza al detalle infra (tablas/SQL/transacción).

### Qué se evita si lo hacemos bien desde el inicio

- Lock-in de engine o storage.
- Reescrituras cuando llegue segundo adapter.
- Lógica duplicada de idempotencia fuera del dominio.
- Tests frágiles dependientes de DB para validar control flow del engine.

---

## 4) Discusión técnica (mesa de colegas, versión productiva)

### Colega 1 — Arquitectura de dominio

“Si somos hexagonales, el worker no puede conocer `schema/table/sql`. Debe invocar puerto de dominio.”

**Aporte clave:** coherencia de límites.

### Colega 2 — Plataforma/SRE

“Estoy de acuerdo si además definimos SLO y runbooks del write-path desde el primer ADR.”

**Aporte clave:** sin operación, no hay arquitectura enterprise.

### Colega 3 — Producto/entrega

“No hagamos big-bang. Diseñemos el target ahora y entreguemos vertical slices compatibles con ese target.”

**Aporte clave:** pragmatismo sin comprometer diseño.

### Colega 4 — Integración multi-engine

“El primer adapter no debe fijar semántica privada. El contrato debe ser neutral al engine.”

**Aporte clave:** intercambiabilidad real, no nominal.

**Consenso:** el patrón correcto es definir puertos de dominio y contrato de transición **antes** de escalar adapters.

---

## 5) Arquitectura objetivo recomendada (no trivial, pero realista)

## 5.1 Write-side (Command model)

Puertos de dominio mínimos:

- `RunStateCommandPort` → acepta comandos canónicos de transición.
- `RunStateRepositoryPort` → persistencia autoritativa del agregado/run.
- `RunEventAppendPort` → append-only de eventos auditables.
- `IdempotencyPort` → deduplicación por clave estable.

Adapters de infraestructura:

- Postgres adapter (hoy).
- Otra persistencia mañana sin tocar adapters de engine.

## 5.2 Read-side (Query model)

- Proyector desacoplado por eventos.
- Esquemas de consulta optimizados para API/UI.
- Rebuild/replay posible sin impactar write model.

## 5.3 Adapter de engine (Temporal, etc.)

Responsabilidades:

- mapear señales/estado del motor a comandos canónicos,
- correlacionar `runId`, `attemptId`, `causationId`,
- delegar a `RunStateCommandPort`.

**No responsabilidades:** SQL, transacciones DB, reglas de negocio de transición.

---

## 6) Contrato canónico propuesto (anti-acoplamiento)

Comando base `ApplyRunTransition`:

- `runId`
- `logicalAttemptId`
- `transitionType` (`RUN_STARTED`, `STEP_STARTED`, `STEP_COMPLETED`, `RUN_FAILED`, etc.)
- `occurredAt`
- `idempotencyKey`
- `correlationId`
- `engineEnvelope` (metadata opcional, no normativa)

Reglas:

1. `transitionType` y validación pertenecen al dominio.
2. `engineEnvelope` nunca define invariantes.
3. `idempotencyKey` fórmula congelada por ADR.

---

## 7) Opciones de implementación y evaluación

## Opción A — Worker escribe DB directa

**Pros:** simple hoy.  
**Contras:** anti-hexagonal, anti-agnóstico, deuda alta.  
**Veredicto:** descartar como estado objetivo.

## Opción B — Worker -> Servicio de estado síncrono

**Pros:** bordes limpios, control transaccional.  
**Contras:** hop extra, operación de servicio.  
**Veredicto:** buena base enterprise.

## Opción C — Worker -> evento -> materializador asíncrono

**Pros:** máximo desacople, trazabilidad fuerte.  
**Contras:** complejidad de orden/DLQ/replay.  
**Veredicto:** ideal a medio plazo si hay escala alta.

## Opción D — Híbrido (comando síncrono + evento auditoría)

**Pros:** equilibrio entre consistencia y observabilidad.  
**Contras:** más moving parts.  
**Veredicto:** mejor opción product-grade para DVT.

---

## 8) Recomendación final para DVT

Para “hacerlo bien desde el principio”:

1. Adoptar **Opción D** como target architecture.
2. Implementar primero **B** (servicio de estado) con contrato canónico estable.
3. Añadir pipeline de eventos/proyección como segunda ola.

Esto permite empezar limpio, sin sobreingeniería prematura, y sin hipotecar la intercambiabilidad.

---

## 9) Plan de ejecución (90 días, enterprise)

### Fase 1 (Semanas 1–3) — Borde hexagonal obligatorio

- Definir ADR de puertos y contrato `ApplyRunTransition`.
- Prohibir en lint/review cualquier acceso DB desde adapters de engine.
- Implementar `RunStateCommandPort` + tests de contrato.

### Fase 2 (Semanas 4–7) — CQRS mínimo operativo

- Separar write/read stores lógicamente.
- Proyector inicial idempotente.
- Métricas y trazas por transición.

### Fase 3 (Semanas 8–12) — Endurecimiento multi-engine

- Test harness de compatibilidad de adapter.
- Suite de conformance para Temporal + adapter simulado alternativo.
- Runbooks de DLQ/replay/snapshot.

---

## 10) Criterios de “arquitectura correcta” (Definition of Done)

Se considera alineado con DVT solo si:

1. Ningún adapter de engine contiene SQL/ORM/table-name.
2. El dominio valida transiciones vía contrato único.
3. Idempotencia es centralizada y verificable.
4. Read model se puede reconstruir desde eventos.
5. Se puede introducir un segundo engine sin tocar dominio de estado.

---

## 11) Riesgos y mitigaciones realistas

- **Riesgo:** latencia adicional por servicio de estado.  
  **Mitigación:** budget de latencia + batch controlado + circuit-breakers.

- **Riesgo:** complejidad operativa CQRS.  
  **Mitigación:** empezar con topología simple, observabilidad desde día 1.

- **Riesgo:** “atajo temporal” que se vuelva permanente.  
  **Mitigación:** policy en PR checks + ADR de excepción con fecha de caducidad.

---

## 12) Cierre

La lectura correcta no es “se rompió algo”; es “todavía estamos a tiempo de fijar la forma correcta”.

En una arquitectura como DVT, el éxito no está en que Temporal funcione hoy, sino en que **Temporal sea intercambiable mañana sin cirugía mayor**.

Ese resultado solo aparece cuando el write-path se diseña **por puertos de dominio, CQRS auténtico y contratos canónicos** desde el principio.
