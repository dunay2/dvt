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
    resolve(refs: SecretRef[], ctx: {
        tenantId: string;
        environmentId: string;
    }): Promise<Record<string, string>>;
}
//# sourceMappingURL=artifacts.d.ts.map