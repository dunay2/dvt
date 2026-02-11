# Capabilities: Executable Contracts

This directory contains **executable, schema-validated** capability declarations. These are NOT prose; they drive validation logic.

## Files

### `capabilities.schema.json`

Universal capability enum. Defines all possible capabilities across all adapters.

**Usage**:

- Typescript: Import and use as enum type (via JSON Schema → TypeScript generator).
- Validation: Capabilities referenced in ExecutionPlan MUST exist in this enum.

### `adapters.capabilities.json`

Capability matrix: declares which capabilities each adapter implements.

**Usage**:

- Engine validation: Query this file to check if `plan.requiresCapabilities` are supported by `targetAdapter`.
- Example: If `targetAdapter="conductor"` and plan requires `["PAUSE_NATIVE"]`, validation fails (Conductor only has `PAUSE_EMULATED`).

### `validation-report.schema.json`

Schema for ValidationReport emitted by engine's `validatePlan()`.

**Usage**:

- Code generation: Generate TypeScript interfaces from this schema.
- Validation: Reports MUST conform to this schema before persisting to StateStore.

## Integration with ExecutionPlan

```ts
interface ExecutionPlan {
  metadata: {
    targetAdapter: "temporal" | "conductor" | "any";
    requiresCapabilities: string[];           // Must be from capabilities.schema.json
    fallbackBehavior: "reject" | "emulate" | "degrade";
    pluginTrustTier: "trusted" | "partner" | "untrusted";
  };
  // ... rest of plan
}
```

## Validation Logic (pseudo-code)

```ts
async function validatePlan(plan: ExecutionPlan, targetAdapter: string): Promise<ValidationReport> {
  // 1. Load adapters.capabilities.json
  const adapterMatrix = await loadJSON("adapters.capabilities.json");
  const adapterCaps = new Set(adapterMatrix[targetAdapter].capabilities);

  // 2. Check each required capability
  const report: ValidationReport = {
    planId: plan.planId,
    status: "VALID",
    capabilityChecks: [],
    errors: [],
    warnings: []
  };

  for (const requiredCap of plan.metadata.requiresCapabilities) {
    // Verify requiredCap exists in capabilities.schema.json
    if (!isValidCapability(requiredCap)) {
      report.errors.push({
        code: "CAPABILITY_UNKNOWN",
        capability: requiredCap,
        message: `Unknown capability: ${requiredCap}`
      });
      continue;
    }

    // Check if adapter supports it
    const supported = adapterCaps.has(requiredCap);
    report.capabilityChecks.push({
      capability: requiredCap,
      supported,
      adapterSupport: supported ? "native" : undefined
    });

    if (!supported) {
      if (plan.metadata.fallbackBehavior === "reject") {
        report.errors.push({
          code: "CAPABILITY_NOT_SUPPORTED",
          capability: requiredCap,
          message: `${targetAdapter} doesn't support ${requiredCap}; fallbackBehavior=reject`
        });
      } else if (plan.metadata.fallbackBehavior === "emulate") {
        report.warnings.push({
          code: "CAPABILITY_EMULATED",
          message: `${requiredCap} will be emulated on ${targetAdapter}; latency may differ`
        });
      }
    }
  }

  // 3. Validate pluginTrustTier
  if (!plan.metadata.pluginTrustTier) {
    report.errors.push({
      code: "PLUGIN_TRUST_TIER_MISSING",
      message: "ExecutionPlan.metadata.pluginTrustTier is mandatory"
    });
  }

  // 4. Final status
  report.status = report.errors.length > 0 ? "ERRORS" : report.warnings.length > 0 ? "WARNINGS" : "VALID";

  return report;
}
```

## Validation in startRun()

```ts
async function startRun(plan: ExecutionPlan, ctx: RunContext): Promise<EngineRunRef> {
  const report = await validatePlan(plan, ctx.targetAdapter);

  // Persist report to StateStore
  await stateStore.emit({
    eventType: "RunValidationReport",
    runId: ctx.runId,
    validationReport: report,
    idempotencyKey: `val-${ctx.runId}-${plan.planVersion}`
  });

  // Reject if errors and plan says so
  if (report.status === "ERRORS" && plan.metadata.fallbackBehavior === "reject") {
    throw new PlanValidationError("Plan validation failed", report);
  }

  // Proceed
  return await adapter.startRun(plan, ctx);
}
```

## Extending Capabilities

When adding a new capability:

1. Add to `capabilities.schema.json` enum (in appropriate category: signaling, cancellation, etc.).
2. Update which adapters support it in `adapters.capabilities.json`.
3. Update ExecutionPlan validation rule (if gating a new feature, add to Phase roadmap).
4. Version changes: If breaking (removing capability, changing semantics), bump contract version.

## References

- [IWorkflowEngine.v1.md](../engine/IWorkflowEngine.v1.md)
- [ExecutionSemantics.v1.md](../engine/ExecutionSemantics.v1.md)
- [TemporalAdapter.spec.md](../../adapters/temporal/TemporalAdapter.spec.md)
- [Temporal Capabilities](https://docs.temporal.io/)
- [Conductor Capabilities](https://conductor.netflix.com/)
