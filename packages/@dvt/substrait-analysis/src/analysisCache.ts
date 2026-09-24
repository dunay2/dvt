/** Internal derived-fact storage. A null is a miss; a rejected call is a store failure. */
export type RelationAnalysisCacheEntry = Readonly<{ key: string; value: string }>;

export interface RelationAnalysisCache {
  getMany(
    keys: readonly string[],
    signal?: globalThis.AbortSignal
  ): Promise<readonly (string | null)[]>;
  putMany(
    entries: readonly RelationAnalysisCacheEntry[],
    signal?: globalThis.AbortSignal
  ): Promise<void>;
}

export type RelationAnalysisCacheFailure = Readonly<{
  operation: 'read' | 'write';
  error: unknown;
}>;
