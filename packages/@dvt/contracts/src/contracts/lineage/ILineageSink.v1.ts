import type { EventEnvelope } from '../engine/IOutboxStorage.v1.js';

export const MAX_LINEAGE_ATTEMPTS = 5;

export interface LineageOutboxRecord {
  id: string;
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
  runId: string;
  eventType: string;
  payload: EventEnvelope;
  lastError: string;
  deadLetteredAt: string;
}

export interface ILineageOutboxStore {
  enqueue(runId: string, payload: EventEnvelope): Promise<void>;
  listPending(limit: number): Promise<LineageOutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string, attempts: number): Promise<void>;
  deadLetter(id: string, error: string): Promise<void>;
  listDeadLetter?(limit: number): Promise<LineageDeadLetterRecord[]>;
}

export interface LineagePublishPayload {
  runId: string;
  eventType: string;
  jobFacets: unknown;
  warnings: Array<{ code: string; message: string }>;
}

export interface ILineageSink {
  publish(payload: LineagePublishPayload): Promise<void>;
}
