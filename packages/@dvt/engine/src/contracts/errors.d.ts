/**
 * @file packages/@dvt/engine/src/contracts/errors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The engine's error hierarchy encodes domain failures with stable codes
 * @consequence Integrations and observability can handle errors deterministically without fragile message parsing
 * @version 1.0.0
 * @date 2026-02-21
 */
/**
 * Typed error hierarchy for the DVT engine.
 *
 * Callers should assert on `.code` (stable string constant), not on `.message`
 * (human-readable, may change). All errors carry an optional `runId` so that
 * log aggregators can correlate without message parsing.
 */
export declare class DvtError extends Error {
  readonly code: string;
  readonly runId?: string | undefined;
  readonly cause: unknown;
  readonly details: Record<string, unknown> | undefined;
  constructor(
    code: string,
    message: string,
    runId?: string | undefined,
    opts?: {
      cause?: unknown;
      details?: Record<string, unknown>;
    }
  );
  toJSON(): Record<string, unknown>;
}
export declare class RunNotFoundError extends DvtError {
  constructor(runId: string);
}
export declare class RunAlreadyExistsError extends DvtError {
  constructor(runId: string);
}
export declare class AdapterNotRegisteredError extends DvtError {
  constructor(provider: string);
}
export declare class TenantAccessDeniedError extends DvtError {
  constructor(tenantId: string);
}
export declare class CapabilitiesNotSupportedError extends DvtError {
  constructor(capabilities: string[], provider?: string);
}
export declare class TargetAdapterMismatchError extends DvtError {
  constructor(planRequires: string, contextHas: string);
}
export declare class InvalidRunIdError extends DvtError {
  constructor(runId: string);
}
export declare class InvalidSchemaVersionError extends DvtError {
  constructor(schemaVersion: string);
}
export declare class RunMetadataNotFoundError extends DvtError {
  constructor(runId: string);
}
export declare class SignalNotImplementedError extends DvtError {
  constructor(signalType: string);
}
export declare class OutboxRateLimitExceededError extends DvtError {
  constructor(tenantId: string);
}
//# sourceMappingURL=errors.d.ts.map
