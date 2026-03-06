import type { CompiledCodeRef, EventEnvelope } from '@dvt/contracts';

import type { CompiledCodeBlob, LineageJobFacets, LineageWarning, SqlJobFacet } from './types.js';

export interface ICompiledCodeReader {
  read(ref: CompiledCodeRef): Promise<CompiledCodeBlob>;
}

export interface ICompiledCodeCache {
  get(key: string): CompiledCodeBlob | undefined;
  set(key: string, value: CompiledCodeBlob): void;
}

export interface ICompiledCodeResolver {
  resolve(ref: CompiledCodeRef): Promise<CompiledCodeBlob>;
}

export interface ICompiledCodeRetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface ISqlJobFacetBuilder {
  fromSql(sqlText: string): SqlJobFacet;
}

export interface ILineageStepEventMapper {
  supports(event: EventEnvelope): boolean;
  map(event: EventEnvelope): Promise<{ jobFacets: LineageJobFacets; warnings: LineageWarning[] }>;
}
