/**
 * Owned concern: fail closed at engine ingress when a PlanRef names a
 * planVersion/schemaVersion pair that the runtime admission matrix does not admit.
 */
import {
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
  isAdmittedExecutionPlanPair,
  isSupportedExecutionPlanVersion,
} from '@dvt/contracts';

import { ENGINE_ERROR_MESSAGE_KEY } from './errors/errorMessages.js';
import { DvtError, ENGINE_ERROR_CODE, InvalidSchemaVersionError } from './errors.js';

export class UnsupportedPlanVersionError extends DvtError {
  readonly planVersion: string;
  readonly supportedVersions: readonly string[];

  constructor(params: { planVersion: string; supportedVersions: readonly string[] }) {
    const { planVersion, supportedVersions } = params;
    const messageKey = ENGINE_ERROR_MESSAGE_KEY.UNSUPPORTED_PLAN_VERSION;
    const messageParams = { planVersion, supportedVersions };
    super(ENGINE_ERROR_CODE.UNSUPPORTED_PLAN_VERSION, messageKey, undefined, {
      details: { planVersion, supportedVersions: [...supportedVersions] },
      messageKey,
      messageParams,
    });
    this.planVersion = planVersion;
    this.supportedVersions = supportedVersions;
    this.name = 'UnsupportedPlanVersionError';
  }
}

export function assertAdmittedPlanPair(input: {
  planVersion: string;
  schemaVersion: string;
}): void {
  const planVersion = input.planVersion.trim();
  const schemaVersion = input.schemaVersion.trim();

  if (!planVersion || !schemaVersion) throw new InvalidSchemaVersionError(input.schemaVersion);

  if (!isSupportedExecutionPlanVersion(planVersion)) {
    throw new UnsupportedPlanVersionError({
      planVersion: input.planVersion,
      supportedVersions: [...SUPPORTED_EXECUTION_PLAN_VERSIONS],
    });
  }

  if (!isAdmittedExecutionPlanPair(planVersion, schemaVersion)) {
    throw new InvalidSchemaVersionError(input.schemaVersion);
  }
}
