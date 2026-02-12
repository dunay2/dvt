# Issues para los Siguientes Pasos

## Issue #3: Runtime Validation at API Boundaries (Phase 3)

````markdown
# feat(validation): Add runtime validation at API boundaries using Zod

## Description

Integrate Zod validators at all API entry points to validate inputs before processing.

## Goals

- ✅ Add validation wrappers to IWorkflowEngineAdapter methods
- ✅ Add validation to REST API endpoints (when available)
- ✅ Improve error messages for validation failures
- ✅ Document validation behavior

## Acceptance Criteria

- [ ] All API methods validate ExecutionPlan inputs using parseExecutionPlan()
- [ ] All API methods validate ValidationReport outputs using parseValidationReport()
- [ ] Validation errors return structured error responses (400 Bad Request)
- [ ] Error messages include field path and constraint violations
- [ ] Tests cover both valid and invalid input scenarios
- [ ] Documentation updated with validation examples

## Implementation Details

### Files to Update

1. **engine/src/adapters/IWorkflowEngineAdapter.v1.ts**
   - Add validation wrapper methods
   - Document validation expectations

2. **engine/src/core/types.ts** (if needed)
   - Import types from `engine/src/contracts/schemas`

3. **engine/test/adapters/** (new)
   - Add tests for validation behavior

### Example Implementation

```typescript
import { parseExecutionPlan, type ExecutionPlan } from '../contracts/schemas';

export interface IWorkflowEngineAdapter {
  startRun(plan: unknown): Promise<EngineRunRef> {
    // Validate first
    const validPlan = parseExecutionPlan(plan);
    // Process validated plan
    return this._startRun(validPlan);
  }
}
```
````

## Related Issues

- Closes part of #2 (TypeScript type alignment) ✅
- Enables #5 (TemporalAdapter MVP)
- Enables #10 (Golden Paths validation)

## Estimated Effort

- Medium (3-5 days)
- Depends on: #2 (Zod integration) ✅

## Labels

- `enhancement`
- `contracts`
- `validation`
- `phase-3`

````

---

## Issue #4: JSON Schema Generation & OpenAPI Documentation

```markdown
# docs(schemas): Generate JSON Schema and OpenAPI specs from Zod

## Description

Automatically generate JSON Schema and OpenAPI documentation from Zod schemas.

## Goals

- ✅ Generate JSON Schema files from Zod schemas
- ✅ Create OpenAPI spec for workflow engine API
- ✅ Publish TypeDoc API documentation
- ✅ Update contract documentation with examples

## Acceptance Criteria

- [ ] Create script: `pnpm codegen:schemas` generates JSON schemas to `docs/schemas/`
- [ ] JSON Schemas include proper $schema, title, description metadata
- [ ] OpenAPI spec covers ExecutionPlan and ValidationReport endpoints
- [ ] TypeDoc config set up with proper output directory
- [ ] CI runs `pnpm codegen` to verify schemas stay in sync
- [ ] Documentation updated with schema examples

## Implementation Details

### Files to Create/Update

1. **scripts/generate-schemas.ts** (new)
   ```bash
   pnpm tsx scripts/generate-schemas.ts
````

- Use `zod-to-json-schema` to generate
- Output to `docs/schemas/`

2. **typedoc.json** (new)

   ```json
   {
     "entryPoints": ["engine/src/contracts/schemas/index.ts"],
     "out": "docs/api"
   }
   ```

3. **docs/schemas/** (new directory)
   - execution-plan.schema.json
   - validation-report.schema.json

4. **package.json** (update)
   ```json
   "codegen:schemas": "pnpm tsx scripts/generate-schemas.ts",
   "docs:api": "typedoc"
   ```

## Related Issues

- Depends on: #2 (Zod integration) ✅, #3 (Runtime validation)
- Blocked by: Issue #10 (Golden Paths) - for example data

## Estimated Effort

- Small (2-3 days)

## Labels

- `documentation`
- `codegen`
- `phase-4`

````

---

## Issue #5: TemporalAdapter MVP Implementation

```markdown
# feat(adapters): Implement TemporalAdapter MVP

## Description

Implement Temporal.io adapter for workflow engine with validated inputs/outputs.

## Goals

- ✅ Implement IWorkflowEngineAdapter for Temporal
- ✅ Support ExecutionPlan parsing and validation
- ✅ Support signal handling (PAUSE, RESUME, CANCEL, etc.)
- ✅ Implement capability validation

## Acceptance Criteria

- [ ] `engine/src/adapters/temporal/` directory created
- [ ] `TemporalAdapter` class implements `IWorkflowEngineAdapter`
- [ ] All inputs validated with Zod schemas
- [ ] startRun() method works end-to-end
- [ ] Signal handlers for all Phase 1 signals
- [ ] Tests cover valid execution paths
- [ ] Integration tests with Temporal test server

## Implementation Details

### Directory Structure

````

engine/src/adapters/temporal/
├── index.ts
├── adapter.ts
├── workflows/
├── activities/
└── signals/

```

### Dependencies

- @temporalio/client
- @temporalio/worker
- Zod schemas (from #2) ✅

## Related Issues

- Depends on: #2 (Zod schemas) ✅, #3 (Runtime validation)
- Related to: #6 (Conductor Adapter)
- Enables: #12 (Determinism testing)

## Estimated Effort

- Large (2-3 weeks)

## Labels

- `adapter`
- `temporal`
- `critical`
```

---

## Issue #6: ConductorAdapter MVP Implementation

```markdown
# feat(adapters): Implement ConductorAdapter MVP

## Description

Implement Netflix Conductor adapter for workflow engine with validated inputs/outputs.

## Goals

- ✅ Implement IWorkflowEngineAdapter for Conductor
- ✅ Support ExecutionPlan parsing and validation
- ✅ Support signal handling (PAUSE, RESUME, CANCEL, etc.)
- ✅ Implement capability validation

## Acceptance Criteria

- [ ] `engine/src/adapters/conductor/` directory created
- [ ] `ConductorAdapter` class implements `IWorkflowEngineAdapter`
- [ ] All inputs validated with Zod schemas
- [ ] startRun() method works end-to-end
- [ ] Signal handlers for all Phase 1 signals
- [ ] Tests cover valid execution paths
- [ ] Integration tests with Conductor local deployment

## Implementation Details

### Directory Structure
```

engine/src/adapters/conductor/
├── index.ts
├── adapter.ts
├── workflows/
├── tasks/
└── signals/

```

### Dependencies

- conductor-client (or HTTP client)
- Zod schemas (from #2) ✅

## Related Issues

- Depends on: #2 (Zod schemas) ✅, #3 (Runtime validation)
- Related to: #5 (TemporalAdapter)
- Enables: #12 (Determinism testing)

## Estimated Effort

- Large (2-3 weeks)

## Labels

- `adapter`
- `conductor`
- `critical`
```

---

## Issue #7: Golden Paths Fixtures & Validation

```markdown
# test(contracts): Create golden path fixtures and validation suite

## Description

Create reproducible execution path examples and validate them against contracts.

## Goals

- ✅ Define 5-10 golden execution paths
- ✅ Create fixtures for each path
- ✅ Validate fixtures against Zod schemas
- ✅ Calculate golden hashes for determinism tracking

## Acceptance Criteria

- [ ] `test/contracts/plans/` directory created with 5 golden paths
- [ ] `test/contracts/fixtures/` contains validation reports for each path
- [ ] All fixtures validate with `pnpm validate:contracts`
- [ ] `.golden/hashes.json` created with SHA256 hashes
- [ ] CI runs validation and hash comparison
- [ ] Documentation explains how to add new golden paths

## Golden Paths

1. **minimal**: Single step, no capabilities
2. **parallel**: Multiple parallel steps
3. **sequential**: Dependent steps with error handling
4. **cancel-flow**: Pause → Resume → Cancel sequence
5. **capability-validation**: Mixed native/emulated/degraded capabilities

## Implementation Details

### Directory Structure
```

test/contracts/
├── plans/
│ ├── minimal-plan.json
│ ├── parallel-plan.json
│ └── ...
├── fixtures/
│ ├── minimal-report.json
│ └── ...
└── results/
└── validation-results.json

````

### Scripts

```bash
# Generate hashes
pnpm test:contracts:hashes

# Compare with baseline
pnpm test:contracts:hash-compare

# Validate all
pnpm validate:contracts
````

## Related Issues

- Depends on: #2 (Zod) ✅, #3 (Validation), #5-6 (Adapters)
- Feeds: #12 (Determinism testing)

## Estimated Effort

- Medium (3-5 days)

## Labels

- `testing`
- `contracts`
- `golden-paths`

````

---

## Issue #8: Conductor Draining Policies & Semantics

```markdown
# docs(adapter-semantics): Define Conductor-specific draining policies

## Description

Document Conductor adapter-specific semantics for workflow state management and draining.

## Goals

- ✅ Define pause/drain behavior for Conductor
- ✅ Document callback handling
- ✅ Define resume semantics (resume from last task vs restart)
- ✅ Document signal ordering constraints

## Acceptance Criteria

- [ ] Create `docs/architecture/adapter-semantics/conductor-draining.md`
- [ ] Define 3 draining strategies (graceful, forced, with-compensation)
- [ ] Document in-flight task handling
- [ ] Provide examples for each strategy
- [ ] Update IWorkflowEngineAdapter contract if needed

## Related Issues

- Related to: #6 (ConductorAdapter)
- References: SignalsAndAuth.v1.1.md

## Estimated Effort

- Small (2-3 days)

## Labels

- `documentation`
- `conductor`
- `semantics`
````

---

## Issue #9: Version Binding & Plan Evolution

```markdown
# feat(contracts): Implement plan signature versioning and evolution

## Description

Add explicit mechanism for handling plan version evolution and backwards compatibility.

## Goals

- ✅ Define plan signature semantics
- ✅ Document version compatibility rules
- ✅ Implement version negotiation logic
- ✅ Define migration path for breaking changes

## Acceptance Criteria

- [ ] Create `docs/architecture/engine/PlanVersioning.md`
- [ ] Define signature format with hash/version tuple
- [ ] Implement plan hash calculation (SHA256)
- [ ] Add version negotiation to IWorkflowEngineAdapter
- [ ] Tests cover backward/forward compatibility scenarios

## Related Issues

- Related to: #2 (Contracts), ROADMAP items

## Estimated Effort

- Medium (3-5 days)

## Labels

- `contracts`
- `versioning`
```

---

## Issue #10: Determinism Verification & Testing

```markdown
# test(determinism): Comprehensive determinism testing suite

## Description

Create comprehensive determinism testing to ensure workflow execution semantics.

## Goals

- ✅ Test exactly-once execution of critical sections
- ✅ Verify golden hash consistency across runs
- ✅ Test determinism under failure scenarios
- ✅ Document any non-deterministic behaviors

## Acceptance Criteria

- [ ] 20+ determinism tests covering all critical paths
- [ ] Golden hash validation in CI
- [ ] Failure scenario testing (network, timeout, etc.)
- [ ] Performance benchmarks for determinism checks
- [ ] Documentation of known non-determinism (if any)

## Related Issues

- Depends on: #5-6 (Adapters), #7 (Golden Paths)
- Related to: Determinism design docs

## Estimated Effort

- Large (2-3 weeks)

## Labels

- `testing`
- `determinism`
- `critical`
```

---

## Roadmap Summary

```
Phase 3 (Current Sprint):
├─ Issue #3: Runtime Validation ⏳
├─ Issue #4: JSON Schema & OpenAPI
└─ Issue #8: Conductor Semantics

Phase 4 (Next Sprint):
├─ Issue #5: TemporalAdapter MVP 🔴 Critical
├─ Issue #6: ConductorAdapter MVP 🔴 Critical
├─ Issue #7: Golden Paths Fixtures
└─ Issue #9: Version Binding

Phase 5 (Following):
└─ Issue #10: Determinism Testing

**Key Dependencies**:
- ✅ Issue #2 (Zod Integration) - DONE
- Issue #3 (Validation) → Issue #5-6 (Adapters)
- Issue #7 (Golden Paths) → Issue #10 (Determinism)

**Estimate**:
- Phase 3: 1-2 weeks
- Phase 4: 4-6 weeks (parallelizable)
- Phase 5: 2-3 weeks

**Total**: ~8-11 weeks to complete core MVP
```
