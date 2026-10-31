import type { DbtProjectAnalysis } from '../../application/ports/dbtProjectAnalysis.js';

export type DbtParseReuseDisposition = 'executed' | 'joined' | 'reused' | 'bypassed';

/** Instance-local, bounded evidence retention; authorization stays with each caller. */
export class DbtParseAnalysisReuse {
  private readonly completed = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string>>();
  private retainedBytes = 0;

  public constructor(
    private readonly maxEntries = 8,
    private readonly maxBytes = 16_000_000
  ) {
    for (const limit of [maxEntries, maxBytes]) {
      if (!Number.isSafeInteger(limit) || limit < 0) {
        throw new RangeError('dbt analysis reuse limits must be nonnegative safe integers.');
      }
    }
  }

  public async getOrAnalyze(
    key: string,
    analyze: () => Promise<DbtProjectAnalysis>
  ): Promise<Readonly<{ analysis: DbtProjectAnalysis; disposition: DbtParseReuseDisposition }>> {
    const retained = this.completed.get(key);
    if (retained !== undefined) {
      this.completed.delete(key);
      this.completed.set(key, retained);
      return { analysis: JSON.parse(retained) as DbtProjectAnalysis, disposition: 'reused' };
    }
    const pending = this.pending.get(key);
    if (pending !== undefined) {
      return { analysis: JSON.parse(await pending) as DbtProjectAnalysis, disposition: 'joined' };
    }
    if (this.pending.size >= this.maxEntries) {
      return { analysis: await analyze(), disposition: 'bypassed' };
    }
    const computation = Promise.resolve()
      .then(analyze)
      .then((analysis) => {
        const serialized = JSON.stringify(analysis);
        if (analysis.status === 'valid') this.retain(key, serialized);
        return serialized;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, computation);
    return {
      analysis: JSON.parse(await computation) as DbtProjectAnalysis,
      disposition: 'executed',
    };
  }

  private retain(key: string, serialized: string): void {
    const bytes = Buffer.byteLength(key) + Buffer.byteLength(serialized);
    if (bytes > this.maxBytes) return;
    while (this.completed.size >= this.maxEntries || this.retainedBytes + bytes > this.maxBytes) {
      const oldest = this.completed.entries().next().value;
      if (oldest === undefined) return;
      this.completed.delete(oldest[0]);
      this.retainedBytes -= Buffer.byteLength(oldest[0]) + Buffer.byteLength(oldest[1]);
    }
    this.completed.set(key, serialized);
    this.retainedBytes += bytes;
  }
}
