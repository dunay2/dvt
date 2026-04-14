export type ArtifactReadErrorCode =
  | 'ARTIFACT_URI_INVALID'
  | 'ARTIFACT_URI_UNSUPPORTED'
  | 'ARTIFACT_URI_LOCATOR_INVALID'
  | 'ARTIFACT_FILE_NOT_ALLOWED_IN_PRODUCTION'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_PAYLOAD_INVALID'
  | 'ARTIFACT_INTEGRITY_MISMATCH'
  | 'ARTIFACT_TENANT_MISMATCH'
  | 'ARTIFACT_REF_MISMATCH';

export class ArtifactReadError extends Error {
  public readonly code: ArtifactReadErrorCode;

  public constructor(
    code: ArtifactReadErrorCode,
    message: string,
    options?: {
      cause?: unknown;
    }
  ) {
    super(message, options);
    this.code = code;
    this.name = 'ArtifactReadError';
  }
}
