# Zod Contract Schemas - Integration Guide

This document tracks the integration of Zod as the single source of truth for workflow engine contracts.

---

## ✅ Current Status

| Component                   | Status        | Location                                                   |
| --------------------------- | ------------- | ---------------------------------------------------------- |
| **ExecutionPlan Schema**    | ✅ Integrated | `engine/src/contracts/schemas/execution-plan.schema.ts`    |
| **ValidationReport Schema** | ✅ Integrated | `engine/src/contracts/schemas/validation-report.schema.ts` |
| **Schema Index**            | ✅ Integrated | `engine/src/contracts/schemas/index.ts`                    |
| **Tests**                   | ✅ Integrated | `engine/test/types/contract-schemas.test.ts`               |
| **Runtime Validation**      | ⏳ Phase 2    | Points of entry (API boundaries)                           |
| **Documentation**           | ⏳ Phase 2    | Update component docs with Zod examples                    |

---

## 🗂️ Zod Schemas Structure

```
engine/src/contracts/schemas/
├── index.ts                      # Central export
├── execution-plan.schema.ts      # ExecutionPlan contract
└── validation-report.schema.ts   # ValidationReport contract
```

### Exported Types & Functions

**From `engine/src/contracts/schemas/`:**

```typescript
// ExecutionPlan
- ExecutionPlanSchema
- ExecutionPlanMetadataSchema
- ExecutionPlanStepSchema
- parseExecutionPlan()         // throws on error
- safeParseExecutionPlan()     // returns Result type
- type ExecutionPlan
- type ExecutionPlanMetadata
- type ExecutionPlanStep

// ValidationReport
- ValidationReportSchema
- ValidationStatusSchema
- CapabilityCheckSchema
- ValidationErrorSchema
- ValidationWarningSchema
- parseValidationReport()      // throws on error
- safeParseValidationReport()  // returns Result type
- type ValidationReport
- type ValidationStatus
- type CapabilityCheck
- type ValidationError
- type ValidationWarning
```

---

## 🧪 Testing

### Run Contract Schema Tests

```bash
# Test Zod schemas
pnpm test -- contract-schemas.test.ts

# Run all tests
pnpm test
```

### Test Coverage

- ✅ Valid plan acceptance (minimal, full, version formats, fallback behaviors, adapters)
- ✅ Invalid plan rejection (empty fields, bad versions, missing required fields)
- ✅ Extra properties rejection (strict mode)
- ✅ Type inference verification
- ✅ Error message clarity
- ✅ SafeParse vs Parse behavior

---

## 📖 Schema Examples

### ExecutionPlan

```typescript
import { parseExecutionPlan } from 'engine/src/contracts/schemas';

const plan = parseExecutionPlan({
  metadata: {
    planId: 'workflow-001',
    planVersion: 'v1.0',
    targetAdapter: 'temporal',
    requiresCapabilities: ['timeout_handling', 'retries'],
    fallbackBehavior: 'degrade',
  },
  steps: [{ stepId: 'step-1' }, { stepId: 'step-2' }],
});

// TypeScript infers: ExecutionPlan type
console.log(plan.metadata.planId); // ✓ string
```

### ValidationReport

```typescript
import { parseValidationReport } from 'engine/src/contracts/schemas';

const report = parseValidationReport({
  planId: 'workflow-001',
  planVersion: 'v1.0',
  generatedAt: new Date().toISOString(),
  targetAdapter: 'temporal',
  adapterVersion: '1.13.0',
  status: 'VALID',
  adapterCapabilities: ['timeout_handling', 'retries'],
  errors: [],
  warnings: [],
});

// TypeScript infers: ValidationReport type
console.log(report.status); // ✓ 'VALID' | 'WARNINGS' | 'ERRORS'
```

---

## 🚀 Next Phases

### Phase 2: Runtime Validation Integration (Next Sprint)

**Goal**: Add validation at all API boundaries

```typescript
// API Layer Example
import { parseExecutionPlan } from 'engine/src/contracts/schemas';

app.post('/workflows/validate', (req) => {
  try {
    const plan = parseExecutionPlan(req.body);
    // Plan is now validated and typed
    return { valid: true, plan };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});
```

**Files to update**:

- `engine/src/adapters/IWorkflowEngineAdapter.v1.ts` - Add validation wrapper
- `engine/src/core/types.ts` - Import types from schemas
- Any API boundary handlers (TODO: identify exact locations)

### Phase 3: Documentation Generation (Following Sprint)

- Generate JSON Schema from Zod for OpenAPI specs
- Create TypeDoc documentation
- Integrate with contract versioning docs

### Phase 4: Golden Paths (Depends on Issue #10)

