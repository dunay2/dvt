/**
 * Write-side port for compiled SQL blob storage.
 * Design: ADR-0032 5.2 - hexagonal port, swapped via DI.
 */
export interface ICompiledCodeStorage {
  /**
   * Upload compiled SQL blob. Returns the canonical storageUri.
   * MUST be idempotent: uploading the same sha256 twice MUST be safe.
   * MUST NOT throw if the blob already exists.
   */
  upload(sha256: string, content: Buffer): Promise<string>;
}
