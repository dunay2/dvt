import type { PlanUriPolicyViolation } from '../planUriPolicyViolation.js';

import { DvtError } from './baseError.js';
import { ENGINE_ERROR_CODE } from './errorCodes.js';
import { ENGINE_ERROR_MESSAGE_KEY } from './errorMessages.js';

export class InvalidSchemaVersionError extends DvtError {
  constructor(schemaVersion: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.PLAN_SCHEMA_VERSION_UNKNOWN;
    const messageParams = { schemaVersion };
    super(ENGINE_ERROR_CODE.PLAN_SCHEMA_VERSION_UNKNOWN, messageKey, undefined, {
      messageKey,
      messageParams,
    });
    this.name = 'InvalidSchemaVersionError';
  }
}

export class PlanUriNotAllowedError extends DvtError {
  constructor(uri: string, violation: PlanUriPolicyViolation) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.PLAN_URI_NOT_ALLOWED;
    const messageParams = { uri, ...violation };
    super(ENGINE_ERROR_CODE.PLAN_URI_NOT_ALLOWED, messageKey, undefined, {
      details: { uri, ...violation },
      messageKey,
      messageParams,
    });
    this.name = 'PlanUriNotAllowedError';
  }
}

export class RunExecutionContextRejectedError extends DvtError {
  constructor(reason: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_EXECUTION_CONTEXT_REJECTED;
    const messageParams = { reason };
    super(ENGINE_ERROR_CODE.RUN_EXECUTION_CONTEXT_REJECTED, messageKey, undefined, {
      details: { reason },
      messageKey,
      messageParams,
    });
    this.name = 'RunExecutionContextRejectedError';
  }
}
