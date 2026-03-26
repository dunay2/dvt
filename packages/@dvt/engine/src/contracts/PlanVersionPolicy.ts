import { isSupportedExecutionPlanVersion, SUPPORTED_EXECUTION_PLAN_VERSIONS } from '@dvt/contracts';

import { ENGINE_ERROR_MESSAGE_KEY } from './errors/errorMessages.js';
import { DvtError, ENGINE_ERROR_CODE } from './errors.js';

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

export function assertSupportedPlanVersion(planVersion: string): void {
  const normalized = planVersion.trim();
  if (!normalized || !isSupportedExecutionPlanVersion(normalized)) {
    throw new UnsupportedPlanVersionError({
      planVersion,
      supportedVersions: [...SUPPORTED_EXECUTION_PLAN_VERSIONS],
    });
  }
}
