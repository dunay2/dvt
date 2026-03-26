/**
 * @file packages/@dvt/engine/src/contracts/errors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision - The engine's error hierarchy encodes domain failures with stable codes
 * @consequence Integrations and observability can handle errors deterministically without fragile message parsing
 * @version 1.0.0
 * @date 2026-02-21
 */

export { DvtError } from './errors/baseError.js';
export { ENGINE_ERROR_CODE } from './errors/errorCodes.js';
export type { EngineErrorCode } from './errors/errorCodes.js';
export { ENGINE_ERROR_MESSAGE_KEY, defaultEngineErrorMessage } from './errors/errorMessages.js';
export type { EngineErrorMessageKey, EngineErrorMessageParams } from './errors/errorMessages.js';
export {
  AdapterNotRegisteredError,
  CapabilitiesNotSupportedError,
  OutboxRateLimitExceededError,
  SignalNotImplementedError,
  TargetAdapterMismatchError,
  TenantAccessDeniedError,
} from './errors/adapterErrors.js';
export type { TargetAdapterMismatchParams } from './errors/adapterErrors.js';
export {
  InvalidRunEventInputError,
  InvalidRunIdError,
  InvalidStateTransitionError,
  RunSequenceOverflowError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  RunNotFoundError,
} from './errors/runErrors.js';
export type {
  InvalidRunEventInputParams,
  InvalidStateTransitionParams,
} from './errors/runErrors.js';
export { InvalidSchemaVersionError, PlanUriNotAllowedError } from './errors/planErrors.js';
