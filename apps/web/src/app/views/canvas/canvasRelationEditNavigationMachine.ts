/** Owned concern: consume one local navigation decision, without owning edit-session truth. */
export type RelationNavigationRequest = Readonly<{ relationId: string | null }>;
export type RelationNavigationDecision = 'stay' | 'discard' | 'apply';

export type RelationNavigationState =
  | Readonly<{ kind: 'idle' }>
  | Readonly<{ kind: 'awaitingDecision'; request: RelationNavigationRequest }>
  | Readonly<{
      kind: 'resolving';
      request: RelationNavigationRequest;
      action: 'navigate' | Exclude<RelationNavigationDecision, 'stay'>;
    }>;

export type RelationNavigationEvent =
  | Readonly<{ type: 'reset' }>
  | Readonly<{
      type: 'select';
      relationId: string | null;
      selectedRelationId: string | null;
      requiresDecision: boolean;
    }>
  | Readonly<{
      type: 'decide';
      request: RelationNavigationRequest;
      decision: RelationNavigationDecision;
      canApply: boolean;
    }>
  | Readonly<{ type: 'settle'; request: RelationNavigationRequest; accepted: boolean }>;

export const idleRelationNavigation: RelationNavigationState = { kind: 'idle' };

export function transitionRelationNavigation(
  state: RelationNavigationState,
  event: RelationNavigationEvent
): RelationNavigationState {
  switch (event.type) {
    case 'reset':
      return idleRelationNavigation;
    case 'select': {
      if (state.kind === 'resolving' || event.relationId === event.selectedRelationId) return state;
      const request = { relationId: event.relationId };
      return event.requiresDecision
        ? { kind: 'awaitingDecision', request }
        : { kind: 'resolving', request, action: 'navigate' };
    }
    case 'decide':
      if (state.kind !== 'awaitingDecision' || state.request !== event.request) return state;
      if (event.decision === 'stay') return idleRelationNavigation;
      if (event.decision === 'apply' && !event.canApply) return state;
      return { kind: 'resolving', request: state.request, action: event.decision };
    case 'settle':
      if (state.kind !== 'resolving' || state.request !== event.request) return state;
      return event.accepted
        ? idleRelationNavigation
        : { kind: 'awaitingDecision', request: { relationId: state.request.relationId } };
  }
}
