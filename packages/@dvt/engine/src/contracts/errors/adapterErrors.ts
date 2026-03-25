import { DvtError } from './baseError.js';
import { ENGINE_ERROR_CODE } from './errorCodes.js';
import { ENGINE_ERROR_MESSAGE_KEY } from './errorMessages.js';

export class AdapterNotRegisteredError extends DvtError {
  constructor(provider: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.ADAPTER_NOT_REGISTERED;
    const messageParams = { provider };
    super(ENGINE_ERROR_CODE.ADAPTER_NOT_REGISTERED, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'AdapterNotRegisteredError';
  }
}

export class TenantAccessDeniedError extends DvtError {
  constructor(tenantId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.TENANT_ACCESS_DENIED;
    const messageParams = { tenantId };
    super(ENGINE_ERROR_CODE.TENANT_ACCESS_DENIED, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'TenantAccessDeniedError';
  }
}

export class CapabilitiesNotSupportedError extends DvtError {
  constructor(params: { capabilities: string[]; provider?: string }) {
    const { capabilities, provider } = params;
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.CAPABILITIES_NOT_SUPPORTED;
    const details: Record<string, unknown> = { unsupported: capabilities };
    if (provider !== undefined) details['provider'] = provider;
    const messageParams = { capabilities, ...(provider === undefined ? {} : { provider }) };
    super(ENGINE_ERROR_CODE.CAPABILITIES_NOT_SUPPORTED, messageKey, undefined, {
      details,
      messageKey,
      messageParams,
    });
    this.name = 'CapabilitiesNotSupportedError';
  }
}

export interface TargetAdapterMismatchParams {
  planRequires: string;
  contextHas: string;
}

export class TargetAdapterMismatchError extends DvtError {
  constructor(params: TargetAdapterMismatchParams) {
    const { planRequires, contextHas } = params;
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.TARGET_ADAPTER_MISMATCH;
    const messageParams = { planRequires, contextHas };
    super(ENGINE_ERROR_CODE.TARGET_ADAPTER_MISMATCH, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'TargetAdapterMismatchError';
  }
}

export class SignalNotImplementedError extends DvtError {
  constructor(signalType: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.SIGNAL_NOT_IMPLEMENTED;
    const messageParams = { signalType };
    super(ENGINE_ERROR_CODE.SIGNAL_NOT_IMPLEMENTED, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'SignalNotImplementedError';
  }
}

export class OutboxRateLimitExceededError extends DvtError {
  constructor(tenantId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.OUTBOX_RATE_LIMIT_EXCEEDED;
    const messageParams = { tenantId };
    super(ENGINE_ERROR_CODE.OUTBOX_RATE_LIMIT_EXCEEDED, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'OutboxRateLimitExceededError';
  }
}
