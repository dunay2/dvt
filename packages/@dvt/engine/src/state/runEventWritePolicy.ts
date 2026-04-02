import { parseRunEventWrite } from '@dvt/contracts';
import type { RunEventWriteSchemaT } from '@dvt/contracts';

import { InvalidRunEventInputError, RunSequenceOverflowError } from '../contracts/errors.js';
import type { RunEventInput, WorkflowSnapshot } from '../contracts/runEvents.js';

export const IN_MEMORY_PERSISTED_AT_EPOCH_ISO = '1970-01-01T00:00:00.000Z';

export function createDefaultWorkflowSnapshot(runId: string): WorkflowSnapshot {
  return {
    runId,
    status: 'PENDING',
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

export function cloneWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  return globalThis.structuredClone(snapshot);
}

export function assertRunEventInput(event: RunEventInput, index: number): void {
  const validated = parseRunEventEnvelope(event, index);

  const record = event as unknown as Record<string, unknown>;
  if (Object.hasOwn(record, 'runSeq')) {
    throw new InvalidRunEventInputError({
      reason: 'runseq_forbidden_in_write_input',
      index,
      runId: event.runId,
    });
  }
  if (Object.hasOwn(record, 'persistedAt')) {
    throw new InvalidRunEventInputError({
      reason: 'persistedat_forbidden_in_write_input',
      index,
      runId: validated.runId,
    });
  }
}

function parseRunEventEnvelope(event: RunEventInput, index: number): RunEventWriteSchemaT {
  try {
    return parseRunEventWrite(event);
  } catch {
    throw new InvalidRunEventInputError({
      reason: 'schema_validation_failed',
      index,
      runId: event?.runId,
    });
  }
}

export function assertEventRunIdMatches(runId: string, event: RunEventInput, index: number): void {
  if (event.runId !== runId) {
    throw new InvalidRunEventInputError({
      reason: 'run_id_mismatch',
      index,
      runId: event.runId,
    });
  }
}

export function assertEventsMatchRunId(runId: string, events: RunEventInput[]): void {
  for (const [index, event] of events.entries()) {
    assertRunEventInput(event, index);
    assertEventRunIdMatches(runId, event, index);
  }
}

export function assertRunSequenceWithinSafeRange(runSeq: number, runId: string): void {
  if (runSeq > Number.MAX_SAFE_INTEGER) {
    throw new RunSequenceOverflowError(runId, runSeq);
  }
}
