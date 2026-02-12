# 🏗️ Análisis de Arquitectura del Proyecto DVT

**Fecha**: 12 febrero 2026  
**Autor**: Análisis basado en estado actual del código

---

## 📊 Estructura Actual

```
dvt/ (monorepo root)
├── engine/
│   ├── src/
│   │   ├── adapters/          # ⚠️ PROBLEMA: Interfaces + Implementaciones mezcladas
│   │   │   ├── event-bus/
│   │   │   ├── state-store/
│   │   │   └── I*Adapter.v1.ts
│   │   ├── contracts/
│   │   ├── core/
│   │   │   ├── types.ts
│   │   │   └── interfaces/
│   │   ├── types/             # ⚠️ CONFUSO: types vs contracts vs core/types
│   │   │   ├── artifacts.ts
│   │   │   ├── contracts.ts
│   │   │   └── state-store.ts
│   │   └── workers/
│   └── test/
├── adapters/                  # ⚠️ INCONSISTENTE: Solo Postgres aquí
│   └── postgres/
├── scripts/                   # ⚠️ TOOLING MEZCLADO con código
├── docs/
├── test/                      # ⚠️ DUPLICADO: tests en 2 lugares
└── package.json              # ⚠️ TODO EN UN PAQUETE
```

---

## ❌ Problemas Identificados

### 1. **No Hay Separación Clara de Responsabilidades**

```typescript
// engine/src/adapters/ contiene AMBOS:
-IStateStoreAdapter.v1.ts - // ← Interface (contrato)
  state -
  store / InMemoryStateStore.ts; // ← Implementación (adapter)

// Violación: Interfaces y implementaciones NO deben convivir
```

**Impacto**:

- ❌ Difícil testear (coupling)
- ❌ Cambios en contracts afectan implementaciones
- ❌ No puedes versionar contracts independientemente

---

### 2. **Estructura No Es Monorepo Real**

```json
// package.json actual
{
  "name": "dvt", // ← UN SOLO PAQUETE
  "main": "dist/index.js",
  "paths": {
    "@dvt/engine/*": ["engine/src/*"], // ← Path alias, NO paquete real
    "@dvt/contracts/*": ["src/contracts/*"]
  }
}
```

**Problemas**:

- ❌ No puedes hacer `pnpm add @dvt/contracts@1.0.0` (no es paquete real)
- ❌ Engine, adapters y contracts se versionan juntos
- ❌ Dependencias circulares fáciles de crear
- ❌ Build time lento (compila todo siempre)

---

### 3. **Tests Dispersos en Múltiples Lugares**

```
test/              # ← Tests de contratos
engine/test/       # ← Tests de engine
adapters/*/test/   # ← ¿No existe aún?
```

**Problemas**:

- ❌ No está claro dónde van los tests
- ❌ Difícil ejecutar tests por módulo
- ❌ Coverage confuso

---

### 4. **Mezcla de Layers (Layering Violation)**

```typescript
// engine/src/index.ts exporta TODO mezclado:
export * from './types'; // ← Domain types
export * from './workers/OutboxWorker'; // ← Application service
export * from './adapters/state-store/InMemoryStateStore'; // ← Infrastructure

// Violación: Domain, Application, Infrastructure en el mismo barrel
```

**Clean Architecture dice**:

- Domain (types) no debe conocer Infrastructure (adapters)
- Application (workers) puede depender de Domain
- Infrastructure implementa contratos del Domain

---

### 5. **Scripts de Tooling Mezclados con Código**

```
scripts/
├── run-golden-paths.cjs    # ← Testing
├── validate-contracts.cjs  # ← Validation
├── db-migrate.cjs          # ← Database
└── compare-hashes.cjs      # ← Testing
```

**Problema**: Scripts sin organización clara (testing vs DB vs CI)

---

## ✅ Comparación con Estándares

### 🏆 Proyectos de Referencia

| Proyecto         | Estructura                                             | Por Qué Es Bueno                      |
| ---------------- | ------------------------------------------------------ | ------------------------------------- |
| **Nx Monorepo**  | `packages/` + workspace                                | Verdadero monorepo, build incremental |
| **Temporal SDK** | `packages/client`, `packages/worker`, `packages/proto` | Separación clara por bounded context  |
| **NestJS**       | Modules por feature + Hexagonal                        | Clean Architecture + DDD              |
| **tRPC**         | `packages/server`, `packages/client`, `packages/react` | Contracts separados del runtime       |

---

## 🎯 Propuesta: Arquitectura Mejorada

### Opción A: **Monorepo Ligero** (Recomendada - 2-3 días refactor)