- Validate all example execution plans (when issued created)
- Validate all validation reports
- CI gate: `pnpm test:contracts` fails if fixtures invalid

---

## 🔗 Related Issues

- **Issue #2**: TypeScript type alignment ✅ (This work contributes)
- **Issue #5**: TemporalAdapter MVP (Will use Zod schemas for validation)
- **Issue #10**: Golden Paths (Will provide fixtures to validate)

---

## 📝 Notes

- Zod as single source of truth enables:
  - ✅ Automatic type inference (no duplication)
  - ✅ Runtime validation at boundaries
  - ✅ Better error messages to users
  - ✅ Optional JSON Schema generation (for OpenAPI/docs)

- No breaking changes:
  - Existing `contract-validation.test.ts` still passes
  - TypeScript types in `engine/src/types/contracts.ts` remain compatible
  - Schemas are opt-in at API boundaries (non-invasive)

---

**Last Updated**: 2026-02-12  
**Version**: 1.0 (Zod Integration Phase 1)

- Flujo de trabajo con Zod
- Comparación antes/después

---

## 📚 Existing documentation (reference)

### Normative contracts

- [IWorkflowEngine.v1.1.md](architecture/engine/contracts/engine/IWorkflowEngine.v1.1.md) - Interface del motor
- [ExecutionSemantics.v1.md](architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Semántica de ejecución
- [SignalsAndAuth.v1.1.md](architecture/engine/contracts/engine/SignalsAndAuth.v1.1.md) - Señales y autorización
- [RunEvents.v1.1.md](architecture/engine/contracts/engine/RunEvents.v1.1.md) - Eventos de ejecución

### Policies & guidelines

- [VERSIONING.md](architecture/engine/VERSIONING.md) - Política de versionado de contratos
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines para contribuir a documentación
- [INDEX.md](architecture/engine/INDEX.md) - Índice de arquitectura del engine

### Existing JSON Schemas

- [capabilities.schema.json](architecture/engine/contracts/capabilities/capabilities.schema.json)
- [validation-report.schema.json](architecture/engine/contracts/capabilities/validation-report.schema.json)
- Event schemas en [contracts/engine/events/](architecture/engine/contracts/engine/events/)

### TypeScript Types

- [engine/src/types/](../engine/src/types/) - Current TypeScript types
- [engine/src/types/README.md](../engine/src/types/README.md) - Documentación de tipos

---

## 🎯 Recommended reading paths

### For decision-makers (Product Manager, Tech Lead)

1. ✅ [CONTRACTS_EXECUTIVE_SUMMARY.md](CONTRACTS_EXECUTIVE_SUMMARY.md) - **5 min**
2. 👀 [ZOD_ARCHITECTURE.mmd](architecture/engine/contracts/ZOD_ARCHITECTURE.mmd) - Diagramas - **2 min**
3. 🚀 Probar [setup.sh](../examples/contracts-with-zod/setup.sh) - **5 min**
4. 💡 Decide: Proceed with Phase 1?

**Total: 15 minutos**

---

### For developers (implementation)

1. 👓 [examples/contracts-with-zod/README.md](../examples/contracts-with-zod/README.md) - **10 min**
2. 💻 Revisar schemas de ejemplo:
   - [execution-plan.schema.ts](../examples/contracts-with-zod/schemas/execution-plan.schema.ts)
   - [validation-report.schema.ts](../examples/contracts-with-zod/schemas/validation-report.schema.ts)
3. 🧪 Ejecutar ejemplos:
   ```bash
   pnpm tsx examples/contracts-with-zod/validate-fixture.ts
   pnpm tsx examples/contracts-with-zod/generate-json-schemas.ts
   ```
4. 📖 [TOOLING_RECOMMENDATIONS.md](TOOLING_RECOMMENDATIONS.md) - Plan detallado - **15 min**
5. 🏗️ Empezar migración de primer contrato

**Total: 45 minutos para estar listo**

---

### For architects (technical evaluation)

1. 📊 [TOOLING_RECOMMENDATIONS.md](TOOLING_RECOMMENDATIONS.md) - **15 min**
2. 🏗️ [ZOD_ARCHITECTURE.mmd](architecture/engine/contracts/ZOD_ARCHITECTURE.mmd) - **5 min**
3. 💻 Revisar código de ejemplo completo - **20 min**
4. 🔍 Comparar con:
   - [VERSIONING.md](architecture/engine/VERSIONING.md) - Compatibilidad con política actual
   - [Existing contracts](architecture/engine/contracts/) - Real-world use cases
5. 📝 Evaluar:
   - ✅ Ventajas vs enfoque actual
   - ⚠️ Riesgos de migración
   - 💰 ROI estimado

**Total: 1 hora para análisis completo**

---

## 📋 Decision checklist

Use this checklist to decide whether to proceed with Zod:

### Criterios de Éxito

- [ ] ¿Tenemos problemas de desincronización entre tipos, schemas y docs? → **Sí = +1 punto para Zod**
- [ ] ¿Pasamos >2 horas/semana escribiendo validaciones manuales? → **Sí = +1 punto**
- [ ] ¿Tenemos >10 contratos que mantener? → **Sí = +1 punto**
- [ ] ¿Necesitamos validación runtime en producción? → **Sí = +1 punto**
- [ ] ¿El equipo sabe TypeScript? → **Sí = +1 punto**

**Puntuación**:

- **4-5 puntos**: Zod es muy recomendable, procede con PoC
- **2-3 puntos**: Zod ayudaría, evalúa ROI específico
- **0-1 puntos**: Quizá el enfoque actual es suficiente

### Risks to validate

- [ ] Does Zod support all our use cases? → **Review examples**
- [ ] ¿Performance de validación runtime es aceptable? → **Benchmark en PoC**
- [ ] ¿Equipo tiene tiempo para migración gradual? → **Plan de 2-4 semanas**
- [ ] ¿CI/CD está listo para nuevas validaciones? → **Actualizar pipelines (4h)**

---

## 🆘 Frequently asked questions

### Do we have to rewrite everything at once?

**No.** Migración gradual es posible y recomendada. Empieza con 2-3 contratos críticos.

### Can I use Zod and keep JSON Schema?

**Sí.** Zod puede generar JSON Schema automáticamente con `zod-to-json-schema`.

### What happens to existing TypeScript types?

**Puedes mantener compatibilidad** durante la transición. Ver ejemplo en [execution-plan.schema.ts](../examples/contracts-with-zod/schemas/execution-plan.schema.ts).

### ¿Performance de Zod es un problema?

**Depends on the use case**. For normal APIs it's sufficient. For high-throughput paths, Zod can compile to faster validators or you can use AJV.

### ¿Cuánto tiempo toma la migración?

**PoC: 1-2 días** → **Contratos core: 1 semana** → **Completa: 2-4 semanas** (gradual)

---

## 🚀 Next steps

### Option A: Quick PoC (Recommended)

```bash
# 1. Instalar dependencias (2 min)
pnpm add zod tsx
pnpm add -D zod-to-json-schema

# 2. Correr ejemplo (3 min)
pnpm tsx examples/contracts-with-zod/validate-fixture.ts

# 3. Presentar a equipo (30 min)
# - Mostrar CONTRACTS_EXECUTIVE_SUMMARY.md
# - Demo de validate-fixture.ts
# - Discutir ROI

# 4. Decide: Proceed with Phase 1?
```

### Option B: Deep analysis first

1. Leer [TOOLING_RECOMMENDATIONS.md](TOOLING_RECOMMENDATIONS.md) completo
2. Evaluar alternativas (AJV standalone, TypeBox, etc.)
3. Hacer benchmark de performance
4. Propuesta formal con análisis costo-beneficio

---

## 📞 Contacto y Feedback

Para preguntas o feedback sobre estos documentos:

1. **Issues**: Abre un issue en GitHub con label `contracts` o `tooling`
2. **PRs**: Pull requests bienvenidos para mejorar estos docs
3. **Discusión**: Usa GitHub Discussions para preguntas abiertas

---

**Last updated**: 12 February 2026  
**Author**: Automated workspace analysis (DVT)  
**Review**: Pending team review

---

## 🔗 Links Rápidos

### Contratos y Validación:

- 📊 [Resumen Ejecutivo](CONTRACTS_EXECUTIVE_SUMMARY.md) ← **Empieza aquí**
- 🛠️ [Recomendaciones Técnicas](TOOLING_RECOMMENDATIONS.md)
- 💻 [Código de Ejemplo](../examples/contracts-with-zod/)
- 🏗️ [Diagramas](architecture/engine/contracts/ZOD_ARCHITECTURE.mmd)

### Herramientas Adicionales:

- 🔧 [**Catálogo Completo de Herramientas**](ADDITIONAL_TOOLING_CATALOG.md) ← **NUEVO: 30+ herramientas**
  - Database (Prisma, Drizzle)
  - Testing (Playwright, MSW, k6)
  - Observability (OpenTelemetry, Sentry)
  - API Development (tRPC)
  - DevOps (Docker Compose, CI/CD)

### Documentación Existente:

- 📚 [Contratos Existentes](architecture/engine/contracts/)
- 🔄 [Política de Versionado](architecture/engine/VERSIONING.md)
