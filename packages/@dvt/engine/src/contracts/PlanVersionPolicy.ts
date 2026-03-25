import { isSupportedExecutionPlanVersion, SUPPORTED_EXECUTION_PLAN_VERSIONS } from '@dvt/contracts';

import { DvtError } from './errors.js';

export class UnsupportedPlanVersionError extends DvtError {
  constructor(
    public readonly planVersion: string,
    public readonly supportedVersions: readonly string[]
  ) {
    super(
      'UNSUPPORTED_PLAN_VERSION',
      `Unsupported plan version "${planVersion}". Supported versions: ${supportedVersions.join(', ')}`,
      undefined,
      { details: { planVersion, supportedVersions: [...supportedVersions] } }
    );
    this.name = 'UnsupportedPlanVersionError';
  }
}

export function assertSupportedPlanVersion(planVersion: string): void {
  const normalized = planVersion.trim();
  if (!normalized || !isSupportedExecutionPlanVersion(normalized)) {
    throw new UnsupportedPlanVersionError(planVersion, [...SUPPORTED_EXECUTION_PLAN_VERSIONS]);
  }
}
