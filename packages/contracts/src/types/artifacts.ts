/**
 * Artifact Types (v1.0)
 *
 * TypeScript types for artifact references and step outputs
 */

export interface ArtifactRef {
  uri: string;
  kind: string;
  sha256?: string;
  sizeBytes?: number;
  expiresAt?: string;
}

export interface StepError {
  category: string;
  code?: string;
  message: string;
  retryable?: boolean;
}

export interface StepOutput {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  artifactRefs: ArtifactRef[];
  error?: StepError;
}

export interface SecretRef {
  secretId: string;
  key: string;
  version?: string;
}

export interface ISecretsProvider {
  resolve(
    refs: SecretRef[],
    ctx: { tenantId: string; environmentId: string }
  ): Promise<Record<string, string>>;
}
