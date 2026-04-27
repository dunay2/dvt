# Capabilities: Executable Contracts

[â† Back to Contracts Registry](../README.md)

This directory contains **executable, schema-validated** capability declarations. These are NOT prose; they drive validation logic.

These assets are companions to the active engine-runtime `v1` pack. They do
not publish a second contract line for engine-runtime behavior.

## Files

### `capabilities.schema.json`

Universal capability enum. Defines all possible capabilities across all adapters.

**Usage**:

- Typescript: Import and use as enum type (via JSON Schema â†’ TypeScript generator).
- Validation: Capabilities referenced in `RunExecutionPolicy.requiresCapabilities`
  MUST exist in this enum.

### `adapters.capabilities.json`

Capability matrix: declares which capabilities each adapter implements.

**Usage**:

- Engine validation: Query this file to check if
  `executionPolicy.requiresCapabilities` are supported by
  `RunContext.targetAdapter`.
- Current active provider: `temporal`.

### `validation-report.schema.json`

Schema for ValidationReport emitted by engine's `validatePlan()`.

**Usage**:

- Code generation: Generate TypeScript interfaces from this schema.
- Validation: Reports MUST conform to this schema before persisting to StateStore.

## Integration with `RunExecutionPolicy`

```ts
interface RunExecutionPolicy {
  requiresCapabilities?: string[]; // Must be from capabilities.schema.json
  pluginCompatibilityFingerprint?: string;
}

interface RunContext {
  targetAdapter: 'temporal';
}
```

## Validation Logic (pseudo-code)

```ts
async function validatePlan(
  plan: ExecutionPlan,
  executionPolicy: RunExecutionPolicy,
  targetAdapter: string
): Promise<ValidationReport> {
  // 1. Load adapters.capabilities.json
  const adapterMatrix = await loadJSON('adapters.capabilities.json');
  const adapterCaps = new Set(adapterMatrix[targetAdapter].capabilities);

  // 2. Check each required capability
  const report: ValidationReport = {
    planId: plan.planId,
    status: 'VALID',
    capabilityChecks: [],
    errors: [],
    warnings: [],
  };

  for (const requiredCap of executionPolicy.requiresCapabilities ?? []) {
    // Verify requiredCap exists in capabilities.schema.json
    if (!isValidCapability(requiredCap)) {
      report.errors.push({
        code: 'CAPABILITY_UNKNOWN',
        capability: requiredCap,
        message: `Unknown capability: ${requiredCap}`,
      });
      continue;
    }

    // Check if adapter supports it
    const supported = adapterCaps.has(requiredCap);
    report.capabilityChecks.push({
      capability: requiredCap,
      supported,
      adapterSupport: supported ? 'native' : undefined,
    });

    if (!supported) {
      report.errors.push({
        code: 'CAPABILITY_NOT_SUPPORTED',
        capability: requiredCap,
        message: `${targetAdapter} doesn't support ${requiredCap}`,
      });
    }
  }

  // 3. Final status
  report.status =
    report.errors.length > 0 ? 'ERRORS' : report.warnings.length > 0 ? 'WARNINGS' : 'VALID';

  return report;
}
```

## Validation in startRun()

```ts
async function startRun(
  plan: ExecutionPlan,
  planRef: PlanRef,
  executionPolicy: RunExecutionPolicy,
  ctx: RunContext
): Promise<EngineRunRef> {
  const report = await validatePlan(plan, executionPolicy, ctx.targetAdapter);

  // Persist report to StateStore
  await stateStore.emit({
    eventType: 'RunValidationReport',
    runId: ctx.runId,
    validationReport: report,
    idempotencyKey: `val-${ctx.runId}-${plan.planVersion}`,
  });

  // Reject if errors
  if (report.status === 'ERRORS') {
    throw new PlanValidationError('Plan validation failed', report);
  }

  // Proceed
  return await adapter.startRun(planRef, ctx);
}
```

## Extending Capabilities

When adding a new capability:

1. Add to `capabilities.schema.json` enum (in appropriate category: signaling, cancellation, etc.).
2. Update which adapters support it in `adapters.capabilities.json`.
3. Update `RunExecutionPolicy` validation rule (if gating a new feature, add to Phase roadmap).
4. Version changes: If a capability change alters the active engine-runtime
   boundary, rewrite the active `v1` contract surfaces and companion
   registries in the same slice. Do not preserve a second active engine-runtime
   reading path or add an alias page that competes with the canonical pack.

## References

- [IWorkflowEngine.v1.md](../engine/IWorkflowEngine.v1.md)
- [ExecutionSemantics.v1.md](../engine/ExecutionSemantics.v1.md)
- [temporal-adapter-spec.md](../../adapters/temporal/temporal-adapter-spec.md)
- [Temporal Capabilities](https://docs.temporal.io/)
