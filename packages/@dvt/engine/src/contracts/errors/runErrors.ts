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
  constructor(runId: string, options?: { cause?: unknown }) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_ALREADY_EXISTS;
    const messageParams = { runId };
    super(ENGINE_ERROR_CODE.RUN_ALREADY_EXISTS, messageKey, runId, {
      cause: options?.cause,
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

export interface InvalidRunEventInputParams {
  reason: string;
  index?: number;
  runId?: string;
}

export class InvalidRunEventInputError extends DvtError {
  constructor(params: InvalidRunEventInputParams) {
    const { reason, index, runId } = params;
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.INVALID_RUN_EVENT_INPUT;
    const messageParams = {
      reason,
      ...(index === undefined ? {} : { index }),
      ...(runId === undefined ? {} : { runId }),
    };
    super(ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT, messageKey, runId, {
      details: messageParams,
      messageKey,
      messageParams,
    });
    this.name = 'InvalidRunEventInputError';
  }
}

export class RunSequenceOverflowError extends DvtError {
  constructor(runId: string, attemptedRunSeq: number) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RUN_SEQUENCE_OVERFLOW;
    const messageParams = { runId, attemptedRunSeq };
    super(ENGINE_ERROR_CODE.RUN_SEQUENCE_OVERFLOW, messageKey, runId, {
      details: messageParams,
      messageKey,
      messageParams,
    });
    this.name = 'RunSequenceOverflowError';
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

export class ProviderRefProviderMismatchError extends DvtError {
  constructor(runId: string, persistedProvider: string, updateProvider: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.PROVIDER_REF_PROVIDER_MISMATCH;
    const messageParams = { runId, persistedProvider, updateProvider };
    super(ENGINE_ERROR_CODE.PROVIDER_REF_PROVIDER_MISMATCH, messageKey, runId, {
      details: messageParams,
      messageKey,
      messageParams,
    });
    this.name = 'ProviderRefProviderMismatchError';
  }
}

export class RecoverySourceNotTerminalError extends DvtError {
  constructor(runId: string, status: string) {
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.RECOVERY_SOURCE_NOT_TERMINAL;
    const messageParams = { runId, status };
    super(ENGINE_ERROR_CODE.RECOVERY_SOURCE_NOT_TERMINAL, messageKey, runId, {
      details: messageParams,
      messageKey,
      messageParams,
    });
    this.name = 'RecoverySourceNotTerminalError';
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
