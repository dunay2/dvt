/** LRU capacity is serialized UTF-8 key/value weight, not an estimate of JavaScript heap. */
import type { RelationAnalysisCache, RelationAnalysisCacheEntry } from './analysisCache.js';

export class MemoryRelationAnalysisCache implements RelationAnalysisCache {
  private readonly entries = new Map<string, Readonly<{ value: string; bytes: number }>>();
  private bytes = 0;
  private readonly encoder = new globalThis.TextEncoder();

  constructor(private readonly limits: Readonly<{ maxEntries: number; maxBytes: number }>) {
    for (const value of [limits.maxEntries, limits.maxBytes]) {
      if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError('Invalid cache capacity.');
    }
    this.limits = { ...limits };
  }

  get usage(): Readonly<{ entries: number; bytes: number }> {
    return { entries: this.entries.size, bytes: this.bytes };
  }

  async getMany(
    keys: readonly string[],
    signal?: globalThis.AbortSignal
  ): Promise<readonly (string | null)[]> {
    signal?.throwIfAborted();
    return keys.map((key) => {
      const entry = this.entries.get(key);
      if (entry == null) return null;
      this.entries.delete(key);
      this.entries.set(key, entry);
      return entry.value;
    });
  }

  async putMany(
    entries: readonly RelationAnalysisCacheEntry[],
    signal?: globalThis.AbortSignal
  ): Promise<void> {
    signal?.throwIfAborted();
    for (const { key, value } of entries) {
      const bytes = this.encoder.encode(key).byteLength + this.encoder.encode(value).byteLength;
      const previous = this.entries.get(key);
      if (previous != null) {
        this.entries.delete(key);
        this.bytes -= previous.bytes;
      }
      if (this.limits.maxEntries === 0 || bytes > this.limits.maxBytes) continue;
      while (
        this.entries.size >= this.limits.maxEntries ||
        this.bytes + bytes > this.limits.maxBytes
      ) {
        const oldest = this.entries.keys().next().value!;
        this.bytes -= this.entries.get(oldest)!.bytes;
        this.entries.delete(oldest);
      }
      this.entries.set(key, { value, bytes });
      this.bytes += bytes;
    }
  }
}
