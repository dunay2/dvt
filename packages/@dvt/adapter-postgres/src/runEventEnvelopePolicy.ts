import { parseRunEventWrite } from '@dvt/contracts';
import type { RunEventWriteSchemaT } from '@dvt/contracts';

import {
  InvalidRunEventEnvelopeError,
  InvalidRunEventSchemaError,
  InvalidRunEventTenantError,
} from './runEventStoreErrors.js';
import type { EventEnvelope, EventInput, RunId } from './types.js';

interface ValidateContext {
  runId: RunId;
  tenantId: string;
  index: number;
}

interface EnrichContext extends ValidateContext {
  runSeq: number;
  persistedAt: string;
}

export function validateAndEnrichEnvelope(
  envelope: EventInput,
  context: EnrichContext
): EventEnvelope {
  const validated = parseAndValidateEnvelope(envelope, context);
  return enrichEnvelopeWithSeq(validated, context.runSeq, context.persistedAt);
}

function parseAndValidateEnvelope(
  envelope: EventInput,
  context: ValidateContext
): RunEventWriteSchemaT {
  let validated: RunEventWriteSchemaT;
  try {
    validated = parseRunEventWrite(envelope);
  } catch (cause) {
    throw new InvalidRunEventSchemaError(context.runId, context.index, cause);
  }
  assertEnvelopeRunIdMatchesBatchRunId(validated, context.runId, context.index);
  assertEnvelopeTenantIdMatchesRunTenant(validated, context.runId, context.tenantId, context.index);
  return validated;
}

function assertEnvelopeRunIdMatchesBatchRunId(
  envelope: RunEventWriteSchemaT,
  runId: RunId,
  index: number
): void {
  if (envelope.runId !== runId) {
    throw new InvalidRunEventEnvelopeError(runId, index, envelope.runId);
  }
}

function assertEnvelopeTenantIdMatchesRunTenant(
  envelope: RunEventWriteSchemaT,
  runId: RunId,
  tenantId: string,
  index: number
): void {
  if (envelope.tenantId !== tenantId) {
    throw new InvalidRunEventTenantError(runId, index, tenantId, envelope.tenantId);
  }
}

function enrichEnvelopeWithSeq(
  envelope: RunEventWriteSchemaT,
  runSeq: number,
  persistedAt: string
): EventEnvelope {
  const normalizedInput = toNormalizedEventInput(envelope);

  return {
    ...normalizedInput,
    runSeq,
    persistedAt,
  };
}

function toNormalizedEventInput(envelope: RunEventWriteSchemaT): EventInput {
  const base = {
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    runId: envelope.runId,
    emittedAt: envelope.emittedAt,
    tenantId: envelope.tenantId,
    projectId: envelope.projectId,
    environmentId: envelope.environmentId,
    planId: envelope.planId,
    planVersion: envelope.planVersion,
    engineAttemptId: envelope.engineAttemptId,
    logicalAttemptId: envelope.logicalAttemptId,
    idempotencyKey: envelope.idempotencyKey,
    payloadVersion: envelope.payloadVersion,
  };
  const withPayload =
    envelope.payload === undefined ? base : { ...base, payload: envelope.payload };

  if ('stepId' in envelope) {
    return {
      ...withPayload,
      stepId: envelope.stepId,
    };
  }

  return withPayload;
}
