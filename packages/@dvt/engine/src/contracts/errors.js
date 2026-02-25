'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.OutboxRateLimitExceededError =
  exports.SignalNotImplementedError =
  exports.RunMetadataNotFoundError =
  exports.InvalidSchemaVersionError =
  exports.InvalidRunIdError =
  exports.TargetAdapterMismatchError =
  exports.CapabilitiesNotSupportedError =
  exports.TenantAccessDeniedError =
  exports.AdapterNotRegisteredError =
  exports.RunAlreadyExistsError =
  exports.RunNotFoundError =
  exports.DvtError =
    void 0;
class DvtError extends Error {
  constructor(code, message, runId, opts) {
    super(message);
    this.code = code;
    this.runId = runId;
    // Declared as T | undefined (not optional ?) to satisfy exactOptionalPropertyTypes.
    this.cause = undefined;
    this.details = undefined;
    this.name = 'DvtError';
    this.cause = opts?.cause;
    this.details = opts?.details;
    // Ensure prototype chain is correct when extending built-ins in TS.
    Object.setPrototypeOf(this, new.target.prototype);
  }
  toJSON() {
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
    };
  }
}
exports.DvtError = DvtError;
class RunNotFoundError extends DvtError {
  constructor(runId) {
    super('RUN_NOT_FOUND', `Run not found: ${runId}`, runId);
    this.name = 'RunNotFoundError';
  }
}
exports.RunNotFoundError = RunNotFoundError;
class RunAlreadyExistsError extends DvtError {
  constructor(runId) {
    super('RUN_ALREADY_EXISTS', `Run already exists: ${runId}`, runId);
    this.name = 'RunAlreadyExistsError';
  }
}
exports.RunAlreadyExistsError = RunAlreadyExistsError;
class AdapterNotRegisteredError extends DvtError {
  constructor(provider) {
    super('ADAPTER_NOT_REGISTERED', `No adapter registered for provider: ${provider}`);
    this.name = 'AdapterNotRegisteredError';
  }
}
exports.AdapterNotRegisteredError = AdapterNotRegisteredError;
class TenantAccessDeniedError extends DvtError {
  constructor(tenantId) {
    super('TENANT_ACCESS_DENIED', `Tenant access denied: ${tenantId}`);
    this.name = 'TenantAccessDeniedError';
  }
}
exports.TenantAccessDeniedError = TenantAccessDeniedError;
class CapabilitiesNotSupportedError extends DvtError {
  constructor(capabilities, provider) {
    const who = provider ? ` by adapter '${provider}'` : '';
    const details = { unsupported: capabilities };
    if (provider !== undefined) details['provider'] = provider;
    super(
      'CAPABILITIES_NOT_SUPPORTED',
      `Required capabilities not supported${who}: [${capabilities.join(', ')}]`,
      undefined,
      { details }
    );
    this.name = 'CapabilitiesNotSupportedError';
  }
}
exports.CapabilitiesNotSupportedError = CapabilitiesNotSupportedError;
class TargetAdapterMismatchError extends DvtError {
  constructor(planRequires, contextHas) {
    super(
      'TARGET_ADAPTER_MISMATCH',
      `Plan requires adapter '${planRequires}', context specifies '${contextHas}'`
    );
    this.name = 'TargetAdapterMismatchError';
  }
}
exports.TargetAdapterMismatchError = TargetAdapterMismatchError;
class InvalidRunIdError extends DvtError {
  constructor(runId) {
    super('INVALID_RUN_ID', `Invalid runId format: ${runId}`, runId);
    this.name = 'InvalidRunIdError';
  }
}
exports.InvalidRunIdError = InvalidRunIdError;
class InvalidSchemaVersionError extends DvtError {
  constructor(schemaVersion) {
    super('PLAN_SCHEMA_VERSION_UNKNOWN', `Unsupported plan schema version: ${schemaVersion}`);
    this.name = 'InvalidSchemaVersionError';
  }
}
exports.InvalidSchemaVersionError = InvalidSchemaVersionError;
class RunMetadataNotFoundError extends DvtError {
  constructor(runId) {
    super('RUN_METADATA_NOT_FOUND', `Run metadata not found for runId: ${runId}`, runId);
    this.name = 'RunMetadataNotFoundError';
  }
}
exports.RunMetadataNotFoundError = RunMetadataNotFoundError;
class SignalNotImplementedError extends DvtError {
  constructor(signalType) {
    super('SIGNAL_NOT_IMPLEMENTED', `NotImplemented: ${signalType} signals are Phase 2`);
    this.name = 'SignalNotImplementedError';
  }
}
exports.SignalNotImplementedError = SignalNotImplementedError;
class OutboxRateLimitExceededError extends DvtError {
  constructor(tenantId) {
    super('OUTBOX_RATE_LIMIT_EXCEEDED', `Outbox rate limit exceeded for tenant: ${tenantId}`);
    this.name = 'OutboxRateLimitExceededError';
  }
}
exports.OutboxRateLimitExceededError = OutboxRateLimitExceededError;
//# sourceMappingURL=errors.js.map