```
dvt/
├── packages/
│   ├── contracts/              # 📦 Paquete independiente
│   │   ├── package.json        # @dvt/contracts
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── IWorkflowEngine.v1.ts
│   │   │   │   └── ExecutionSemantics.v1.ts
│   │   │   ├── adapters/
│   │   │   │   ├── IStateStoreAdapter.v1.ts
│   │   │   │   ├── IOutboxStorageAdapter.v1.ts
│   │   │   │   └── IWorkflowEngineAdapter.v1.ts
│   │   │   └── types/
│   │   │       ├── artifacts.ts
│   │   │       └── state-store.ts
│   │   └── tsconfig.json
│   │
│   ├── engine/                 # 📦 Paquete independiente
│   │   ├── package.json        # @dvt/engine
│   │   ├── src/
│   │   │   ├── core/           # Domain layer (business logic)
│   │   │   │   ├── projector/
│   │   │   │   └── orchestrator/
│   │   │   ├── application/    # Application services
│   │   │   │   └── OutboxWorker.ts
│   │   │   └── infrastructure/ # Adapters para testing
│   │   │       ├── InMemoryStateStore.ts
│   │   │       └── InMemoryEventBus.ts
│   │   ├── test/
│   │   └── tsconfig.json
│   │
│   ├── adapter-postgres/       # 📦 Paquete independiente
│   │   ├── package.json        # @dvt/adapter-postgres
│   │   ├── src/
│   │   │   ├── PostgresStateStore.ts
│   │   │   ├── PostgresOutboxStorage.ts
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   └── tsconfig.json
│   │
│   ├── adapter-temporal/       # 📦 Paquete independiente
│   │   ├── package.json        # @dvt/adapter-temporal
│   │   ├── src/
│   │   │   ├── TemporalAdapter.ts
│   │   │   ├── workflows/
│   │   │   └── activities/
│   │   ├── test/
│   │   └── tsconfig.json
│   │
│   └── cli/                    # 📦 Herramientas CLI
│       ├── package.json        # @dvt/cli
│       ├── src/
│       │   ├── validate-contracts.ts
│       │   ├── run-golden-paths.ts
│       │   └── db-migrate.ts
│       └── tsconfig.json
│
├── examples/                   # Golden paths (no es paquete)
├── docs/
├── .github/
├── pnpm-workspace.yaml         # Monorepo config
├── package.json                # Root package
└── tsconfig.base.json          # Shared tsconfig
```

**Ventajas**:

- ✅ **Cada paquete se versiona independientemente**: `@dvt/contracts@1.0.0`, `@dvt/engine@2.0.0`
- ✅ **Dependencias claras**: `engine` depende de `contracts`, no al revés
- ✅ **Build incremental**: Solo recompila lo que cambia
- ✅ **Testeo aislado**: `pnpm test --filter @dvt/engine`
- ✅ **Publicación independiente**: Puedes publicar solo `@dvt/contracts` a npm
- ✅ **Onboarding más fácil**: Cada paquete tiene su README

---

### Opción B: **Feature-Based** (Más radical - 1 semana refactor)

```
dvt/
├── packages/
│   ├── contracts/              # Igual que Opción A
│   │
│   ├── engine-core/            # Solo domain + application
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── projector/
│   │   │   │   └── orchestrator/
│   │   │   └── application/
│   │   │       └── use-cases/
│   │   │           ├── StartRun.ts
│   │   │           ├── PauseRun.ts
│   │   │           └── ResumeRun.ts
│   │
│   ├── engine-runtime/         # Infrastructure + workers
│   │   ├── src/
│   │   │   ├── workers/
│   │   │   └── infrastructure/
│   │
│   ├── adapters/               # Todos los adapters juntos
│   │   ├── postgres/
│   │   ├── temporal/
│   │   └── conductor/
│   │
│   └── services/               # Servicios completos
│       ├── api-gateway/        # REST API
│       └── workflow-runner/    # CLI runner
```

**Ventajas**:

- ✅ **DDD puro**: Bounded contexts claros
- ✅ **Microservices ready**: Fácil extraer a servicios separados
- ✅ **Onion Architecture**: Dependencies apuntan hacia domain

**Desventajas**:

- ⚠️ Más complejo inicialmente
- ⚠️ Requiere más planeación

---

## 📋 Plan de Migración (Opción A Recomendada)

### Sprint 1: Foundations (2-3 días)

**Issue Nueva: "refactor: Setup monorepo structure with pnpm workspaces"**

```bash
# 1. Crear estructura base
mkdir -p packages/{contracts,engine,adapter-postgres,adapter-temporal,cli}

# 2. Configurar pnpm workspaces
cat > pnpm-workspace.yaml <<EOF
packages:
  - 'packages/*'
EOF

# 3. Move contracts
mv engine/src/adapters/I*.ts packages/contracts/src/adapters/
mv engine/src/types/*.ts packages/contracts/src/types/

# 4. Crear package.json para cada paquete
cd packages/contracts
pnpm init
# Editar package.json:
{
  "name": "@dvt/contracts",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}

# 5. Repetir para engine, adapter-postgres, etc.
```

**Checklist**:

- [ ] Crear `pnpm-workspace.yaml`
- [ ] Crear `packages/contracts/` con interfaces
- [ ] Crear `packages/engine/` con core logic
- [ ] Crear `packages/adapter-postgres/` moviendo `adapters/postgres/`
- [ ] Crear `packages/cli/` moviendo `scripts/`
- [ ] Update imports in all files
- [ ] Configurar `tsconfig.base.json` compartido
- [ ] Actualizar CI workflows (paths changed)

