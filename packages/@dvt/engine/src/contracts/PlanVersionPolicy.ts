export const SUPPORTED_PLAN_VERSIONS = ['2.3'] as const;

export class UnsupportedPlanVersionError extends Error {
  public readonly code = 'UNSUPPORTED_PLAN_VERSION';

  public constructor(
    public readonly planVersion: string,
    public readonly supportedVersions: readonly string[]
  ) {
    super(
      `Unsupported plan version "${planVersion}". Supported versions: ${supportedVersions.join(', ')}`
    );
    this.name = 'UnsupportedPlanVersionError';
  }
}

export function assertSupportedPlanVersion(planVersion: string): void {
  const normalized = planVersion.trim();
  if (normalized.length === 0 || !SUPPORTED_PLAN_VERSIONS.includes(normalized as '2.3')) {
    throw new UnsupportedPlanVersionError(planVersion, SUPPORTED_PLAN_VERSIONS);
  }
}
