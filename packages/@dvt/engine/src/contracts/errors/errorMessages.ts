import type { PlanUriPolicyReason } from '../planUriPolicyViolation.js';

import type { EngineErrorCode } from './errorCodes.js';

export const ENGINE_ERROR_MESSAGE_KEY = {
  RUN_NOT_FOUND: 'engine.error.run_not_found',
  RUN_ALREADY_EXISTS: 'engine.error.run_already_exists',
  ADAPTER_NOT_REGISTERED: 'engine.error.adapter_not_registered',
  TENANT_ACCESS_DENIED: 'engine.error.tenant_access_denied',
  CAPABILITIES_NOT_SUPPORTED: 'engine.error.capabilities_not_supported',
  TARGET_ADAPTER_MISMATCH: 'engine.error.target_adapter_mismatch',
  INVALID_RUN_ID: 'engine.error.invalid_run_id',
  PLAN_SCHEMA_VERSION_UNKNOWN: 'engine.error.plan_schema_version_unknown',
  RUN_METADATA_NOT_FOUND: 'engine.error.run_metadata_not_found',
  SIGNAL_NOT_IMPLEMENTED: 'engine.error.signal_not_implemented',
  OUTBOX_RATE_LIMIT_EXCEEDED: 'engine.error.outbox_rate_limit_exceeded',
  PLAN_URI_NOT_ALLOWED: 'engine.error.plan_uri_not_allowed',
  INVALID_STATE_TRANSITION: 'engine.error.invalid_state_transition',
  UNSUPPORTED_PLAN_VERSION: 'engine.error.unsupported_plan_version',
  INVALID_RUN_EVENT_INPUT: 'engine.error.invalid_run_event_input',
  RUN_SEQUENCE_OVERFLOW: 'engine.error.run_sequence_overflow',
  RUN_EXECUTION_CONTEXT_REJECTED: 'engine.error.run_execution_context_rejected',
} as const satisfies Record<EngineErrorCode, string>;

export type EngineErrorMessageKey =
  (typeof ENGINE_ERROR_MESSAGE_KEY)[keyof typeof ENGINE_ERROR_MESSAGE_KEY];

interface EngineErrorMessageParamMap {
  RUN_NOT_FOUND: { runId: string };
  RUN_ALREADY_EXISTS: { runId: string };
  ADAPTER_NOT_REGISTERED: { provider: string };
  TENANT_ACCESS_DENIED: { tenantId: string };
  CAPABILITIES_NOT_SUPPORTED: { capabilities: string[]; provider?: string };
  TARGET_ADAPTER_MISMATCH: { planRequires: string; contextHas: string };
  INVALID_RUN_ID: { runId: string };
  PLAN_SCHEMA_VERSION_UNKNOWN: { schemaVersion: string };
  RUN_METADATA_NOT_FOUND: { runId: string };
  SIGNAL_NOT_IMPLEMENTED: { signalType: string };
  OUTBOX_RATE_LIMIT_EXCEEDED: { tenantId: string };
  PLAN_URI_NOT_ALLOWED: { uri: string; reason: PlanUriPolicyReason; subject?: string };
  INVALID_STATE_TRANSITION: {
    runId: string;
    fromStatus: string;
    eventType: string;
    stepId?: string;
  };
  UNSUPPORTED_PLAN_VERSION: { planVersion: string; supportedVersions: readonly string[] };
  INVALID_RUN_EVENT_INPUT: { reason: string; index?: number; runId?: string };
  RUN_SEQUENCE_OVERFLOW: { runId: string; attemptedRunSeq: number };
  RUN_EXECUTION_CONTEXT_REJECTED: { reason: string };
}

export type EngineErrorMessageParams<C extends EngineErrorCode = EngineErrorCode> = Readonly<
  EngineErrorMessageParamMap[C]
>;

