/**
 * @file packages/@dvt/contracts/src/types/artifacts.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @decision Section 2 — Artifact and step output contracts are centralized for execution result interoperability
 * @consequence Producers and consumers exchange deterministic artifact payload shapes across workflow boundaries
 * @version 1.0.0
 * @date 2026-02-21
 */
/**
 * Artifact Types (v1.1)
 *
 * TypeScript types for artifact references and step outputs.
 * CompiledCodeBlob moved here from @dvt/traceability-service (G-6: canonical port types
 * must live in @dvt/contracts, not in feature packages).
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

/**
 * Materialized content of a compiled SQL artifact.
 * Canonical form returned by ICompiledCodeReader.read().
 * Moved from @dvt/traceability-service/src/lineage/types.ts (G-6).
 */
export interface CompiledCodeBlob {
  /** Original storageUri from which the blob was resolved. */
  sourceUri: string;
  /** The SQL text content. */
  sqlText: string;
  /** SHA-256 hex digest — MUST match the CompiledCodeRef.sha256. */
  sha256: string;
  sizeBytes: number;
  encoding: 'utf-8';
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
