/**
 * @ownedConcern Canonical event publication failures must not acquire substitute terminals.
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 */
import { ActivityFailure } from '@temporalio/workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markWorkflowFailedIfNeeded } from '../src/workflows/runPlanWorkflow.lifecycle.js';
import type { RuntimeWorkflowState } from '../src/workflows/runPlanWorkflow.types.js';

import { createPlanRef, createResolvedRunContext } from './helpers/contractFixtures.js';

const { emitEvent } = vi.hoisted(() => ({ emitEvent: vi.fn() }));
vi.mock('../src/workflows/runPlanWorkflow.activities.js', () => ({
  eventActivities: { emitEvent },
}));

const ctx = createResolvedRunContext({
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  runId: 'run-1',
});
const planRef = createPlanRef({ uri: 'memory://plan', sha256: 'a'.repeat(64), planId: 'plan-1' });

describe('workflow failure fallback policy', () => {
  let state: RuntimeWorkflowState;
  beforeEach(() => {
    emitEvent.mockReset().mockResolvedValue(undefined);
    state = {
      status: 'RUNNING',
      paused: false,
      cancelRequested: false,
      currentStepIndex: 1,
      continuedAsNewCount: 0,
    };
  });

  it('does not terminalize canonical history after a typed event publication failure', async () => {
    const error = new ActivityFailure(
      'write rejected',
      'emitEvent',
      'event-1',
      'NON_RETRYABLE_FAILURE',
      'worker'
    );
    await markWorkflowFailedIfNeeded(state, ctx, planRef, 'dbt', error);
    expect(emitEvent).not.toHaveBeenCalled();
    expect(state.status).toBe('RUNNING');
  });

  it.each([
    new ActivityFailure(
      'read rejected',
      'resolveExecutionSegment',
      'read-1',
      'NON_RETRYABLE_FAILURE',
      'worker'
    ),
    new Error('emitEvent appears in a message but is not typed publication failure'),
  ])('retains the existing fallback for non-publication errors', async (error) => {
    await markWorkflowFailedIfNeeded(state, ctx, planRef, 'dbt', error);
    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RunFailed', ctx, planRef })
    );
    expect(state.status).toBe('FAILED');
  });
});
