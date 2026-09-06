/**
 * @file packages/@dvt/contracts/src/types/artifacts.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Artifact and step output contracts are centralized for execution result interoperability
 * @consequence Producers and consumers exchange deterministic artifact payload shapes across workflow boundaries
 * @version 2.0.0
 * @date 2026-09-05
 */
/**
 * Artifact Types
 *
 * TypeScript types for generic artifact references and step outputs.
 */

export type ArtifactKind =
  | 'execution-plan'
  | 'compiled-sql'
  | 'dbt-project-bundle'
  | 'dbt-manifest'
  | 'dbt-catalog'
  | 'dbt-run-results'
  | 'lineage';

export interface ArtifactRef {
  uri: string;
  kind: ArtifactKind;
  sha256?: string | undefined;
  sizeBytes?: number | undefined;
  expiresAt?: string | undefined;
  tenantId?: string | undefined; // optional for now; will become required after full migration
}

export interface DbtProjectBundleRef extends ArtifactRef {
  uri: string;
  kind: 'dbt-project-bundle';
  sha256: string;
  tenantId: string;
  sizeBytes?: number | undefined;
  expiresAt?: string | undefined;
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
