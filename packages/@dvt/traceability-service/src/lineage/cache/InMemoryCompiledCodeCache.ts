import type { ICompiledCodeCache } from '../contracts.js';
import type { CompiledCodeBlob } from '../types.js';

export interface InMemoryCompiledCodeCacheOptions {
  maxEntries?: number;
}

export class InMemoryCompiledCodeCache implements ICompiledCodeCache {
  private readonly maxEntries: number;
  private readonly items = new Map<string, CompiledCodeBlob>();

  constructor(options?: InMemoryCompiledCodeCacheOptions) {
    const maxEntries = options?.maxEntries ?? 512;
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error('INVALID_COMPILED_CODE_CACHE_MAX_ENTRIES');
    }
    this.maxEntries = maxEntries;
  }

  get(key: string): CompiledCodeBlob | undefined {
    const value = this.items.get(key);
    if (value === undefined) return undefined;

    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }

  set(key: string, value: CompiledCodeBlob): void {
    if (this.items.has(key)) this.items.delete(key);
    this.items.set(key, value);

    if (this.items.size <= this.maxEntries) return;

    const lruKey = this.items.keys().next().value;
    if (lruKey !== undefined) this.items.delete(lruKey);
  }
}
