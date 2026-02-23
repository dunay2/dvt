Mapa de integraciones
Lo que YA existe (no reimplementar)
Concepto de "mejora 2" Equivalente actual Notas
validateDag + topological sort plan-interpreter/dagAnalyzer.ts DVT+ es superior — produce execution layers, no solo orden
RFC 8785 JCS engine/src/utils/jcs.ts Implementación nativa, sin dependencia externa. Más robusta que json-canonicalize
EngineCapabilities IProviderAdapter.capabilities?() + capabilities.schema.json Ya existe y está validado en runtime
Integración A — @dvt/dsl (Gateway DSL v1)
Impacto: alto. Esfuerzo: bajo. Conflicto: ninguno.

El sistema actual no tiene ningún concepto de gateway ni condicional. ExecutionPlan.steps ya es Array<{stepId, kind?, dependsOn?} & Record<string, unknown>> — los campos type y gateway caben sin romper el contrato.

Archivos a crear:

packages/@dvt/dsl/
src/
v1/
ast.ts ← DslV1Expression, DslV1Operator
parser.ts ← parseDslV1(expression: string): DslV1Expression
evaluator.ts ← evaluateDslV1(expr, ctx): boolean
index.ts
package.json ← name: "@dvt/dsl", deps: @dvt/contracts: workspace:\*
tsconfig.json
Cambio en ExecutionPlan.steps (additive, non-breaking):

// executionPlan.ts — campo opcional, no rompe planes existentes
steps: Array<{
stepId: string;
kind?: string;
type?: 'task' | 'gateway'; // ← nuevo
gateway?: { // ← nuevo
dslVersion: '1.0';
expression: string;
};
dependsOn?: string[];
} & Record<string, unknown>>;
Quién usa evaluateDslV1 en runtime: RunPlanWorkflow.ts en adapter-temporal. Antes de ejecutar las dependencias downstream de un step type='gateway', el workflow evalúa la expresión con el output del step previo como contexto.

Una corrección vs "mejora 2": el test parseDslV1("a = 1 AND b = 2") pasa pero por razón incorrecta — lanza en el parser de literal, no por detección de AND. Esto es un detalle cosmético; el comportamiento (rechazo) es correcto.

Integración B — inputHashSha256 en ExecutionPlan.metadata
Impacto: trazabilidad alta. Esfuerzo: mínimo. Conflicto: ninguno.

El jcsCanonicalize ya existe en el engine. El planner (externo o futuro @dvt/planner) lo usaría para hashear PlannerInputEnvelope y guardarlo en el plan.

Cambio en executionPlan.ts (additive):

metadata: {
// ... campos existentes ...
/\*\*

- SHA-256 hex of the JCS-canonicalized PlannerInputEnvelope.
- Allows deterministic re-generation: same input → same hash.
- ADR-0003: canonicalization standard.
  \*/
  inputHashSha256?: string;
  };
  El engine no valida este campo — es informacional para trazabilidad y reproducibilidad.

Integración C — Extraer jcs.ts a @dvt/canonical
Impacto: habilita A y B desde fuera del engine. Esfuerzo: refactoring limpio.

Actualmente jcsCanonicalize está en packages/@dvt/engine/src/utils/jcs.ts — es internal al engine. Si el planner (o cualquier consumer externo) necesita canonicalizar, no puede importar del engine.

Propuesta:

packages/@dvt/canonical/
src/
jcs.ts ← mover engine/src/utils/jcs.ts aquí
sha256.ts ← createHash('sha256') + hex digest
index.ts
package.json ← name: "@dvt/canonical", deps: node:crypto only
tsconfig.json
En engine: cambiar el import de ./utils/jcs.js a @dvt/canonical. Los tests del engine siguen pasando — es un rename de import.

Ventaja: @dvt/planner, @dvt/dsl (si necesita), y el engine comparten la misma implementación JCS sin duplicación.

Integración D — PlannerInputEnvelope en @dvt/contracts
Impacto: fundación para @dvt/planner futuro. Esfuerzo: schema Zod, sin lógica.

Actualmente no existe ningún tipo que represente lo que va INTO el planner. Si se va a construir @dvt/planner, necesita un contrato de entrada.

Propuesta: Añadir a packages/@dvt/contracts/src/ un archivo planner-input.ts:

// planner-input.ts — esquema de entrada al planner
export const WorkflowStepTypeSchema = z.enum(['task', 'gateway']);

export const WorkflowStepSchema = z.object({
stepId: z.string().min(1),
type: WorkflowStepTypeSchema,
dependsOn: z.array(z.string()),
gateway: z.object({
dslVersion: z.literal('1.0'),
expression: z.string().min(1),
}).optional(),
});

export const PlannerInputEnvelopeSchema = z.object({
version: z.literal('1.0'),
workflowSpec: z.object({
workflowId: z.string().min(1),
steps: z.array(WorkflowStepSchema).min(1),
}),
executionIntent: z.object({
type: z.enum(['full', 'partial', 'resume']),
selection: z.array(z.string()).optional(),
}),
environment: z.object({
target: z.enum(['production', 'staging', 'test']),
}),
engineHints: z.object({
requiredCapabilities: z.array(z.string()),
}).optional(),
});

export type PlannerInputEnvelope = z.infer<typeof PlannerInputEnvelopeSchema>;
Nota: requiredCapabilities aquí mapea a ExecutionPlan.metadata.requiresCapabilities — el planner valida capabilities en build-time, el engine las verifica en runtime. No hay duplicación.

Integración E — ESLint no-restricted-imports
Impacto: enforcement de soberanía. Esfuerzo: 5 líneas. Conflicto: ninguno.

El eslint.config.cjs actual ya tiene reglas de determinismo complejas, pero no tiene guardia de soberanía del planner.

Añadir en la sección del engine y adapters:

// En eslint.config.cjs — sección para packages/@dvt/adapter-temporal
{
files: ['packages/@dvt/adapter-temporal/**/*.ts', 'packages/@dvt/adapter-postgres/**/*.ts'],
rules: {
'no-restricted-imports': ['error', {
patterns: [{
group: ['@dvt/planner', '@dvt/planner/*'],
message: 'Engine adapters MUST NOT import @dvt/planner. Planner sovereignty is mandatory (ADR-001).',
}],
}],
},
},
Orden de implementación recomendado

1. Integración C (@dvt/canonical) ← habilita todo lo demás, bajo riesgo
2. Integración A (@dvt/dsl) ← nuevo package independiente
3. Integración B (inputHashSha256) ← 1 línea en executionPlan.ts
4. Integración D (PlannerInputEnvelope) ← schema en contracts, sin lógica
5. Integración E (ESLint) ← 5 líneas en eslint.config.cjs
   Lo que NO se integra y por qué
   Concepto Razón
   AttemptStore El IRunStateStore es más rico: lifecycle completo, snapshots, outbox, señales
   CanonicalEvent (3 tipos) El sistema tiene 12 tipos de RunEvent con state machine completa — no son equivalentes
   topologicalOrder de "mejora 2" El planExecutionLayers del plan-interpreter es superior: produce capas de paralelismo, no solo orden lineal
   Nueva estructura de carpetas No aplica — seguimos en c:\dvt
   Puntuación post-integración esperada
   Área Antes Con A+B+C+D+E
   Soberanía del planner (enforcement) 6 9
   Trazabilidad del plan 7 9
   Capacidad de branching condicional 0 8
   Compartimentación (canonical utils) 5 9
