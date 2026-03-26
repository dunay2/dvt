import { DvtError } from './baseError.js';
import { ENGINE_ERROR_CODE } from './errorCodes.js';
import { ENGINE_ERROR_MESSAGE_KEY } from './errorMessages.js';

export class RunNotFoundError extends DvtError {
  constructor(runId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_NOT_FOUND;
    const messageParams = { runId };
    super(ENGINE_ERROR_CODE.RUN_NOT_FOUND, messageKey, runId, {
      messageKey,
      messageParams,
    });
    this.name = 'RunNotFoundError';
  }
}

export class RunAlreadyExistsError extends DvtError {
  constructor(runId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_ALREADY_EXISTS;
    const messageParams = { runId };
    super(ENGINE_ERROR_CODE.RUN_ALREADY_EXISTS, messageKey, runId, {
      messageKey,
      messageParams,
    });
    this.name = 'RunAlreadyExistsError';
  }
}

export class InvalidRunIdError extends DvtError {
  constructor(runId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.INVALID_RUN_ID;
    const messageParams = { runId };
    super(ENGINE_ERROR_CODE.INVALID_RUN_ID, messageKey, runId, {
      messageKey,
      messageParams,
    });
    this.name = 'InvalidRunIdError';
  }
}

export class RunMetadataNotFoundError extends DvtError {
  constructor(runId: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_METADATA_NOT_FOUND;
    const messageParams = { runId };
    super(ENGINE_ERROR_CODE.RUN_METADATA_NOT_FOUND, messageKey, runId, {
      messageKey,
      messageParams,
    });
    this.name = 'RunMetadataNotFoundError';
  }
}

export interface InvalidStateTransitionParams {
  runId: string;
  fromStatus: string;
  eventType: string;
  stepId?: string;
}

export class InvalidStateTransitionError extends DvtError {
  constructor(params: InvalidStateTransitionParams) {
    const { runId, fromStatus, eventType, stepId } = params;
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.INVALID_STATE_TRANSITION;
    const messageParams = {
      runId,
      fromStatus,
      eventType,
      ...(stepId === undefined ? {} : { stepId }),
    };
    super(ENGINE_ERROR_CODE.INVALID_STATE_TRANSITION, messageKey, runId, {
      details: { fromStatus, eventType, ...(stepId !== undefined ? { stepId } : {}) },
      messageKey,
      messageParams,
    });
    this.name = 'InvalidStateTransitionError';
  }
}
