/**
 * Typed error hierarchy for the DVT engine.
 *
 * Callers should assert on `.code` (stable string constant), not on `.message`
 * (human-readable, may change). All errors carry an optional `runId` so that
 * log aggregators can correlate without message parsing.
 */

export class DvtError extends Error {
  // Declared as T | undefined (not optional ?) to satisfy exactOptionalPropertyTypes.
  readonly cause: unknown = undefined;
  readonly details: Record<string, unknown> | undefined = undefined;

  constructor(
    readonly code: string,
    message: string,
    readonly runId?: string,
    opts?: { cause?: unknown; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = 'DvtError';
    this.cause = opts?.cause;
    this.details = opts?.details;
    // Ensure prototype chain is correct when extending built-ins in TS.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      runId: this.runId,
      cause:
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause,
      details: this.details,
    } as const;
  }
}

export class RunNotFoundError extends DvtError {
  constructor(runId: string) {
    super('RUN_NOT_FOUND', `Run not found: ${runId}`, runId);
    this.name = 'RunNotFoundError';
  }
}

export class RunAlreadyExistsError extends DvtError {
  constructor(runId: string) {
    super('RUN_ALREADY_EXISTS', `Run already exists: ${runId}`, runId);
    this.name = 'RunAlreadyExistsError';
  }
}

export class AdapterNotRegisteredError extends DvtError {
  constructor(provider: string) {
    super('ADAPTER_NOT_REGISTERED', `No adapter registered for provider: ${provider}`);
    this.name = 'AdapterNotRegisteredError';
  }
}

export class TenantAccessDeniedError extends DvtError {
  constructor(tenantId: string) {
    super('TENANT_ACCESS_DENIED', `Tenant access denied: ${tenantId}`);
    this.name = 'TenantAccessDeniedError';
  }
}

export class CapabilitiesNotSupportedError extends DvtError {
  constructor(capabilities: string[]) {
    super(
      'CAPABILITIES_NOT_SUPPORTED',
      `Phase 1 does not evaluate requiresCapabilities: [${capabilities.join(', ')}]`
    );
    this.name = 'CapabilitiesNotSupportedError';
  }
}

export class TargetAdapterMismatchError extends DvtError {
  constructor(planRequires: string, contextHas: string) {
    super(
      'TARGET_ADAPTER_MISMATCH',
      `Plan requires adapter '${planRequires}', context specifies '${contextHas}'`
    );
    this.name = 'TargetAdapterMismatchError';
  }
}

export class InvalidRunIdError extends DvtError {
  constructor(runId: string) {
    super('INVALID_RUN_ID', `Invalid runId format: ${runId}`, runId);
    this.name = 'InvalidRunIdError';
  }
}

export class InvalidSchemaVersionError extends DvtError {
  constructor(schemaVersion: string) {
    super('PLAN_SCHEMA_VERSION_UNKNOWN', `Unsupported plan schema version: ${schemaVersion}`);
    this.name = 'InvalidSchemaVersionError';
  }
}

export class RunMetadataNotFoundError extends DvtError {
  constructor(runId: string) {
    super('RUN_METADATA_NOT_FOUND', `Run metadata not found for runId: ${runId}`, runId);
    this.name = 'RunMetadataNotFoundError';
  }
}

export class SignalNotImplementedError extends DvtError {
  constructor(signalType: string) {
    super('SIGNAL_NOT_IMPLEMENTED', `NotImplemented: ${signalType} signals are Phase 2`);
    this.name = 'SignalNotImplementedError';
  }
}

export class OutboxRateLimitExceededError extends DvtError {
  constructor(tenantId: string) {
    super('OUTBOX_RATE_LIMIT_EXCEEDED', `Outbox rate limit exceeded for tenant: ${tenantId}`);
    this.name = 'OutboxRateLimitExceededError';
  }
}
