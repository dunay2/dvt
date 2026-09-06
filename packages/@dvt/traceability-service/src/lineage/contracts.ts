import type { EventEnvelope } from '@dvt/contracts';

import type { LineageJobFacets, SqlJobFacet } from './types.js';
import type { LineageWarning } from './warningContract.js';

export const MAX_LINEAGE_ATTEMPTS = 5;

export interface LineageOutboxRecord {
  id: string;
  tenantId: string;
  runId: string;
  eventType: string;
  payload: EventEnvelope;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface LineageDeadLetterRecord {
  id: string;
  originalId: string;
  tenantId: string;
  runId: string;
  eventType: string;
  payload: EventEnvelope;
  lastError: string;
  deadLetteredAt: string;
}

export type LineageFailureDisposition = 'retry_scheduled' | 'dead_lettered' | 'not_found';

export interface ILineageOutboxStore {
  enqueue(runId: string, payload: EventEnvelope): Promise<void>;
  listPending(limit: number): Promise<LineageOutboxRecord[]>;
  countPending?(): Promise<number>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<LineageFailureDisposition>;
  listDeadLetter(limit: number, tenantId: string): Promise<LineageDeadLetterRecord[]>;
  countDeadLetter?(tenantId: string): Promise<number>;
  replayDeadLetters?(options: {
    tenantId: string;
    limit: number;
    runId?: string;
    eventType?: string;
  }): Promise<number>;
}

export interface LineagePublishPayload {
  runId: string;
  eventType: string;
  jobFacets: LineageJobFacets;
  warnings: LineageWarning[];
}

export interface ILineageSink {
  publish(payload: LineagePublishPayload): Promise<void>;
}

export interface ISqlJobFacetBuilder {
  fromSql(sqlText: string): SqlJobFacet;
}

export interface ILineageStepEventMapper {
  supports(event: EventEnvelope): boolean;
  map(event: EventEnvelope): Promise<{ jobFacets: LineageJobFacets; warnings: LineageWarning[] }>;
}
