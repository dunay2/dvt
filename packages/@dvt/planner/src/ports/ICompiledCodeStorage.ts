/**
 * Write-side port for compiled SQL blob storage.
 * Design: ADR-0032 5.2 — hexagonal port, swapped via DI.
 *
 * tenantId added (VIOLATION-3 / G-5): all uploads are tenant-scoped to prevent
 * cross-tenant data leakage in shared-namespace backends (S3, MinIO).
 *
 * read() / exists() added (VIOLATION-2 / P0-3): symmetric read path eliminates the
 * duplicated reader infrastructure in @dvt/traceability-service.
 *
 * Target: promote to IArtifactStore in @dvt/contracts (P0-1). Until then this port
 * is the canonical write+read interface for the planner layer.
 */
export interface ICompiledCodeStorage {
  /**
   * Upload compiled SQL blob under tenant namespace.
   * Returns the canonical storageUri (e.g. s3://bucket/tenants/{tenantId}/{sha256}).
   * MUST be idempotent: same (tenantId, sha256) uploaded twice MUST NOT throw.
   */
  upload(tenantId: string, sha256: string, content: Buffer): Promise<string>;

  /**
   * Retrieve artifact bytes by tenant + content hash.
   * Throws if not found.
   */
  read(tenantId: string, sha256: string): Promise<Buffer>;

  /** Returns true if artifact exists for this tenant. */
  exists(tenantId: string, sha256: string): Promise<boolean>;
}
