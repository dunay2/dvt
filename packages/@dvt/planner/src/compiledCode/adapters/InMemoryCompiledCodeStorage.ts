import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export interface InMemoryCompiledCodeStorageOptions {
  store?: Map<string, Buffer>;
}

export class InMemoryCompiledCodeStorage implements ICompiledCodeStorage {
  public readonly store: Map<string, Buffer>;

  constructor(options?: InMemoryCompiledCodeStorageOptions) {
    this.store = options?.store ?? new Map<string, Buffer>();
  }

  async upload(sha256: string, content: Buffer): Promise<string> {
    this.store.set(sha256, content);
    return `mem://${sha256}`;
  }
}
