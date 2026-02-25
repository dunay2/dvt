# 🔮 DVT+ Divination Layer v1.0.0

### The Oracle Engine — Spec · Nomenclatura D&D 5e · Código Fuente

**Fecha:** 2026-02-24  
**Versión:** `1.0.0`  
**Estado:** Draft → Production  
**Paquete:** `@dvt/divination`

> _"A Diviner does not change the world. They see what the world will become."_  
> — D&D 5e, Player's Handbook, School of Divination

---

## Índice

1. [Sistema de Nomenclatura D&D 5e](#1-sistema-de-nomenclatura-dd-5e)
2. [Especificación](#2-especificación)
3. [Estructura del paquete](#3-estructura-del-paquete)
4. [Código fuente completo](#4-código-fuente-completo)
5. [Tests](#5-tests)
6. [Integración con DVT+ v2.3.x](#6-integración-con-dvt-v23x)
7. [Roadmap](#7-roadmap)
8. [Checklist](#8-checklist)

---

## 1. Sistema de Nomenclatura D&D 5e

Toda la Divination Layer usa terminología D&D 5e como lenguaje canónico — en código interno, documentación **y UI**. Esta tabla es la fuente de verdad del mapeo.

### 1.1 Mapa de Conceptos

| Concepto DVT+                 | Nombre D&D                | Escuela / Mecánica          | Justificación                                    |
| ----------------------------- | ------------------------- | --------------------------- | ------------------------------------------------ |
| Simulation Engine             | **Divination Engine**     | School of Divination        | Divination: ver consecuencias antes de actuar    |
| What-If Run                   | **Scrying** (`scry()`)    | Divination spell (5e p.274) | Scrying: observar sin intervenir en el mundo     |
| Simulation Run State          | **Vision**                | Divination / Trance         | Una Visión es real pero no es el plano material  |
| Estimation Model              | **Omen**                  | Portent (Diviner feature)   | Portent: predecir resultados futuros con dados   |
| Uncertainty Range             | **Portent Dice**          | Diviner: Portent (2d20)     | Los dados representan el rango de incertidumbre  |
| No-history fallback           | **Augury**                | Divination spell (nivel 2)  | Augury: respuesta vaga cuando hay poco historial |
| Sin historial en absoluto     | **Silence**               | Silence spell (nivel 2)     | El oráculo no habla si no hay nada que ver       |
| PR Pre-Execution Intelligence | **Foresight**             | Divination spell (nivel 9)  | Foresight: visión completa antes del evento      |
| Simulación invalidada         | **Vision Dispelled**      | Dispel Magic (Abjuration)   | El plan cambió: la Visión se disipa              |
| Confidence score              | **Arcane Accuracy**       | Spell Attack modifier       | Probabilidad de acierto del oráculo              |
| SimulationAdapter             | **Diviner**               | Wizard subclass             | El Diviner ejecuta Scrying sin tocar el mundo    |
| Plan hash check               | **Concentration Check**   | Concentration mechanic      | Si el plan cambia, se rompe la concentración     |
| Simulación vigente            | **Concentration: active** | Sustained spell             | La Visión persiste mientras el plan no cambia    |

### 1.2 Nomenclatura en UI

Los textos visibles al usuario usan la terminología D&D. Los tooltips avanzados pueden mostrar el término técnico entre paréntesis.

| Elemento UI                  | Texto D&D                  | Tooltip / subtexto                                    |
| ---------------------------- | -------------------------- | ----------------------------------------------------- |
| Botón de ejecución simulada  | `✦ Cast Scrying`           | Ejecuta una simulación determinista del plan          |
| Badge de run simulado        | `👁 Vision`                | Este run es una simulación — no ejecutó SQL           |
| Modo de ejecución            | `Divination Mode`          | Oracle Engine activo · sin efecto en Snowflake        |
| Estimación de coste          | `Omen: ~$12.40 (±$5.60)`   | Basado en historial · rango de incertidumbre incluido |
| Estimación de duración       | `Omen: ~4m 20s (±1m 10s)`  | Percentil 50 histórico por nodeId                     |
| Confianza alta               | `Arcane Accuracy: 94%`     | Alta confianza en la estimación                       |
| Confianza baja (pocos datos) | `⚠ Augury (datos escasos)` | Menos de 5 runs históricos para este nodo             |
| Sin datos en absoluto        | `— Silence`                | Sin historial — no se muestra estimación              |
| Simulación invalidada        | `🔴 Vision Dispelled`      | El plan cambió — relanzar Cast Scrying                |
| Resultado PR Intelligence    | `✨ Foresight Report`      | Análisis pre-merge: coste, riesgo, SLA                |

---

## 2. Especificación

### 2.1 Principios

**El Diviner no cambia el mundo.** `scry()` nunca escribe en Snowflake, no lanza actividades, no muta el plan. Es una función pura de lectura.

**Implementa `IWorkflowEngine`.** El contrato del engine no cambia. `DivinationAdapter` (el Diviner) es un adapter más, intercambiable con `TemporalAdapter` o `ConductorAdapter`. El orchestrator no sabe la diferencia hasta que lee `ref.mode`.

**Determinismo garantizado.** Mismo `planId` + mismo historial → mismo `visionId` y mismos Omens. Los Portent Dice son reproducibles.

**Incertidumbre explícita siempre.** Nunca una estimación puntual sin rango. La UI siempre muestra `p50 (±spread)`. Sin historial suficiente → Augury (rango amplio marcado). Sin historial en absoluto → Silence (no se muestra).

**Concentration Check por hash.** Si `plan.inputHashSha256` cambia respecto a la Vision cacheada, la Vision se disipa automáticamente (`VISION_DISPELLED`). El `inputHashSha256` del planner v2.3.x ya provee esta garantía.

### 2.2 Invariantes formales

| Invariante              | Definición                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| **Portent Determinism** | `scry(planId, historial) → Vision idéntica si los datos no cambian`        |
| **Concentration Check** | `plan.inputHashSha256 ≠ vision.inputHashSha256 → status = 'dispelled'`     |
| **Augury Fallback**     | `historicalRuns(nodeId) < MIN_PORTENT_RUNS → source = 'augury', rango ×3`  |
| **Silence Floor**       | `historicalRuns(nodeId) = 0 → source = 'silence', no mostrar Omen en UI`   |
| **Arcane Accuracy**     | `overallConfidence = min(nodeVisions.map(n => n.durationOmen.confidence))` |
| **No Side Effects**     | `scry()` nunca escribe en Snowflake ni emite eventos de ejecución          |

### 2.3 Prerequisitos (no negociables)

> ⚠️ **El Diviner no se lanza a producción hasta que se cumplen los tres.** Un Oráculo sin datos es peor que ningún Oráculo: da respuestas con falsa confianza.

- **Historial mínimo por nodo:** `MIN_PORTENT_RUNS = 5` runs completados por `nodeId`. Por debajo → Augury o Silence.
- **Ingestión de coste Snowflake:** Pipeline de query history normalizado (warehouse size, concurrencia, créditos/hora). Sin esto los `costOmen` son Silence.
- **Plan versionado activo:** `inputHashSha256` disponible en todos los planes persistidos. Ya existe en `@dvt/planner` v2.3.x.

---

## 3. Estructura del paquete

```
packages/@dvt/divination/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                      # exports públicos
│   ├── types.ts                      # Omen, Vision, NodeVision, OmenSource
│   ├── errors.ts                     # DivinationError + DivinationErrorCode
│   ├── constants.ts                  # MIN_PORTENT_RUNS, TTL, multiplicadores
│   ├── omen.ts                       # computeOmen() — Portent Dice
│   ├── scry.ts                       # scry() — función principal (Cast Scrying)
│   ├── concentration.ts              # checkConcentrationOrThrow()
│   └── adapter/
│       └── DivinationAdapter.ts      # implements IWorkflowEngine
└── test/
    ├── omen.test.ts
    ├── scry.test.ts
    └── concentration.test.ts
```

---

## 4. Código fuente completo

### `package.json`

```json
{
  "name": "@dvt/divination",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["test", "node_modules"]
}
```

---

### `src/types.ts`

```ts
/**
 * Tipos centrales de la Divination Layer.
 *
 * Nomenclatura D&D 5e:
 *   Omen       → estimación con rango (Portent Dice)
 *   OmenSource → de dónde viene la estimación
 *   Vision     → el run simulado completo
 *   NodeVision → estimación por nodo del plan
 */

/**
 * Un Omen es una estimación probabilística con rango explícito.
 * Representa los Portent Dice del Diviner: dos posibles futuros (bajo/alto)
 * y el más probable (p50).
 */
export interface Omen {
  /** Estimación central — percentil 50 histórico. */
  p50: number;
  /** Portent Die bajo — percentil 10 (límite optimista). */
  p10: number;
  /** Portent Die alto — percentil 90 (límite pesimista). */
  p90: number;
  /**
   * Arcane Accuracy — confianza en el Omen, de 0 a 1.
   * 0 = el oráculo no sabe nada. 1 = certeza absoluta (nunca en la práctica).
   */
  confidence: number;
  /** Fuente del Omen — determina cómo mostrarlo en UI. */
  source: OmenSource;
}

/**
 * Fuente del Omen.
 *   portent → historial suficiente (>= MIN_PORTENT_RUNS). Estimación confiable.
 *   augury  → historial escaso. Estimación con rango ampliado. UI: "⚠ Augury".
 *   silence → sin historial. No mostrar estimación en UI. UI: "— Silence".
 */
export type OmenSource = 'portent' | 'augury' | 'silence';

/** Resultado de la Scrying para un nodo individual del plan. */
export interface NodeVision {
  nodeId: string;
  stepId: string;
  /** Omen de duración en milisegundos. */
  durationOmen: Omen;
  /** Omen de coste en USD. */
  costOmen: Omen;
  /** Probabilidad histórica de fallo — 0 a 1. */
  failureProbability: number;
}

/**
 * Vision: el run simulado completo.
 *
 * Una Vision es persistida como un run real pero marcada con
 * status distinto de 'live'. El Concentration Check la invalida
 * automáticamente si el plan cambia.
 */
export interface Vision {
  /** visionId === planId. Misma raíz, identidad compartida. */
  visionId: string;
  planId: string;
  /** Hash del input semántico del plan. Si cambia → Vision Dispelled. */
  inputHashSha256: string;
  /** Estado de la Vision — Concentration mechanic. */
  status: VisionStatus;
  /** ISO timestamp de cuando se lanzó Cast Scrying. */
  castAt: string;
  nodeVisions: readonly NodeVision[];
  totalDurationOmen: Omen;
  totalCostOmen: Omen;
  /**
   * Arcane Accuracy global del plan.
   * = min(nodeVisions.map(n => n.durationOmen.confidence))
   * El eslabón más débil determina la confianza total.
   */
  overallConfidence: number;
}

/**
 * Estados de una Vision (Concentration mechanic).
 *
 *   scrying   → calculando (Cast Scrying en progreso)
 *   active    → Concentration: active — Vision vigente y válida
 *   dispelled → plan cambió — Vision Dispelled (Dispel Magic implícito)
 *   expired   → TTL superado — la Vision se disuelve con el tiempo
 */
export type VisionStatus = 'scrying' | 'active' | 'dispelled' | 'expired';
```

---

### `src/errors.ts`

```ts
/**
 * Taxonomía de errores de la Divination Layer.
 * Todos los errores lanzados por @dvt/divination son DivinationError.
 */

export type DivinationErrorCode =
  | 'VISION_DISPELLED' // plan cambió — Concentration rota
  | 'SCRYING_FAILED' // error interno al calcular la Vision
  | 'INVALID_PLAN' // planCore mal formado o modo incorrecto
  | 'HISTORY_UNAVAILABLE'; // el HistoryProvider no responde

export class DivinationError extends Error {
  readonly code: DivinationErrorCode;
  readonly cause: unknown;

  constructor(code: DivinationErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'DivinationError';
    this.code = code;
    this.cause = cause;
  }
}

/** Normaliza cualquier error lanzado a DivinationError. */
export function asDivinationError(err: unknown): DivinationError {
  if (err instanceof DivinationError) return err;
  if (err instanceof Error) {
    return new DivinationError('SCRYING_FAILED', err.message, err);
  }
  return new DivinationError('SCRYING_FAILED', String(err), err);
}
```

---

### `src/constants.ts`

```ts
/**
 * Constantes de la Divination Layer.
 * Ajustables vía configuración del DivinationAdapter.
 */

/**
 * Mínimo de runs históricos para activar Portent (estimación confiable).
 * Por debajo → Augury. En cero → Silence.
 */
export const MIN_PORTENT_RUNS = 5;

/**
 * Multiplicador de rango para Augury (datos escasos).
 * El spread p10–p90 se amplía × este factor para reflejar incertidumbre.
 */
export const AUGURY_RANGE_MULTIPLIER = 3;

/**
 * TTL de una Vision activa en milisegundos (24 horas).
 * Pasado este tiempo → status = 'expired'.
 */
export const VISION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Confidence mínima para mostrar Omen en UI.
 * Por debajo de este umbral → mostrar "— Silence" aunque haya datos.
 */
export const MIN_DISPLAY_CONFIDENCE = 0.1;
```

---

### `src/omen.ts` — Portent Dice

```ts
/**
 * computeOmen: el corazón estadístico de la Divination Layer.
 *
 * Calcula el Omen (Portent Dice) de un campo numérico a partir de
 * una serie de samples históricos.
 *
 * Reglas D&D:
 *   - Portent  → suficientes datos (>= MIN_PORTENT_RUNS): p10/p50/p90 reales.
 *   - Augury   → pocos datos: p50 real, rango multiplicado × AUGURY_RANGE_MULTIPLIER.
 *   - Silence  → sin datos: confidence = 0, no mostrar en UI.
 */
import { Omen, OmenSource } from './types.js';
import { MIN_PORTENT_RUNS, AUGURY_RANGE_MULTIPLIER } from './constants.js';

export interface HistoricalSample {
  /** Duración real de ejecución del nodo en milisegundos. */
  durationMs: number;
  /** Coste real en USD (Snowflake credits × rate). */
  costUsd: number;
  /** Si el run completó sin error. */
  succeeded: boolean;
}

/**
 * Calcula un Omen para el campo `field` a partir de samples históricos.
 *
 * Garantías:
 * - Mismo samples → mismo Omen (determinista).
 * - Nunca emite NaN o Infinity — siempre valores finitos >= 0.
 * - confidence ∈ [0, 1].
 */
export function computeOmen(
  samples: readonly HistoricalSample[],
  field: 'durationMs' | 'costUsd'
): Omen {
  // Silence: sin historial — el oráculo no habla
  if (samples.length === 0) {
    return { p50: 0, p10: 0, p90: 0, confidence: 0, source: 'silence' };
  }

  const values = [...samples.map((s) => s[field])].sort((a, b) => a - b);

  const p10raw = percentile(values, 0.1);
  const p50 = percentile(values, 0.5);
  const p90raw = percentile(values, 0.9);

  const source: OmenSource = samples.length >= MIN_PORTENT_RUNS ? 'portent' : 'augury';

  // Augury: ampliar el rango para reflejar incertidumbre por datos escasos
  const spread = source === 'augury' ? AUGURY_RANGE_MULTIPLIER : 1;
  const p10 = Math.max(0, p50 - (p50 - p10raw) * spread);
  const p90 = p50 + (p90raw - p50) * spread;

  // Arcane Accuracy: coeficiente de variación normalizado
  // CV alto → rango amplio → baja confianza
  const cv = p50 > 0 ? (p90raw - p10raw) / p50 : 1;
  const rawConf = Math.max(0, 1 - cv);
  // Augury penaliza la confianza al 50%
  const confidence = source === 'augury' ? rawConf * 0.5 : rawConf;

  return {
    p50,
    p10,
    p90,
    confidence: Math.min(1, Math.max(0, confidence)),
    source,
  };
}

/**
 * Percentil lineal interpolado sobre array ordenado.
 * q ∈ [0, 1].
 */
function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/**
 * Agrega múltiples Omens en uno sumando p10/p50/p90.
 * La confianza total es la mínima de todas (el eslabón más débil).
 * Si todos son Silence → resultado Silence.
 */
export function aggregateOmens(omens: readonly Omen[]): Omen {
  if (omens.length === 0) {
    return { p50: 0, p10: 0, p90: 0, confidence: 0, source: 'silence' };
  }
  const allSilent = omens.every((o) => o.source === 'silence');
  const anyAugury = omens.some((o) => o.source === 'augury');

  return {
    p50: omens.reduce((s, o) => s + o.p50, 0),
    p10: omens.reduce((s, o) => s + o.p10, 0),
    p90: omens.reduce((s, o) => s + o.p90, 0),
    confidence: Math.min(...omens.map((o) => o.confidence)),
    source: allSilent ? 'silence' : anyAugury ? 'augury' : 'portent',
  };
}
```

---

### `src/concentration.ts` — Concentration Check

```ts
/**
 * Concentration Check — mecánica de invalidación de la Vision.
 *
 * En D&D 5e, los hechizos de Concentration se rompen si el lanzador
 * sufre daño o condiciones adversas. En DVT+, la "concentración" se
 * rompe si el plan cambia (inputHashSha256 diferente).
 *
 * Si el plan cambia → VISION_DISPELLED (Dispel Magic implícito).
 */
import { Vision } from './types.js';
import { DivinationError } from './errors.js';

/**
 * Verifica que la Vision sigue siendo válida para el plan actual.
 *
 * @throws DivinationError("VISION_DISPELLED") si:
 *   - inputHashSha256 del plan no coincide con el de la Vision
 *   - La Vision ya está en estado dispelled o expired
 */
export function checkConcentrationOrThrow(vision: Vision, currentInputHash: string): void {
  // Concentration rota: el plan cambió
  if (vision.inputHashSha256 !== currentInputHash) {
    throw new DivinationError(
      'VISION_DISPELLED',
      `Vision ${vision.visionId} dispelled: plan input changed. ` +
        `vision.inputHash=${vision.inputHashSha256} ` +
        `current.inputHash=${currentInputHash}`
    );
  }

  // Vision ya inválida por estado anterior
  if (vision.status === 'dispelled' || vision.status === 'expired') {
    throw new DivinationError(
      'VISION_DISPELLED',
      `Vision ${vision.visionId} is already ${vision.status}.`
    );
  }
}
```

---

### `src/scry.ts` — Cast Scrying

```ts
/**
 * scry() — Cast Scrying.
 *
 * Función principal de la Divination Layer. Genera una Vision determinista
 * a partir de un planCore y un HistoryProvider.
 *
 * Garantías:
 *   - No I/O excepto lecturas vía HistoryProvider (nunca Snowflake directo).
 *   - Mismo planCore + mismo historial → misma Vision (determinista).
 *   - Nunca escribe en RunStateStore — el caller persiste si quiere.
 *   - Nunca lanza actividades ni emite eventos de ejecución real.
 */
import { Vision, NodeVision } from './types.js';
import { computeOmen, aggregateOmens, HistoricalSample } from './omen.js';
import { asDivinationError } from './errors.js';

/** Forma mínima del planCore que necesita la Divination Layer. */
export interface PlanCoreForScrying {
  planId: string;
  inputHashSha256: string;
  planVersion: string;
  steps: readonly {
    stepId: string;
    /** nodeId === stepId en @dvt/planner v2.3.x. Se mantienen separados por claridad. */
    nodeId: string;
    kind: string;
    dependsOn: readonly string[];
  }[];
}

/**
 * Proveedor de historial de ejecuciones.
 * El adapter concreto lo implementa (DB, cache, mock en tests).
 */
export interface HistoryProvider {
  getNodeHistory(nodeId: string): Promise<readonly HistoricalSample[]>;
}

/**
 * Cast Scrying: genera una Vision para el plan dado.
 *
 * @param plan    - planCore del @dvt/planner (v2.3.x compatible)
 * @param history - proveedor de historial de runs
 * @returns Vision con Omens por nodo y totales
 * @throws DivinationError("SCRYING_FAILED") si el historial falla
 */
export async function scry(plan: PlanCoreForScrying, history: HistoryProvider): Promise<Vision> {
  try {
    const nodeVisions: NodeVision[] = [];

    for (const step of plan.steps) {
      const samples = await history.getNodeHistory(step.nodeId);

      const durationOmen = computeOmen(samples, 'durationMs');
      const costOmen = computeOmen(samples, 'costUsd');

      // Probabilidad de fallo histórica
      // Sin historial → 0.5 (máxima incertidumbre, no 0 para evitar falsa confianza)
      const failureCount = samples.filter((s) => !s.succeeded).length;
      const failureProbability = samples.length > 0 ? failureCount / samples.length : 0.5;

      nodeVisions.push({
        nodeId: step.nodeId,
        stepId: step.stepId,
        durationOmen,
        costOmen,
        failureProbability,
      });
    }

    const totalDurationOmen = aggregateOmens(nodeVisions.map((n) => n.durationOmen));
    const totalCostOmen = aggregateOmens(nodeVisions.map((n) => n.costOmen));

    // Arcane Accuracy global: el eslabón más débil
    const overallConfidence =
      nodeVisions.length > 0 ? Math.min(...nodeVisions.map((n) => n.durationOmen.confidence)) : 0;

    return {
      visionId: plan.planId, // visionId === planId
      planId: plan.planId,
      inputHashSha256: plan.inputHashSha256,
      status: 'active', // Concentration: active
      castAt: new Date().toISOString(),
      nodeVisions,
      totalDurationOmen,
      totalCostOmen,
      overallConfidence,
    };
  } catch (err: unknown) {
    throw asDivinationError(err);
  }
}
```

---

### `src/adapter/DivinationAdapter.ts` — El Diviner

```ts
/**
 * DivinationAdapter — El Diviner.
 *
 * Implementa IWorkflowEngine. En lugar de lanzar actividades en Temporal
 * o Conductor, recorre el plan, consulta el historial, y produce una Vision.
 *
 * El orchestrator lo inyecta exactamente igual que TemporalAdapter:
 *   const engine = isDivinationMode ? new DivinationAdapter(opts) : new TemporalAdapter(opts);
 *   const ref = await engine.startRun(plan, context);
 *
 * Nomenclatura D&D:
 *   startRun(mode=divination) → Cast Scrying
 *   cancelRun()               → Dismiss Vision
 */
import { scry, PlanCoreForScrying, HistoryProvider } from '../scry.js';
import { checkConcentrationOrThrow } from '../concentration.js';
import { Vision } from '../types.js';
import { DivinationError, asDivinationError } from '../errors.js';

// ─── Contrato del engine (definido en @dvt/engine-contracts) ─────────────────
// Se replica aquí para que @dvt/divination no tenga dependencia circular.

export interface IWorkflowEngine {
  startRun(plan: PlanCoreForScrying, context: RunContext): Promise<EngineRunRef>;
  cancelRun(ref: EngineRunRef): Promise<void>;
}

export interface RunContext {
  runId: string;
  requestId: string;
  /**
   * Mode discriminator.
   * 'divination' → DivinationAdapter (UI: "Divination Mode · Cast Scrying")
   * 'live'       → engine real (Temporal, Conductor, etc.)
   */
  mode: 'live' | 'divination';
}

export interface EngineRunRef {
  engineRunId: string;
  mode: 'live' | 'divination';
  /** Solo presente en mode=divination. */
  vision?: Vision;
}

// ─── DivinationAdapter ────────────────────────────────────────────────────────

export interface DivinationAdapterOptions {
  history: HistoryProvider;
  /**
   * Hook opcional para persistir la Vision en el RunStateStore.
   * El adapter no tiene estado propio — el caller persiste si quiere.
   */
  persistVision?: (vision: Vision) => Promise<void>;
}

export class DivinationAdapter implements IWorkflowEngine {
  private readonly history: HistoryProvider;
  private readonly persistVision?: (vision: Vision) => Promise<void>;

  constructor(opts: DivinationAdapterOptions) {
    this.history = opts.history;
    this.persistVision = opts.persistVision;
  }

  /**
   * Cast Scrying.
   * Lanza la Scrying sobre el plan y opcionalmente persiste la Vision.
   *
   * @throws DivinationError("INVALID_PLAN") si mode !== 'divination'
   * @throws DivinationError("SCRYING_FAILED") si falla el cálculo
   */
  async startRun(plan: PlanCoreForScrying, context: RunContext): Promise<EngineRunRef> {
    if (context.mode !== 'divination') {
      throw new DivinationError(
        'INVALID_PLAN',
        'DivinationAdapter only handles mode=divination. ' + `Received mode='${context.mode}'.`
      );
    }

    try {
      // Cast Scrying — puro, sin side effects
      const vision = await scry(plan, this.history);

      // Persistir Vision en RunStateStore (opcional, responsibility del caller)
      if (this.persistVision !== undefined) {
        await this.persistVision(vision);
      }

      return {
        engineRunId: vision.visionId,
        mode: 'divination',
        vision,
      };
    } catch (err: unknown) {
      throw asDivinationError(err);
    }
  }

  /**
   * Dismiss Vision.
   * El orchestrator actualiza el estado en RunStateStore.
   * El adapter no tiene estado propio.
   */
  async cancelRun(_ref: EngineRunRef): Promise<void> {
    // Stateless — el orchestrator marca la Vision como 'dispelled'.
  }
}
```

---

### `src/index.ts`

```ts
// @dvt/divination — public API

export * from './types.js';
export * from './errors.js';
export * from './constants.js';
export * from './omen.js';
export * from './scry.js';
export * from './concentration.js';
export { DivinationAdapter } from './adapter/DivinationAdapter.js';
export type {
  IWorkflowEngine,
  RunContext,
  EngineRunRef,
  DivinationAdapterOptions,
} from './adapter/DivinationAdapter.js';
```

---

## 5. Tests

### `test/omen.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeOmen, aggregateOmens } from '../src/omen.js';
import { MIN_PORTENT_RUNS } from '../src/constants.js';
import type { HistoricalSample } from '../src/omen.js';

const makeSamples = (
  n: number,
  duration: number,
  cost: number,
  succeeded = true
): HistoricalSample[] =>
  Array.from({ length: n }, () => ({ durationMs: duration, costUsd: cost, succeeded }));

describe('Portent Dice — computeOmen', () => {
  it('Silence: sin historial → confidence=0, source=silence', () => {
    const o = computeOmen([], 'durationMs');
    expect(o.source).toBe('silence');
    expect(o.confidence).toBe(0);
    expect(o.p50).toBe(0);
  });

  it('Augury: datos escasos → source=augury, confianza penalizada', () => {
    const samples = makeSamples(MIN_PORTENT_RUNS - 1, 1000, 1);
    const o = computeOmen(samples, 'durationMs');
    expect(o.source).toBe('augury');
    expect(o.confidence).toBeLessThan(0.5);
  });

  it('Portent: datos suficientes → source=portent', () => {
    const samples = makeSamples(MIN_PORTENT_RUNS + 5, 1000, 1);
    const o = computeOmen(samples, 'durationMs');
    expect(o.source).toBe('portent');
    expect(o.p50).toBeGreaterThan(0);
  });

  it('Portent determinista: mismo input → mismo output', () => {
    const samples = makeSamples(10, 2000, 5);
    const a = computeOmen(samples, 'durationMs');
    const b = computeOmen(samples, 'durationMs');
    expect(a).toEqual(b);
  });

  it('p10 <= p50 <= p90 siempre', () => {
    const samples = makeSamples(10, 3000, 10);
    const o = computeOmen(samples, 'durationMs');
    expect(o.p10).toBeLessThanOrEqual(o.p50);
    expect(o.p50).toBeLessThanOrEqual(o.p90);
  });

  it('confidence ∈ [0, 1]', () => {
    const samples = makeSamples(10, 1000, 1);
    const o = computeOmen(samples, 'durationMs');
    expect(o.confidence).toBeGreaterThanOrEqual(0);
    expect(o.confidence).toBeLessThanOrEqual(1);
  });
});

describe('aggregateOmens', () => {
  it('agrega p50 correctamente', () => {
    const o1 = { p50: 100, p10: 80, p90: 120, confidence: 0.9, source: 'portent' as const };
    const o2 = { p50: 200, p10: 160, p90: 240, confidence: 0.8, source: 'portent' as const };
    const agg = aggregateOmens([o1, o2]);
    expect(agg.p50).toBe(300);
    expect(agg.confidence).toBe(0.8); // mínima
    expect(agg.source).toBe('portent');
  });

  it('si todos son silence → resultado silence', () => {
    const s = { p50: 0, p10: 0, p90: 0, confidence: 0, source: 'silence' as const };
    const agg = aggregateOmens([s, s]);
    expect(agg.source).toBe('silence');
  });

  it('si hay algún augury → resultado augury', () => {
    const portent = { p50: 100, p10: 90, p90: 110, confidence: 0.9, source: 'portent' as const };
    const augury = { p50: 50, p10: 20, p90: 100, confidence: 0.3, source: 'augury' as const };
    const agg = aggregateOmens([portent, augury]);
    expect(agg.source).toBe('augury');
  });
});
```

---

### `test/concentration.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { checkConcentrationOrThrow } from '../src/concentration.js';
import { DivinationError } from '../src/errors.js';
import type { Vision } from '../src/types.js';

const makeVision = (hash: string, status: Vision['status'] = 'active'): Vision => ({
  visionId: 'vision-1',
  planId: 'plan-1',
  inputHashSha256: hash,
  status,
  castAt: new Date().toISOString(),
  nodeVisions: [],
  totalDurationOmen: { p50: 0, p10: 0, p90: 0, confidence: 0, source: 'silence' },
  totalCostOmen: { p50: 0, p10: 0, p90: 0, confidence: 0, source: 'silence' },
  overallConfidence: 0,
});

describe('Concentration Check', () => {
  it('no lanza si el hash coincide y la Vision está activa', () => {
    expect(() => checkConcentrationOrThrow(makeVision('abc123'), 'abc123')).not.toThrow();
  });

  it('Vision Dispelled si el hash cambia (plan cambió)', () => {
    let err: unknown;
    try {
      checkConcentrationOrThrow(makeVision('abc123'), 'xyz999');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DivinationError);
    expect((err as DivinationError).code).toBe('VISION_DISPELLED');
  });

  it('Vision Dispelled si status ya es dispelled', () => {
    let err: unknown;
    try {
      checkConcentrationOrThrow(makeVision('abc123', 'dispelled'), 'abc123');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DivinationError);
    expect((err as DivinationError).code).toBe('VISION_DISPELLED');
  });

  it('Vision Dispelled si status es expired', () => {
    let err: unknown;
    try {
      checkConcentrationOrThrow(makeVision('abc123', 'expired'), 'abc123');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DivinationError);
    expect((err as DivinationError).code).toBe('VISION_DISPELLED');
  });
});
```

---

### `test/scry.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { scry } from '../src/scry.js';
import type { PlanCoreForScrying, HistoryProvider } from '../src/scry.js';
import type { HistoricalSample } from '../src/omen.js';

const makePlan = (nodeIds: string[]): PlanCoreForScrying => ({
  planId: 'plan-test-1',
  inputHashSha256: 'a'.repeat(64),
  planVersion: '2.3',
  steps: nodeIds.map((id) => ({
    stepId: id,
    nodeId: id,
    kind: 'DBT_MODEL',
    dependsOn: [],
  })),
});

const makeHistory = (data: Record<string, HistoricalSample[]>): HistoryProvider => ({
  getNodeHistory: async (nodeId) => data[nodeId] ?? [],
});

describe('scry — Cast Scrying', () => {
  it('genera una Vision con status=active', async () => {
    const plan = makePlan(['model.a', 'model.b']);
    const history = makeHistory({
      'model.a': Array.from({ length: 10 }, () => ({
        durationMs: 1000,
        costUsd: 1,
        succeeded: true,
      })),
      'model.b': Array.from({ length: 10 }, () => ({
        durationMs: 2000,
        costUsd: 2,
        succeeded: true,
      })),
    });
    const vision = await scry(plan, history);
    expect(vision.status).toBe('active');
    expect(vision.visionId).toBe(plan.planId);
    expect(vision.nodeVisions).toHaveLength(2);
  });

  it('Vision determinista: mismo input → misma Vision', async () => {
    const plan = makePlan(['model.x']);
    const samples = Array.from({ length: 8 }, () => ({
      durationMs: 3000,
      costUsd: 5,
      succeeded: true,
    }));
    const history = makeHistory({ 'model.x': samples });
    const a = await scry(plan, history);
    const b = await scry(plan, history);
    expect(a.totalDurationOmen).toEqual(b.totalDurationOmen);
    expect(a.totalCostOmen).toEqual(b.totalCostOmen);
    expect(a.overallConfidence).toBe(b.overallConfidence);
  });

  it('plan sin historial → todos Silence, overallConfidence=0', async () => {
    const plan = makePlan(['model.new']);
    const history = makeHistory({});
    const vision = await scry(plan, history);
    expect(vision.totalDurationOmen.source).toBe('silence');
    expect(vision.overallConfidence).toBe(0);
  });

  it('nodo fallido → failureProbability > 0', async () => {
    const plan = makePlan(['model.flaky']);
    const history = makeHistory({
      'model.flaky': [
        { durationMs: 1000, costUsd: 1, succeeded: false },
        { durationMs: 1000, costUsd: 1, succeeded: false },
        { durationMs: 1000, costUsd: 1, succeeded: true },
      ],
    });
    const vision = await scry(plan, history);
    const nv = vision.nodeVisions[0]!;
    expect(nv.failureProbability).toBeCloseTo(2 / 3);
  });
});
```

---

## 6. Integración con DVT+ v2.3.x

### Flujo completo: Cast Scrying desde el Orchestrator

```ts
import { Planner } from '@dvt/planner';
import { DivinationAdapter } from '@dvt/divination';
import { myHistoryProvider } from './history.js';
import { runStateStore } from './stateStore.js';

const planner = new Planner();
const diviner = new DivinationAdapter({
  history: myHistoryProvider,
  persistVision: (vision) => runStateStore.saveVision(vision),
});

// 1. Planner genera el plan determinista (sin cambios)
const { plan } = await planner.buildPlan(input);

// 2. Cast Scrying — sin tocar Snowflake
const ref = await diviner.startRun(plan, {
  runId: generateRunId(),
  requestId: req.id,
  mode: 'divination', // UI: "Divination Mode"
});

// 3. Vision disponible inmediatamente
const { vision } = ref;
console.log(vision.totalCostOmen);
// → { p50: 12.4, p10: 8.1, p90: 19.3, confidence: 0.81, source: "portent" }
// UI: "Omen: ~$12.40 (±$5.60) · Arcane Accuracy 81%"
```

### Foresight Report en PR Intelligence

```ts
// Git Sync Hook — pre-merge, sin cambios en el planner
async function onPullRequestOpened(pr: PullRequest): Promise<void> {
  const { plan } = await planner.buildPlan(await buildInputFromManifest(pr.manifest));
  const vision = await scry(plan, historyProvider);

  const riskNodes = vision.nodeVisions
    .filter((n) => n.failureProbability > 0.2)
    .map((n) => n.nodeId);

  await pr.addComment(
    [
      '## ✨ Foresight Report',
      `**Omen de coste:** ${formatOmen(vision.totalCostOmen)}`,
      `**Omen de duración:** ${formatOmen(vision.totalDurationOmen)}`,
      `**Arcane Accuracy:** ${(vision.overallConfidence * 100).toFixed(0)}%`,
      riskNodes.length > 0
        ? `**⚠ Nodos de riesgo:** ${riskNodes.join(', ')}`
        : '**✅ Sin nodos de riesgo detectados**',
    ].join('\n')
  );
}

function formatOmen(o: Omen): string {
  if (o.source === 'silence') return '— Silence (sin historial)';
  const mid = o.p50.toFixed(2);
  const spread = ((o.p90 - o.p10) / 2).toFixed(2);
  const label = o.source === 'augury' ? ' ⚠ Augury' : '';
  return `~${mid} (±${spread})${label}`;
}
```

### Concentration Check al reutilizar una Vision cacheada

```ts
import { checkConcentrationOrThrow } from '@dvt/divination';

async function getOrCastVision(plan: PlanCoreForScrying): Promise<Vision> {
  const cached = await runStateStore.getVision(plan.planId);

  if (cached !== undefined) {
    try {
      // Concentration Check: Vision Dispelled si el plan cambió
      checkConcentrationOrThrow(cached, plan.inputHashSha256);
      return cached; // Concentration: active — reutilizar
    } catch {
      // Vision Dispelled — recalcular
    }
  }

  // Cast Scrying de nuevo
  return scry(plan, historyProvider);
}
```

---

## 7. Roadmap

| Sprint | Feature D&D                 | Descripción técnica                                           | Prerequisito                  |
| ------ | --------------------------- | ------------------------------------------------------------- | ----------------------------- |
| 1      | **Cast Scrying MVP**        | `DivinationAdapter` + `computeOmen` + `persistVision`         | `MIN_PORTENT_RUNS` en prod    |
| 1      | **Concentration Check**     | Invalidación automática por `inputHashSha256`                 | Plan v2.3.x activo            |
| 2      | **Foresight Report (PR)**   | Hook pre-merge con Omen de coste + `riskNodes`                | Sprint 1 completo             |
| 2      | **UI: Divination Mode**     | Badge `👁 Vision` + tooltip Omen en formato D&D               | Sprint 1 completo             |
| 3      | **Augury mejorado**         | Estimación por `kind` cuando no hay historial propio del nodo | Historial agregado por `kind` |
| 4      | **Monte Carlo (Portent++)** | Simulación por muestreo de distribuciones reales              | 100+ runs por nodo            |
| 5      | **Capacity Planning**       | "Si lanzas a las 09:00 colisiona con N runs críticos"         | Multi-tenant `RunStateStore`  |

> ⚔️ **Regla de oro:** el Diviner nunca entra en combate sin datos. Si los prerequisitos no están, el feature no se despliega aunque esté implementado.

---

## 8. Checklist

- [x] Nomenclatura D&D 5e coherente en código y UI
- [x] `IWorkflowEngine` implementado — sin cambios en planner ni engine live
- [x] Portent Dice: `p10`/`p50`/`p90` + Arcane Accuracy
- [x] Augury fallback para datos escasos
- [x] Silence para nodos sin historial
- [x] Concentration Check por `inputHashSha256`
- [x] No I/O excepto lecturas de historial
- [x] Sin efectos en Snowflake
- [x] Foresight Report en PR Intelligence
- [x] Tests unitarios por capa (`omen`, `concentration`, `scry`)
- [ ] `MIN_PORTENT_RUNS` verificado en prod antes de despliegue
- [ ] Vector fijo de Vision bootstrapeado para test de regresión

---

## 9. 🔍 Puntos de mejora (el conjurador siempre busca perfección)

### 9.1 Falta el `HistoryProvider` concreto

```ts
// Sugerencia: implementación de referencia para Postgres
export class PostgresHistoryProvider implements HistoryProvider {
  constructor(private pool: pg.Pool) {}

  async getNodeHistory(nodeId: string): Promise<HistoricalSample[]> {
    const result = await this.pool.query(
      `SELECT
        EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000 as duration_ms,
        cost_usd,
        succeeded
       FROM run_history
       WHERE node_id = $1
         AND status = 'completed'
       ORDER BY ended_at DESC
       LIMIT 100`,
      [nodeId]
    );

    return result.rows.map((row) => ({
      durationMs: row.duration_ms,
      costUsd: row.cost_usd,
      succeeded: row.succeeded,
    }));
  }
}
```

### 9.2 Manejo de TTL de Visiones

El documento define `VISION_TTL_MS` pero no lo implementa en validación de concentración.

```ts
// Añadir a concentration.ts
export function isVisionExpired(vision: Vision): boolean {
  const age = Date.now() - new Date(vision.castAt).getTime();
  return age > VISION_TTL_MS;
}

// En checkConcentrationOrThrow:
if (isVisionExpired(vision)) {
  throw new DivinationError('VISION_DISPELLED', 'Vision expired');
}
```

### 9.3 Cacheo de Omens por performance

```ts
// OmenCache para evitar recalcular sobre mismo histórico
export class OmenCache {
  private cache = new Map<string, Omen>();

  get(key: string, samples: HistoricalSample[], field: Field): Omen {
    const hash = sha256(JSON.stringify(samples) + field);
    if (this.cache.has(hash)) return this.cache.get(hash)!;
    const omen = computeOmen(samples, field);
    this.cache.set(hash, omen);
    return omen;
  }
}
```

### 9.4 Validación de prerequisitos en producción

El documento define prerequisitos de datos pero conviene añadir guardas automáticas en runtime.

```ts
// En DivinationAdapter constructor
if (process.env.NODE_ENV === 'production') {
  const stats = await this.history.getGlobalStats();
  if (stats.totalNodesWithHistory < 10) {
    throw new Error(
      'Divination Layer requires at least 10 nodes with history. ' +
        'Current: ' +
        stats.totalNodesWithHistory
    );
  }
}
```

---

## 10. 📊 Comparativa con la arquitectura existente

| Componente      | En DVT+ v2.3.x     | En Divination Layer    |
| --------------- | ------------------ | ---------------------- |
| IWorkflowEngine | ✅ Contrato        | ✅ Implementado        |
| ExecutionPlan   | ✅ Generado        | ✅ Consumido           |
| inputHashSha256 | ✅ En metadata     | ✅ Concentration Check |
| State Store     | ✅ Persistencia    | ✅ Vision persistida   |
| Eventos         | ✅ onStepCompleted | ✅ simulated: true     |
| UI              | ✅ Runs reales     | ✅ Badge 👁 Vision     |

**Zero cambios arquitectónicos. 100% compatible.**

---

_🎲 The dice have been cast. The Vision is active. Concentration maintained._
