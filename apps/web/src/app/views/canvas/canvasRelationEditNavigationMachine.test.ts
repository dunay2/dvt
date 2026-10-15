/** Owned concern: navigation decisions are single-use, without session authority. */
import { describe, expect, it } from 'vitest';
import {
  idleRelationNavigation,
  transitionRelationEditNavigation,
  type RelationNavigationState,
  type RelationNavigationRequest,
} from './canvasRelationEditNavigationMachine';

function request(
  relationId: string | null = 'destination',
  requiresDecision = true
): RelationNavigationState {
  return transitionRelationEditNavigation(idleRelationNavigation, {
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
      transitionRelationEditNavigation(idleRelationNavigation, {
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
      const next = transitionRelationEditNavigation(state, {
        type: 'decide',
        request: token,
        decision,
        canApply: true,
      });
      expect(next.kind).toBe(decision === 'stay' ? 'idle' : 'resolving');
      expect(
        transitionRelationEditNavigation(next, {
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
      transitionRelationEditNavigation(state, {
        type: 'decide',
        request: pendingRequest(state),
        decision: 'apply',
        canApply: false,
      })
    ).toBe(state);
  });

  it('rejects every old binding after replacing the destination', () => {
    const state = request();
    const replacement = transitionRelationEditNavigation(state, {
      type: 'select',
      relationId: 'replacement',
      selectedRelationId: 'origin',
      requiresDecision: true,
    });
    for (const decision of ['stay', 'discard', 'apply'] as const) {
      expect(
        transitionRelationEditNavigation(replacement, {
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
    const resolving = transitionRelationEditNavigation(pending, {
      type: 'decide',
      request: token,
      decision: 'apply',
      canApply: true,
    });
    expect(
      transitionRelationEditNavigation(resolving, {
        type: 'select',
        relationId: 'other',
        selectedRelationId: 'origin',
        requiresDecision: true,
      })
    ).toBe(resolving);
    const rejected = transitionRelationEditNavigation(resolving, {
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
      transitionRelationEditNavigation(rejected, {
        type: 'decide',
        request: token,
        decision: 'apply',
        canApply: true,
      })
    ).toBe(rejected);
  });

  it('ignores obsolete settlements after reset, even for the same destination', () => {
    const old = request('destination', false);
    expect(transitionRelationEditNavigation(old, { type: 'reset' })).toBe(idleRelationNavigation);
    const current = request('destination', false);
    expect(
      transitionRelationEditNavigation(current, {
        type: 'settle',
        request: pendingRequest(old),
        accepted: true,
      })
    ).toBe(current);
    expect(
      transitionRelationEditNavigation(current, {
        type: 'settle',
        request: pendingRequest(current),
        accepted: true,
      })
    ).toBe(idleRelationNavigation);
  });
});
