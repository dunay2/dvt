---
title: Engine Migration Plan: Current Gap to Target Blueprint v0.6
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: proposal
---

---

title: Engine Migration Plan: Current Gap to Target Blueprint v0.6
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal

---

# Engine Migration Plan: Current Gap to Target Blueprint v0.6

## 1. Contexto

El estado actual de [`@dvt/engine`](packages/@dvt/engine/package.json:1) no sigue al 100% la plantilla objetivo definida en [`DVT_Blueprint_v0.6_MASTER.md`](docs/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md:100), especialmente en la estructura interna de [`src/`](packages/@dvt/engine/src/index.ts:1).

Objetivo de este plan: migrar por fases **sin mover archivos todavÃ­a** y sin romper surface pÃºblica, CI ni tests.

---

## 2. Gap analysis (actual vs target)

### 2.1 Estructura objetivo esperada

SegÃºn blueprint, un mÃ³dulo estÃ¡ndar debe tender a:

- `docs/`
- `schemas/` (envelope/commands/events)
- `src/{generated,domain,application,ports,adapters,composition}`
- `test/{unit,contract,integration}`
- `cli/src/{smoke,validate-schemas,codegen}`

Referencia: [`DVT_Blueprint_v0.6_MASTER.md`](docs/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md:100)

### 2.2 Estado actual observado en engine

En [`packages/@dvt/engine/src`](packages/@dvt/engine/src/index.ts:1) hoy existen carpetas mixtas:

- `core/`, `state/`, `security/`, `outbox/`, `utils/`, `metrics/`, `workers/`, `contracts/`, `application/`, `adapters/`, `ports/`

Principales desalineaciones:

1. Falta `domain/` y `composition/` explÃ­citos.
2. Existe mezcla de runtime + contratos dentro del paquete engine (`src/contracts/*`) en paralelo a [`@dvt/contracts`](packages/@dvt/contracts/index.ts:1).
3. Barrel root muy ancho en [`src/index.ts`](packages/@dvt/engine/src/index.ts:1), exportando internals y stubs juntos.
4. No hay `schemas/` y `cli/` propios de engine segÃºn plantilla objetivo.
5. Estructura de tests no estÃ¡ normalizada a `unit/contract/integration` al 100%.

---

## 3. Principios de migraciÃ³n

1. **No breaking changes** en surface pÃºblica durante fases iniciales.
2. **Strangler pattern**: crear target layout y redirigir gradualmente.
3. **Compatibilidad de imports** vÃ­a barrels de transiciÃ³n/deprecaciÃ³n.
4. **CI verde por fase** con rollback fÃ¡cil.
5. **Cambios pequeÃ±os por PR**, foco Ãºnico.

---

## 4. Estrategia por fases

```mermaid
flowchart LR
  A[Fase 0 Baseline] --> B[Fase 1 Target skeleton]
  B --> C[Fase 2 Realineacion interna]
  C --> D[Fase 3 Surface publica]
  D --> E[Fase 4 Contratos y schemas]
  E --> F[Fase 5 Tests y endurecimiento]
```

### Fase 0: Baseline y contratos de no-rotura

- Congelar surface actual en [`src/index.ts`](packages/@dvt/engine/src/index.ts:1).
- Inventariar exports consumidos por otros paquetes.
- Definir matriz de compatibilidad por rutas de import.

**Salida**: snapshot de API pÃºblica + criterios de aceptaciÃ³n por fase.

### Fase 1: Crear skeleton target (sin mover lÃ³gica)

Crear carpetas vacÃ­as/documentadas:

- `src/domain/`
- `src/composition/`
- `src/generated/`
- `schemas/{envelope,commands,events}`
- `cli/src/`

**Nota**: no se mueve cÃ³digo aÃºn; solo estructura objetivo y README por carpeta.

### Fase 2: RealineaciÃ³n interna incremental

- Mapear `core/*` y semÃ¡ntica de negocio a `domain/*`.
- Mantener wrappers en ubicaciÃ³n antigua (`core/*`) que re-exporten desde `domain/*`.
- Llevar wiring/orquestaciÃ³n tÃ©cnica a `composition/*`.
- Delimitar `application/*` para casos de uso (sin lÃ³gica infra).

**Regla**: cada movimiento con re-export de compatibilidad + tests.

### Fase 3: Surface pÃºblica controlada

- Definir `public API` mÃ­nima en [`src/index.ts`](packages/@dvt/engine/src/index.ts:1).
- Marcar exports legacy como deprecated en comentarios JSDoc.
- Evitar exportar stubs/adapters internos desde root cuando no sean API estable.

### Fase 4: Contratos y schemas

- Decidir frontera definitiva entre [`@dvt/contracts`](packages/@dvt/contracts/index.ts:1) y contratos locales engine.
- Migrar contratos runtime a package canÃ³nico de contratos cuando aplique.
- AÃ±adir/normalizar `schemas/` + validaciÃ³n.

### Fase 5: Tests y endurecimiento

- Normalizar pruebas en `test/unit`, `test/contract`, `test/integration`.
- AÃ±adir checks de boundaries/layering.
- Cerrar deprecaciones legacy en una Ãºltima fase controlada.

---

## 5. Riesgos y mitigaciÃ³n

1. **Ruptura de imports internos**
   - MitigaciÃ³n: re-exports de transiciÃ³n + bÃºsqueda global previa.

2. **AmbigÃ¼edad de ownership de contratos**
   - MitigaciÃ³n: ADR especÃ­fica de ownership antes de Fase 4.

3. **PRs demasiado grandes**
   - MitigaciÃ³n: cortar por submÃ³dulo y por capa.

4. **RegresiÃ³n en determinismo**
   - MitigaciÃ³n: ejecutar suites actuales + determinism tests por fase.

---

## 6. Backlog ejecutable (siguiente modo code)

- [ ] Crear skeleton target en engine (`domain`, `composition`, `generated`, `schemas`, `cli`).
- [ ] AÃ±adir docs cortas de propÃ³sito/ownership por carpeta.
- [ ] Definir lista de exports pÃºblicos permitidos en root.
- [ ] Implementar primera migraciÃ³n piloto: `core/WorkflowEngine` â†’ `domain/workflow` con wrapper legacy.
- [ ] Validar tests + type-check + lint.
- [ ] Repetir patrÃ³n con `core/SnapshotProjector`.
- [ ] Proponer ADR de ownership de contratos engine vs `@dvt/contracts`.

---

## 7. Criterios de aceptaciÃ³n del plan

1. Existe roadmap por fases con zero-downtime de imports.
2. Cada fase puede ejecutarse en PR independiente.
3. No se requiere big-bang refactor.
4. Se preserva compatibilidad con consumidores actuales.