export function defaultEngineErrorMessage<C extends EngineErrorCode>(
  code: C,
  params: EngineErrorMessageParams<C>
): string {
  switch (code) {
    case 'RUN_NOT_FOUND': {
      const p = params as EngineErrorMessageParams<'RUN_NOT_FOUND'>;
      return `Run not found: ${p.runId}`;
    }
    case 'RUN_ALREADY_EXISTS': {
      const p = params as EngineErrorMessageParams<'RUN_ALREADY_EXISTS'>;
      return `Run already exists: ${p.runId}`;
    }
    case 'ADAPTER_NOT_REGISTERED': {
      const p = params as EngineErrorMessageParams<'ADAPTER_NOT_REGISTERED'>;
      return `No adapter registered for provider: ${p.provider}`;
    }
    case 'TENANT_ACCESS_DENIED': {
      const p = params as EngineErrorMessageParams<'TENANT_ACCESS_DENIED'>;
      return `Tenant access denied: ${p.tenantId}`;
    }
    case 'CAPABILITIES_NOT_SUPPORTED': {
      const p = params as EngineErrorMessageParams<'CAPABILITIES_NOT_SUPPORTED'>;
      const who = p.provider ? ` by adapter '${p.provider}'` : '';
      return `Required capabilities not supported${who}: [${p.capabilities.join(', ')}]`;
    }
    case 'TARGET_ADAPTER_MISMATCH': {
      const p = params as EngineErrorMessageParams<'TARGET_ADAPTER_MISMATCH'>;
      return `Plan requires adapter '${p.planRequires}', context specifies '${p.contextHas}'`;
    }
    case 'INVALID_RUN_ID': {
      const p = params as EngineErrorMessageParams<'INVALID_RUN_ID'>;
      return `Invalid runId format: ${p.runId}`;
    }
    case 'PLAN_SCHEMA_VERSION_UNKNOWN': {
      const p = params as EngineErrorMessageParams<'PLAN_SCHEMA_VERSION_UNKNOWN'>;
      return `Unsupported plan schema version: ${p.schemaVersion}`;
    }
    case 'RUN_METADATA_NOT_FOUND': {
      const p = params as EngineErrorMessageParams<'RUN_METADATA_NOT_FOUND'>;
      return `Run metadata not found for runId: ${p.runId}`;
    }
    case 'SIGNAL_NOT_IMPLEMENTED': {
      const p = params as EngineErrorMessageParams<'SIGNAL_NOT_IMPLEMENTED'>;
      return `NotImplemented: ${p.signalType} signals are Phase 2`;
    }
    case 'OUTBOX_RATE_LIMIT_EXCEEDED': {
      const p = params as EngineErrorMessageParams<'OUTBOX_RATE_LIMIT_EXCEEDED'>;
      return `Outbox rate limit exceeded for tenant: ${p.tenantId}`;
    }
    case 'PLAN_URI_NOT_ALLOWED': {
      const p = params as EngineErrorMessageParams<'PLAN_URI_NOT_ALLOWED'>;
      const reasonDetail = p.subject === undefined ? p.reason : `${p.reason}:${p.subject}`;
      return `Plan URI not allowed - ${reasonDetail}: ${p.uri}`;
    }
    case 'INVALID_STATE_TRANSITION': {
      const p = params as EngineErrorMessageParams<'INVALID_STATE_TRANSITION'>;
      const subject = p.stepId ? `step ${p.stepId}` : 'run';
      return `Cannot apply ${p.eventType} to ${subject} already in terminal status ${p.fromStatus}: runId=${p.runId}`;
    }
    case 'UNSUPPORTED_PLAN_VERSION': {
      const p = params as EngineErrorMessageParams<'UNSUPPORTED_PLAN_VERSION'>;
      return `Unsupported plan version "${p.planVersion}". Supported versions: ${p.supportedVersions.join(', ')}`;
    }
    case 'INVALID_RUN_EVENT_INPUT': {
      const p = params as EngineErrorMessageParams<'INVALID_RUN_EVENT_INPUT'>;
      const location = p.index === undefined ? '' : ` at index ${p.index}`;
      const run = p.runId === undefined ? '' : ` (runId=${p.runId})`;
      return `Invalid run event input: ${p.reason}${location}${run}`;
    }
    case 'RUN_SEQUENCE_OVERFLOW': {
      const p = params as EngineErrorMessageParams<'RUN_SEQUENCE_OVERFLOW'>;
      return `Run sequence overflow for runId=${p.runId}: attempted runSeq=${p.attemptedRunSeq}`;
    }
    case 'RUN_EXECUTION_CONTEXT_REJECTED': {
      const p = params as EngineErrorMessageParams<'RUN_EXECUTION_CONTEXT_REJECTED'>;
      return `Run execution context rejected: ${p.reason}`;
    }
  }
  return assertNever(code);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled engine error code: ${String(value)}`);
}
