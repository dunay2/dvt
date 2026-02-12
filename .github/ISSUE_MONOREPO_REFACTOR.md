# refactor: Migrate to pnpm workspaces monorepo architecture

## 🎯 Objetivo

Refactorizar la estructura del proyecto de monolito a **monorepo modular** usando pnpm workspaces, con separación clara de responsabilidades y Clean Architecture.

## 📋 Contexto

**Problemas actuales** (ver [ARCHITECTURE_ANALYSIS.md](../docs/ARCHITECTURE_ANALYSIS.md)):

1. ❌ **No es monorepo real**: Todo en 1 paquete → versioning y build lentos
2. ❌ **Interfaces + implementaciones mezcladas**: `engine/src/adapters/` contiene contratos Y código
3. ❌ **No Clean Architecture**: Domain, Application, Infrastructure en el mismo barrel export
4. ❌ **Tests dispersos**: En 2 lugares (`test/` y `engine/test/`)
5. ❌ **Scripts sin organizar**: Tooling mezclado con código de negocio

**Referencias**:

- [Temporal TypeScript SDK](https://github.com/temporalio/sdk-typescript) - Estructura similar
- [tRPC Monorepo](https://github.com/trpc/trpc) - Ejemplo de industry standard
- [pnpm Workspaces](https://pnpm.io/workspaces)

## 🏗️ Arquitectura Propuesta

### Estructura de Paquetes

```
dvt/
├── packages/
│   ├── contracts/              # 📦 @dvt/contracts@1.0.0
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── engine/
│   │       │   ├── IWorkflowEngine.v1.ts
│   │       │   └── ExecutionSemantics.v1.ts
│   │       ├── adapters/
│   │       │   ├── IStateStoreAdapter.v1.ts
│   │       │   ├── IOutboxStorageAdapter.v1.ts
│   │       │   ├── IProjectorAdapter.v1.ts
│   │       │   └── IWorkflowEngineAdapter.v1.ts
│   │       ├── types/
│   │       │   ├── artifacts.ts
│   │       │   ├── state-store.ts
│   │       │   └── contracts.ts
│   │       └── index.ts
│   │
│   ├── engine/                 # 📦 @dvt/engine@2.0.0
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── domain/         # Domain layer (NO external deps)
│   │   │   │   ├── entities/
│   │   │   │   │   ├── ExecutionPlan.ts
│   │   │   │   │   └── RunSnapshot.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── RunId.ts
│   │   │   │   │   └── StepId.ts
│   │   │   │   └── services/
│   │   │   │       └── SnapshotProjector.ts
│   │   │   ├── application/    # Application layer
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── StartRun.ts
│   │   │   │   │   ├── PauseRun.ts
│   │   │   │   │   └── ResumeRun.ts
│   │   │   │   └── workers/
│   │   │   │       └── OutboxWorker.ts
│   │   │   ├── infrastructure/ # Infrastructure (testing adapters)
│   │   │   │   ├── InMemoryStateStore.ts
│   │   │   │   └── InMemoryEventBus.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── adapter-postgres/       # 📦 @dvt/adapter-postgres@1.0.0
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── PostgresStateStore.ts
│   │   │   ├── PostgresOutboxStorage.ts
│   │   │   ├── PostgresProjector.ts
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── test/
│   │
│   ├── adapter-temporal/       # 📦 @dvt/adapter-temporal@1.0.0
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── TemporalAdapter.ts
│   │   │   ├── workflows/
│   │   │   │   └── InterpreterWorkflow.ts
│   │   │   ├── activities/
│   │   │   │   └── ExecuteStep.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   └── cli/                    # 📦 @dvt/cli@1.0.0
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── commands/
│           │   ├── validate-contracts.ts
│           │   ├── run-golden-paths.ts
│           │   ├── db-migrate.ts
│           │   └── generate-baseline-hashes.ts
│           └── index.ts
│
├── examples/                   # Golden paths (no es paquete)
├── docs/
├── .github/
├── pnpm-workspace.yaml         # ✅ NUEVO
├── tsconfig.base.json          # ✅ NUEVO (shared config)
├── package.json                # Root package (scripts orquestadores)
└── README.md
```

### Dependency Graph

```
@dvt/contracts (v1.0.0) ← Pure interfaces
    ↑
    ├─── @dvt/engine (v2.0.0) ← Core logic
    │       ↑
    │       ├─── @dvt/adapter-postgres (v1.0.0)
    │       ├─── @dvt/adapter-temporal (v1.0.0)
    │       └─── @dvt/cli (v1.0.0)
    │
    └─── @dvt/adapter-* (implementan contratos directamente)
```

**Regla**: Dependencies solo fluyen hacia arriba (hacia abstracciones)

---

## 📦 Tareas de Implementación

### Sprint 1: Setup Monorepo Infrastructure (2-3 días)

#### Fase 1.1: Configuración Base (4h)

- [ ] Crear `pnpm-workspace.yaml`:

  ```yaml
  packages:
    - 'packages/*'
  ```

- [ ] Crear `tsconfig.base.json` compartido:

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    }
  }
  ```

- [ ] Crear estructura de directorios:
  ```bash
  mkdir -p packages/{contracts,engine,adapter-postgres,adapter-temporal,cli}
  ```

#### Fase 1.2: Migrar `@dvt/contracts` (6h)

- [ ] Crear `packages/contracts/package.json`:

  ```json
  {
    "name": "@dvt/contracts",
    "version": "1.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": "./dist/index.js",
      "./engine": "./dist/engine/index.js",
      "./adapters": "./dist/adapters/index.js",
      "./types": "./dist/types/index.js"
    },
    "scripts": {
      "build": "tsc",
      "test": "vitest run",
      "type-check": "tsc --noEmit"
    },
    "devDependencies": {
      "typescript": "^5.9.3",
      "vitest": "^3.0.0"
    }
  }
  ```

- [ ] Mover interfaces puras:

  ```bash
  # Desde engine/src/adapters/I*.ts
  mv engine/src/adapters/IStateStoreAdapter.v1.ts packages/contracts/src/adapters/
  mv engine/src/adapters/IOutboxStorageAdapter.v1.ts packages/contracts/src/adapters/
  mv engine/src/adapters/IProjectorAdapter.v1.ts packages/contracts/src/adapters/
  mv engine/src/adapters/IWorkflowEngineAdapter.v1.ts packages/contracts/src/adapters/

  # Types
  mv engine/src/types/*.ts packages/contracts/src/types/
  ```

- [ ] Crear `packages/contracts/src/index.ts`:

  ```typescript
  // Main barrel export
  export * from './engine';
  export * from './adapters';
  export * from './types';
  ```

- [ ] Crear `packages/contracts/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*.ts"],
    "exclude": ["**/*.spec.ts", "**/*.test.ts"]
  }
  ```

#### Fase 1.3: Migrar `@dvt/engine` (8h)

- [ ] Crear `packages/engine/package.json`:

  ```json
  {
    "name": "@dvt/engine",
    "version": "2.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage"
    },
    "dependencies": {
      "@dvt/contracts": "workspace:*"
    },
    "devDependencies": {
      "@types/node": "^25.2.3",
      "typescript": "^5.9.3",
      "vitest": "^3.0.0"
    }
  }
  ```

- [ ] Aplicar Clean Architecture:

  ```bash
  mkdir -p packages/engine/src/{domain,application,infrastructure}

  # Domain (entities + domain services)
  mv engine/src/core/* packages/engine/src/domain/

  # Application (use cases + workers)
  mv engine/src/workers/* packages/engine/src/application/workers/

  # Infrastructure (in-memory adapters para testing)
  mv engine/src/adapters/state-store/InMemoryStateStore.ts packages/engine/src/infrastructure/
  mv engine/src/adapters/event-bus/InMemoryEventBus.ts packages/engine/src/infrastructure/
  ```

- [ ] Actualizar imports en `@dvt/engine`:

  ```bash
  # Buscar y reemplazar:
  # De: import { IStateStoreAdapter } from '../adapters'
  # A:  import { IStateStoreAdapter } from '@dvt/contracts/adapters'
  ```

- [ ] Mover tests:
  ```bash
  mv engine/test/* packages/engine/test/
  ```

#### Fase 1.4: Migrar `@dvt/adapter-postgres` (4h)

- [ ] Crear `packages/adapter-postgres/package.json`:

  ```json
  {
    "name": "@dvt/adapter-postgres",
    "version": "1.0.0",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "test": "vitest run",
      "db:migrate": "prisma migrate dev",
      "db:generate": "prisma generate"
    },
    "dependencies": {
      "@dvt/contracts": "workspace:*",
      "@dvt/engine": "workspace:*",
      "@prisma/client": "^5.0.0"
    },
    "devDependencies": {
      "prisma": "^5.0.0",
      "typescript": "^5.9.3",
      "vitest": "^3.0.0"
    }
  }
  ```

- [ ] Mover código:
  ```bash
  mv adapters/postgres/* packages/adapter-postgres/src/
  ```

#### Fase 1.5: Migrar `@dvt/cli` (4h)

- [ ] Crear `packages/cli/package.json`:

  ```json
  {
    "name": "@dvt/cli",
    "version": "1.0.0",
    "type": "module",
    "bin": {
      "dvt": "./dist/cli.js"
    },
    "scripts": {
      "build": "tsc"
    },
    "dependencies": {
      "@dvt/contracts": "workspace:*",
      "@dvt/engine": "workspace:*",
      "commander": "^12.0.0"
    }
  }
  ```

- [ ] Mover scripts:

  ```bash
  mv scripts/validate-contracts.cjs packages/cli/src/commands/validate-contracts.ts
  mv scripts/run-golden-paths.cjs packages/cli/src/commands/run-golden-paths.ts
  mv scripts/db-migrate.cjs packages/cli/src/commands/db-migrate.ts
  mv scripts/compare-hashes.cjs packages/cli/src/commands/compare-hashes.ts
  ```

- [ ] Convertir de CommonJS a ESM (buscar/reemplazar `require` → `import`)

#### Fase 1.6: Actualizar Root Package (2h)

- [ ] Actualizar `package.json` root:
  ```json
  {
    "name": "dvt-monorepo",
    "version": "2.4.9",
    "private": true,
    "type": "module",
    "scripts": {
      "build": "pnpm -r build",
      "build:contracts": "pnpm --filter @dvt/contracts build",
      "build:engine": "pnpm --filter @dvt/engine build",
      "test": "pnpm -r test",
      "test:engine": "pnpm --filter @dvt/engine test",
      "test:coverage": "pnpm -r test:coverage",
      "lint": "eslint packages --max-warnings 0",
      "lint:fix": "eslint packages --fix",
      "type-check": "pnpm -r type-check",
      "validate:contracts": "pnpm --filter @dvt/cli validate-contracts",
      "golden:validate": "pnpm --filter @dvt/cli run-golden-paths",
      "golden:baseline": "pnpm --filter @dvt/cli generate-baseline-hashes",
      "release:contracts": "cd packages/contracts && pnpm version",
      "release:engine": "cd packages/engine && pnpm version"
    },
    "devDependencies": {
      "@typescript-eslint/eslint-plugin": "^8.55.0",
      "@typescript-eslint/parser": "^8.15.0",
      "eslint": "^9.39.2",
      "prettier": "^3.4.2",
      "typescript": "^5.9.3"
    }
  }
  ```

---

### Sprint 2: Clean Architecture Refactor (2 días)

#### Fase 2.1: Domain Layer (`@dvt/engine`) (1 día)

- [ ] Crear entidades puras:

  ```typescript
  // packages/engine/src/domain/entities/ExecutionPlan.ts
  export class ExecutionPlan {
    constructor(
      public readonly planId: string,
      public readonly version: string,
      public readonly steps: Step[]
    ) {}

    // Solo lógica de negocio, NO dependencies externas
    validate(): ValidationResult {
      /* ... */
    }
  }
  ```

- [ ] Crear value objects:

  ```typescript
  // packages/engine/src/domain/value-objects/RunId.ts
  export class RunId {
    private constructor(private readonly value: string) {}

    static create(value: string): RunId {
      if (!value.match(/^run-[\w-]+$/)) {
        throw new Error('Invalid RunId format');
      }
      return new RunId(value);
    }

    toString(): string {
      return this.value;
    }
  }
  ```

- [ ] Crear domain services:
  ```typescript
  // packages/engine/src/domain/services/SnapshotProjector.ts
  export class SnapshotProjector {
    buildSnapshot(events: CanonicalEngineEvent[]): PlanSnapshot {
      // Pure function - NO external dependencies
    }
  }
  ```

#### Fase 2.2: Application Layer (`@dvt/engine`) (1 día)

- [ ] Crear use cases:

  ```typescript
  // packages/engine/src/application/use-cases/StartRun.ts
  import { IStateStoreAdapter } from '@dvt/contracts/adapters';

  export class StartRun {
    constructor(private stateStore: IStateStoreAdapter) {}

    async execute(planId: string): Promise<RunId> {
      // Orchestration logic
    }
  }
  ```

- [ ] Mover workers a application layer:

  ```typescript
  // packages/engine/src/application/workers/OutboxWorker.ts
  ```

- [ ] Crear ports/interfaces (re-export de contracts):
  ```typescript
  // packages/engine/src/application/ports/index.ts
  export * from '@dvt/contracts/adapters';
  ```

#### Fase 2.3: Infrastructure Layer (`@dvt/engine`) (medio día)

- [ ] Mantener solo adapters de testing:

  ```typescript
  // packages/engine/src/infrastructure/InMemoryStateStore.ts
  // packages/engine/src/infrastructure/InMemoryEventBus.ts
  ```

- [ ] Verificar que NO hay lógica de negocio aquí

---

### Sprint 3: Integration & Testing (1 día)

#### Fase 3.1: Actualizar Imports (4h)

- [ ] Buscar y reemplazar en todo el proyecto:

  ```bash
  # Pattern 1: Relative imports to package imports
  find packages -name "*.ts" -exec sed -i 's|from ".*\/adapters\/I|from "@dvt/contracts/adapters/I|g' {} \;
  find packages -name "*.ts" -exec sed -i 's|from ".*\/types|from "@dvt/contracts/types|g' {} \;

  # Pattern 2: Update barrel imports
  find packages -name "*.ts" -exec sed -i 's|from "\.\./\.\./|from "@dvt/|g' {} \;
  ```

- [ ] Verificar compilación:
  ```bash
  pnpm build
  # Debe pasar sin errores
  ```

#### Fase 3.2: Actualizar Tests (4h)

- [ ] Actualizar imports en tests:

  ```typescript
  // De:
  import { IStateStoreAdapter } from '../src/adapters';

  // A:
  import { IStateStoreAdapter } from '@dvt/contracts/adapters';
  ```

- [ ] Ejecutar todos los tests:

  ```bash
  pnpm test
  # Todos deben pasar
  ```

- [ ] Verificar coverage no bajó:
  ```bash
  pnpm test:coverage
  # Coverage >= 80%
  ```

---

### Sprint 4: CI/CD & Documentation (1 día)

#### Fase 4.1: Actualizar CI Workflows (2h)

- [ ] Actualizar `.github/workflows/test.yml`:

  ```yaml
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build all packages
    run: pnpm build

  - name: Run tests
    run: pnpm test

  - name: Type check
    run: pnpm type-check
  ```

- [ ] Actualizar `.github/workflows/contracts.yml`:

  ```yaml
  - name: Validate contracts
    run: pnpm validate:contracts

  - name: Run golden paths
    run: pnpm golden:validate
  ```

#### Fase 4.2: Documentación (4h)

- [ ] Actualizar `README.md` root:

  ```markdown
  ## Monorepo Structure

  This project uses pnpm workspaces for monorepo management.

  ### Packages

  - `@dvt/contracts` - Pure interfaces and types
  - `@dvt/engine` - Core business logic
  - `@dvt/adapter-postgres` - PostgreSQL implementation
  - `@dvt/adapter-temporal` - Temporal.io integration
  - `@dvt/cli` - Command-line tools

  ### Development

  \`\`\`bash

  # Install dependencies

  pnpm install

  # Build all packages

  pnpm build

  # Run tests

  pnpm test

  # Run tests for specific package

  pnpm test:engine
  \`\`\`
  ```

