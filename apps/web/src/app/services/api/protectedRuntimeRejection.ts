/**
 * Owned concern: normalize protected runtime rejection envelopes into
 * user-facing web errors for preview and start-run client flows.
 */
import { ApiError } from './createApiClient';

type HttpErrorEnvelope = {
  error: {
    type: string;
    reason: string;
    details?: Record<string, unknown>;
  };
};

const GRAPH_SOURCE_SELECTION_MISMATCH_MESSAGE =
  'Selected scope no longer matches the authoritative draft. Re-run Plan.';
const DEPENDENCY_GAP_MESSAGE =
  'Selected closure is missing required upstream dependencies. Adjust the selection and re-run Plan.';
const SELECTED_NODE_MISSING_MESSAGE =
  'Selected nodes are no longer available in the authoritative draft. Refresh the canvas and re-run Plan.';
const CYCLE_DETECTED_MESSAGE =
  'Selected closure contains a cycle and cannot be executed. Remove the cycle and re-run Plan.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function isProtectedRuntimeHttpErrorEnvelope(value: unknown): value is HttpErrorEnvelope {
  const record = asRecord(value);
  const errorRecord = asRecord(record?.error);

  return (
    errorRecord !== null &&
    typeof errorRecord.type === 'string' &&
    typeof errorRecord.reason === 'string'
  );
}

export function normalizeProtectedRuntimeRejection(error: unknown): Error | null {
  if (!(error instanceof ApiError) || !isProtectedRuntimeHttpErrorEnvelope(error.responseBody)) {
    return null;
  }

  const { reason, details } = error.responseBody.error;
  const detailsRecord = asRecord(details);
  const cause = readString(detailsRecord?.cause);
  const rejectionReason =
    readString(detailsRecord?.rejectionReason) ?? readString(detailsRecord?.message);

  if (reason === 'plan_rejected') {
    if (cause === 'dependency_gap') {
      return new Error(DEPENDENCY_GAP_MESSAGE);
    }

    if (cause === 'selected_node_missing') {
      return new Error(SELECTED_NODE_MISSING_MESSAGE);
    }

    if (cause === 'cycle_detected') {
      return new Error(CYCLE_DETECTED_MESSAGE);
    }

    if (cause === 'graph_source_selection_mismatch') {
      return new Error(GRAPH_SOURCE_SELECTION_MISMATCH_MESSAGE);
    }

    if (rejectionReason !== null) {
      return new Error(rejectionReason);
    }
  }

  if (reason === 'unsupported_plan_version' && rejectionReason !== null) {
    return new Error(rejectionReason);
  }

  return null;
}
