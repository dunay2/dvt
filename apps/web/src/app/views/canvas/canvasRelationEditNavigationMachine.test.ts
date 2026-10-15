/** Owned concern: navigation decisions are single-use, without session authority. */
import { describe, expect, it } from 'vitest';
import {
  idleRelationNavigation,
  transitionRelationNavigation,
  type RelationNavigationState,
  type RelationNavigationRequest,
} from './canvasRelationEditNavigationMachine';

function request(
  relationId: string | null = 'destination',
  requiresDecision = true
): RelationNavigationState {
  return transitionRelationNavigation(idleRelationNavigation, {
    type: 'select',
    relationId,
    selectedRelationId: 'origin',
    requiresDecision,
  });
}

function pendingRequest(state: RelationNavigationState): RelationNavigationRequest {
  if (state.kind === 'idle') throw new Error('Expected a navigation request');
  return state.request;
}

describe('relation navigation decision machine', () => {
  it('ignores the selected relation and admits clean navigation directly', () => {
    expect(
      transitionRelationNavigation(idleRelationNavigation, {
        type: 'select',
        relationId: 'origin',
        selectedRelationId: 'origin',
        requiresDecision: true,
      })
    ).toBe(idleRelationNavigation);
    expect(request(null, false)).toMatchObject({
      kind: 'resolving',
      action: 'navigate',
      request: { relationId: null },
    });
  });

  it.each(['stay', 'discard', 'apply'] as const)(
    'admits %s only for the matching request',
    (decision) => {
      const state = request();
      const token = pendingRequest(state);
      const next = transitionRelationNavigation(state, {
        type: 'decide',
        request: token,
        decision,
        canApply: true,
      });
      expect(next.kind).toBe(decision === 'stay' ? 'idle' : 'resolving');
      expect(
        transitionRelationNavigation(next, {
          type: 'decide',
          request: token,
          decision,
          canApply: true,
        })
      ).toBe(next);
    }
  );

  it('keeps denied Apply pending without consuming the decision', () => {
    const state = request();
    expect(
      transitionRelationNavigation(state, {
        type: 'decide',
        request: pendingRequest(state),
        decision: 'apply',
        canApply: false,
      })
    ).toBe(state);
  });

  it('rejects every old binding after replacing the destination', () => {
    const state = request();
    const replacement = transitionRelationNavigation(state, {
      type: 'select',
      relationId: 'replacement',
      selectedRelationId: 'origin',
      requiresDecision: true,
    });
    for (const decision of ['stay', 'discard', 'apply'] as const) {
      expect(
        transitionRelationNavigation(replacement, {
          type: 'decide',
          request: pendingRequest(state),
          decision,
          canApply: true,
        })
      ).toBe(replacement);
    }
  });

  it('blocks reentrant selection and renews a rejected request for an intentional retry', () => {
    const pending = request();
    const token = pendingRequest(pending);
    const resolving = transitionRelationNavigation(pending, {
      type: 'decide',
      request: token,
      decision: 'apply',
      canApply: true,
    });
    expect(
      transitionRelationNavigation(resolving, {
        type: 'select',
        relationId: 'other',
        selectedRelationId: 'origin',
        requiresDecision: true,
      })
    ).toBe(resolving);
    const rejected = transitionRelationNavigation(resolving, {
      type: 'settle',
      request: token,
      accepted: false,
    });
    expect(rejected).toMatchObject({
      kind: 'awaitingDecision',
      request: { relationId: 'destination' },
    });
    expect(pendingRequest(rejected)).not.toBe(token);
    expect(
      transitionRelationNavigation(rejected, {
        type: 'decide',
        request: token,
        decision: 'apply',
        canApply: true,
      })
    ).toBe(rejected);
  });

  it('ignores obsolete settlements after reset, even for the same destination', () => {
    const old = request('destination', false);
    expect(transitionRelationNavigation(old, { type: 'reset' })).toBe(idleRelationNavigation);
    const current = request('destination', false);
    expect(
      transitionRelationNavigation(current, {
        type: 'settle',
        request: pendingRequest(old),
        accepted: true,
      })
    ).toBe(current);
    expect(
      transitionRelationNavigation(current, {
        type: 'settle',
        request: pendingRequest(current),
        accepted: true,
      })
    ).toBe(idleRelationNavigation);
  });
});