- [ ] Crear `packages/*/README.md` individuales

- [ ] Actualizar `ARCHITECTURE_ANALYSIS.md` marcando como "IMPLEMENTED"

#### Fase 4.3: Verificación Final (2h)

- [ ] Checklist de validación:
  - [ ] `pnpm install` funciona
  - [ ] `pnpm build` compila todo
  - [ ] `pnpm test` pasa todos los tests
  - [ ] Coverage >= 80%
  - [ ] CI workflows pasan
  - [ ] Documentación actualizada
  - [ ] No errores de TypeScript
  - [ ] No circular dependencies

---

## ✅ Criterios de Aceptación

### Must Have:

- [x] Estructura de monorepo con 5 paquetes
- [x] `pnpm-workspace.yaml` configurado
- [x] Cada paquete tiene `package.json` independiente
- [x] Clean Architecture implementada en `@dvt/engine`
- [x] Dependencies correctas (contracts → engine → adapters)
- [x] No circular dependencies
- [x] Todos los tests pasan
- [x] Coverage >= 80%
- [x] CI workflows actualizados y pasando
- [x] Documentación completa

### Should Have:

- [ ] Build incremental funciona (solo recompila lo cambiado)
- [ ] Scripts de release por paquete (`pnpm release:contracts`)
- [ ] README por paquete con ejemplos de uso
- [ ] Diagrams actualizados

