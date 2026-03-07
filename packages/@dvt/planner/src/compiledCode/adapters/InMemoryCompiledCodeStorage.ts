import { ArtifactStoreError } from '@dvt/contracts';

import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export interface InMemoryCompiledCodeStorageOptions {
  store?: Map<string, Buffer>;
}

export class InMemoryCompiledCodeStorage implements ICompiledCodeStorage {
  /** @internal Exposed for test inspection. Prefer getContent() / has() for type-safe access. */
  public readonly store: Map<string, Buffer>;

  constructor(options?: InMemoryCompiledCodeStorageOptions) {
    this.store = options?.store ?? new Map<string, Buffer>();
  }

  private storeKey(tenantId: string, sha256: string): string {
    return `${tenantId}:${sha256}`;
  }

  async upload(tenantId: string, sha256: string, content: Buffer): Promise<string> {
    this.store.set(this.storeKey(tenantId, sha256), content);
    return `mem://${tenantId}/${sha256}`;
  }

  async read(tenantId: string, sha256: string): Promise<Buffer> {
    const content = this.store.get(this.storeKey(tenantId, sha256));
    if (content === undefined) {
      throw new ArtifactStoreError(
        `Artifact not found: tenant=${tenantId} sha256=${sha256}`,
        'ARTIFACT_NOT_FOUND'
      );
    }
    return content;
  }

  async exists(tenantId: string, sha256: string): Promise<boolean> {
    return this.store.has(this.storeKey(tenantId, sha256));
  }

  /** Type-safe test helper — prefer over direct store access. */
  getContent(tenantId: string, sha256: string): Buffer | undefined {
    return this.store.get(this.storeKey(tenantId, sha256));
  }

  /** Type-safe test helper. */
  has(tenantId: string, sha256: string): boolean {
    return this.store.has(this.storeKey(tenantId, sha256));
  }
}
