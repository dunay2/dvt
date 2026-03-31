export const MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND = {
  unsupportedScheme: 'unsupported_scheme',
  invalidArtifactLocator: 'invalid_artifact_locator',
  fileSchemeProhibited: 'file_scheme_prohibited',
  artifactNotFound: 'artifact_not_found',
  integrityMismatch: 'integrity_mismatch',
  invalidManifestPayload: 'invalid_manifest_payload',
} as const;

export type ManifestArtifactResolutionErrorKind =
  (typeof MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND)[keyof typeof MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND];

const MANIFEST_ARTIFACT_RESOLUTION_REASON: Record<ManifestArtifactResolutionErrorKind, string> = {
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme]:
    'Unsupported manifestRef URI scheme.',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidArtifactLocator]:
    'Manifest artifact locator is invalid.',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.fileSchemeProhibited]:
    'file:// manifestRef is not allowed in production.',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound]:
    'Manifest artifact could not be found.',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.integrityMismatch]:
    'Manifest artifact integrity mismatch.',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload]:
    'Manifest artifact payload is invalid.',
};

const MANIFEST_ARTIFACT_REJECTION_CAUSE: Record<ManifestArtifactResolutionErrorKind, string> = {
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme]:
    'manifest_ref_unsupported_scheme',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidArtifactLocator]:
    'manifest_ref_invalid_locator',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.fileSchemeProhibited]:
    'manifest_ref_file_scheme_prohibited',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound]: 'manifest_ref_not_found',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.integrityMismatch]:
    'manifest_ref_integrity_mismatch',
  [MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload]:
    'manifest_ref_invalid_payload',
};

export class ManifestArtifactResolutionError extends Error {
  public readonly name = 'ManifestArtifactResolutionError';
  public readonly detail: string | undefined;

  public constructor(
    public readonly kind: ManifestArtifactResolutionErrorKind,
    message: string,
    options?: { readonly cause?: unknown; readonly detail?: string }
  ) {
    super(message, options);
    this.detail = options?.detail;
  }
}

export function isManifestArtifactResolutionError(
  error: unknown
): error is ManifestArtifactResolutionError {
  return error instanceof ManifestArtifactResolutionError;
}

export function formatManifestArtifactResolutionReason(
  kind: ManifestArtifactResolutionErrorKind,
  detail?: string
): string {
  if (
    (kind !== MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme &&
      kind !== MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidArtifactLocator) ||
    !detail
  ) {
    return MANIFEST_ARTIFACT_RESOLUTION_REASON[kind];
  }
  if (kind === MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme) {
    return `Unsupported manifestRef URI scheme: ${detail}.`;
  }

  return `Manifest artifact locator is invalid: ${detail}.`;
}

export function mapManifestArtifactResolutionCause(
  kind: ManifestArtifactResolutionErrorKind
): string {
  return MANIFEST_ARTIFACT_REJECTION_CAUSE[kind];
}