### Nice to Have:

- [ ] Changesets para versionado automático
- [ ] Turborepo para build caching
- [ ] Package provenance (npm publish con signatures)

---

## 📊 Impacto y Beneficios

### Métricas Esperadas

| Métrica                      | Antes      | Después    | Mejora   |
| ---------------------------- | ---------- | ---------- | -------- |
| **Packages**                 | 1          | 5          | +400%    |
| **Build time** (incremental) | 30s        | 5s         | **-83%** |
| **Test isolation**           | Difícil    | `--filter` | ✅       |
| **Dependency clarity**       | Circular   | Acyclical  | ✅       |
| **Versioning**               | Monolithic | Semantic   | ✅       |
| **Publish to npm**           | No         | Yes        | ✅       |

### ROI Analysis

**Inversión**: ~6-7 días trabajo (1 persona)

**Ahorro mensual**:

- Build time: 25s × 50 builds/día × 20 días = **4.2h/mes**
- Tests más rápidos: 10s × 20 tests/día × 20 días = **1.1h/mes**
- Mejor troubleshooting: ~2h/semana = **8h/mes**

**Total**: ~13h/mes ahorradas = **Break-even en 4 sprints**

---

## 🔗 Referencias

- [ARCHITECTURE_ANALYSIS.md](../docs/ARCHITECTURE_ANALYSIS.md) - Análisis detallado
- [ARCHITECTURE_DIAGRAMS.mmd](../docs/architecture/ARCHITECTURE_DIAGRAMS.mmd) - Diagramas
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Temporal SDK Structure](https://github.com/temporalio/sdk-typescript) - Ejemplo real

---

## 📝 Notas de Implementación

### Estrategia de Migration

**NO hacer Big Bang**: Migrar paquete por paquete

1. ✅ Setup infraestructura (pnpm-workspace.yaml)
2. ✅ Migrar `@dvt/contracts` primero (independiente)
3. ✅ Migrar `@dvt/engine` (depende de contracts)
4. ✅ Migrar adapters (dependen de engine)
5. ✅ Migrar CLI último (depende de todo)

### Riesgos y Mitigaciones

| Riesgo                         | Probabilidad | Impacto | Mitigación                                              |
| ------------------------------ | ------------ | ------- | ------------------------------------------------------- |
| Tests fallan después de migrar | Media        | Alto    | Migrar tests junto con código, ejecutar frecuentemente  |
| Circular dependencies          | Baja         | Medio   | Usar `madge` para detectar, refactorizar antes de merge |
| Build roto en CI               | Media        | Alto    | Testear CI localmente con `act`, merge solo si verde    |
| Imports incorrectos            | Alta         | Bajo    | Script de search/replace, luego TypeScript catch errors |

### Rollback Plan

Si algo sale mal:

```bash
# Revert commit
git revert HEAD

# O cherry-pick solo lo que funcionó
git cherry-pick <commit-hash>
```

**Checkpoint**: Hacer commits pequeños por cada paquete migrado.

---

## 🚀 Siguiente Paso

**IMPORTANTE**: Esta issue debe trabajarse **DESPUÉS** de completar:

- ✅ Issue #67 (Zod validation)
- ✅ Issue #2 (TypeScript types - PR #65)
- ✅ Issue #66 (Prisma setup)
- ✅ Issue #6 (PostgresStateStoreAdapter)

**Por qué**: No refactorizar con features a medias. Terminar sprint actual primero.

**Asignación recomendada**: 1 persona full-time, 1 semana

---

**Labels**: `refactor`, `architecture`, `monorepo`, `priority: medium`, `phase-2`  
**Milestone**: Post-MVP Optimization  
**Estimate**: 6-7 días (1 persona)  
**Dependencies**: #2, #66, #6
