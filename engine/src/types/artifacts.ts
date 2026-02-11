/**
 * Artifact Types (v1.0)
 *
 * TypeScript types for artifact references and step outputs
 * @see {@link /home/runner/work/dvt/dvt/docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md} § 2 - Secrets & Artifacts
 */

/**
 * Reference to an artifact stored externally
 * Artifacts are never stored in workflow history, only references
 * @see ExecutionSemantics.v1.md § 2 - Secrets & Artifacts
 * @see ExecutionSemantics.v1.md § 6.2 - ArtifactRef
 */
export interface ArtifactRef {
  /** URI to the artifact (e.g., s3://..., gs://..., azure://...) */
  uri: string;
  /** Artifact kind (e.g., "dbt-manifest", "dbt-run-results", "log-bundle") */
  kind: string;
  /** SHA256 hash of artifact content (optional) */
  sha256?: string;
  /** Size in bytes (optional) */
  sizeBytes?: number;
  /** Expiration timestamp for retention policy (ISO 8601, optional) */
  expiresAt?: string;
}

/**
 * Error information for failed steps
 * @see ExecutionSemantics.v1.md § 2 - Secrets & Artifacts
 */
export interface StepError {
  /** Error category */
  category: string;
  /** Error code (optional) */
  code?: string;
  /** Error message */
  message: string;
  /** Whether the error is retryable (optional) */
  retryable?: boolean;
}

/**
 * Output from a step execution
 * @see ExecutionSemantics.v1.md § 2 - Secrets & Artifacts
 */
export interface StepOutput {
  /** Step execution status */
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  /** References to artifacts produced by the step */
  artifactRefs: ArtifactRef[];
  /** Error information (present when status is FAILED) */
  error?: StepError;
}

/**
 * Secret reference (never contains actual secret values)
 * @see ExecutionSemantics.v1.md § 2 - Secrets & Artifacts
 */
export interface SecretRef {
  /** Secret identifier */
  secretId: string;
  /** Secret key/name */
  key: string;
  /** Secret version (optional) */
  version?: string;
}

/**
 * Secrets provider interface for resolving secret references
 * @see ExecutionSemantics.v1.md § 2 - Secrets & Artifacts
 */
export interface ISecretsProvider {
  /**
   * Resolve secret references to their actual values
   * @param refs - Array of secret references to resolve
   * @param ctx - Context for secret resolution (tenant, environment)
   * @returns Map of secret keys to their resolved values
   */
  resolve(
    refs: SecretRef[],
    ctx: {
      tenantId: string;
      environmentId: string;
    }
  ): Promise<Record<string, string>>;
}