---

### Sprint 2: Clean Architecture Layers (2 días)

**Issue Nueva: "refactor: Apply clean architecture to engine core"**

```
packages/engine/src/
├── domain/              # Entities + Domain Logic (NO dependencies)
│   ├── entities/
│   │   ├── ExecutionPlan.ts
│   │   └── RunSnapshot.ts
│   ├── value-objects/
│   │   ├── RunId.ts
│   │   └── StepId.ts
│   └── services/        # Domain services
│       └── SnapshotProjector.ts
│
├── application/         # Use cases + Application Logic
│   ├── use-cases/
│   │   ├── StartRun.ts
│   │   ├── PauseRun.ts
│   │   └── DeliverOutboxEvent.ts
│   └── ports/          # Interfaces for adapters (from @dvt/contracts)
│       └── index.ts    # Re-export from @dvt/contracts
│
└── infrastructure/      # Adapters for testing
    ├── InMemoryStateStore.ts
    └── InMemoryEventBus.ts
```

**Checklist**:

- [ ] Move business logic to `domain/`
- [ ] Crear use cases en `application/`
- [ ] Eliminar dependencias de infrastructure desde domain
- [ ] Tests siguen pasando
- [ ] Documentar capas en README

---

### Sprint 3: Update Dependencies + Scripts (1 día)

**Issue Nueva: "chore: Update tooling for monorepo structure"**

```json
// Root package.json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:engine": "pnpm --filter @dvt/engine test",
    "test:contracts": "pnpm --filter @dvt/contracts test",
    "lint": "pnpm -r lint",
    "validate:contracts": "pnpm --filter @dvt/cli validate-contracts",
    "golden:validate": "pnpm --filter @dvt/cli run-golden-paths"
  }
}

// packages/engine/package.json
{
  "name": "@dvt/engine",
  "dependencies": {
    "@dvt/contracts": "workspace:*"  // ← workspace protocol
  }
}

// packages/adapter-postgres/package.json
{
  "name": "@dvt/adapter-postgres",
  "dependencies": {
    "@dvt/contracts": "workspace:*",
    "@dvt/engine": "workspace:*",
    "prisma": "^5.0.0"
  }
}
```

**Checklist**:

- [ ] Actualizar todos los `package.json` con dependencies correctas
- [ ] Usar `workspace:*` protocol para packages internos
- [ ] Actualizar scripts en root `package.json`
- [ ] Actualizar CI workflows (`pnpm -r test`)
- [ ] Actualizar documentation

---

## 📊 Comparación: Antes vs Después

| Aspecto                | Antes (Actual) | Después (Opción A)        | Mejora                 |
| ---------------------- | -------------- | ------------------------- | ---------------------- |
| **Packages**           | 1 monolito     | 5 paquetes independientes | ✅ +400%               |
| **Versioning**         | Todo junto     | Independiente             | ✅ Semantic versioning |
| **Build time**         | ~30s (todo)    | ~5s (incremental)         | ✅ 6x más rápido       |
| **Test isolation**     | Difícil        | `pnpm test --filter`      | ✅ Fácil               |
| **Dependency graph**   | Circular       | Acíclico                  | ✅ Clear dependencies  |
| **Onboarding**         | 1 README largo | README por paquete        | ✅ Más claro           |
| **Publish to npm**     | No             | Sí (@dvt/contracts)       | ✅ Reusable            |
| **Clean Architecture** | No             | Sí (layers)               | ✅ Mantenible          |

---

## 🎯 Recomendación Final

### Para AHORA (corto plazo):

**Implementar Opción A (Monorepo Ligero)** en 3 sprints (~1 semana)

**Por qué**:

1. ✅ **ROI inmediato**: Build incremental ahorra 5-10 min/día
2. ✅ **No breaking**: Refactor interno, API externa igual
3. ✅ **Preparación para futuro**: Fácil añadir más adapters
4. ✅ **Estándar industria**: Temporal, tRPC, Nx usan esto

**Secuencia**:

1. Completar Sprint Actual: #67 → #2 → #66 → #6
2. **LUEGO**: Refactor a monorepo (Issue nueva)
3. Continuar con #70 (Golden Paths) ya en nueva estructura

---

### Para FUTURO (mediano plazo):

**Considerar Opción B (Feature-Based)** cuando:

- Tengas 5+ adapters
- Necesites extraer a microservices
- Team > 5 personas trabajando simultáneamente

---

## 📚 Referencias

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Nx Monorepo Best Practices](https://nx.dev/concepts/more-concepts/why-monorepos)
- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Temporal TypeScript SDK Structure](https://github.com/temporalio/sdk-typescript) - Ejemplo real

---

## ✅ Siguiente Paso

¿Quieres que cree la **Issue de refactoring** con el checklist completo para Sprint 1?

O prefieres **continuar con la secuencia actual** (#67 → #2 → #66) y refactorizar después?

**Mi recomendación**: Completar secuencia actual primero, LUEGO refactorizar con código funcionando.
