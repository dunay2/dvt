import { describe, expect, it } from 'vitest';

import { ApiError } from './createApiClient';
import { normalizeProtectedRuntimeRejection } from './protectedRuntimeRejection';

function protectedRuntimeError(cause: string): ApiError {
  return new ApiError({
    message: 'Request failed',
    endpoint: '/plans/preview',
    statusCode: 409,
    category: 'client',
    responseBody: {
      error: {
        type: 'protected_runtime_rejection',
        reason: 'plan_rejected',
        details: { cause },
      },
    },
  });
}

describe('normalizeProtectedRuntimeRejection', () => {
  it.each([
    ['dependency_gap', 'Adjust the selection and preview execution plan again.'],
    ['selected_node_missing', 'Refresh the canvas and preview execution plan again.'],
    ['cycle_detected', 'Remove the cycle and preview execution plan again.'],
    ['graph_source_selection_mismatch', 'Preview execution plan again.'],
  ])('uses Execution Preview copy for %s', (cause, expectedMessagePart) => {
    const normalized = normalizeProtectedRuntimeRejection(protectedRuntimeError(cause));

    expect(normalized?.message).toContain(expectedMessagePart);
    expect(normalized?.message).not.toMatch(/\bre-run Plan\b/i);
  });
});
