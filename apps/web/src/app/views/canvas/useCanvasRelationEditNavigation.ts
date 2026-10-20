/** Card navigation leaves the existing edit transaction only after an explicit decision. */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CanvasRelationalTreeApplyResult } from './canvasRelationalTreeWorkbench.types';
import {
  idleRelationNavigation,
  transitionRelationEditNavigation,
  type RelationNavigationEvent,
  type RelationNavigationState,
  type RelationNavigationDecision,
} from './canvasRelationEditNavigationMachine';

export type CanvasRelationEditNavigationSession = Readonly<{
  hasUnappliedChanges: boolean;
  canApply: boolean;
  apply: () => CanvasRelationalTreeApplyResult;
  cancel: () => void;
}>;

type NavigationContext = Readonly<{
  modelId: string;
  editing: boolean;
  selectedRelationId: string | null;
  session: CanvasRelationEditNavigationSession;
  onSelect: (relationId: string | null) => void;
}>;

export function useCanvasRelationEditNavigation(context: NavigationContext) {
  const { modelId, editing, selectedRelationId } = context;
  const scope = useMemo(
    () => ({ modelId, editing, selectedRelationId }),
    [modelId, editing, selectedRelationId]
  );
  const committed = useRef<{ scope: typeof scope; context: NavigationContext } | null>(null);
  const current = useRef(idleRelationNavigation);
  const [snapshot, publish] = useState(idleRelationNavigation);

  const transition = (event: RelationNavigationEvent) => {
    const next = transitionRelationEditNavigation(current.current, event);
    current.current = next;
    publish(next);
    return next;
  };
  useLayoutEffect(() => {
    if (committed.current?.scope !== scope) {
      transition({ type: 'reset' });
    }
    committed.current = { scope, context };
  });
  useLayoutEffect(
    () => () => {
      committed.current = null;
      current.current = idleRelationNavigation;
    },
    []
  );

  const execute = (state: RelationNavigationState) => {
    const active = committed.current;
    if (state.kind !== 'resolving' || active?.scope !== scope) return;
    const settle = (accepted: boolean) => {
      if (committed.current?.scope === scope) {
        transition({ type: 'settle', request: state.request, accepted });
      }
    };
    let accepted = true;
    try {
      if (state.action === 'apply') {
        accepted = active.context.session.apply().outcome !== 'rejected';
      } else if (state.action === 'discard' || active.context.editing) {
        active.context.session.cancel();
      }
    } catch (error) {
      settle(false);
      throw error;
    }
    if (current.current !== state || committed.current?.scope !== scope) return;
    try {
      if (accepted) committed.current.context.onSelect(state.request.relationId);
    } finally {
      settle(accepted);
    }
  };
  const dispatch = (event: RelationNavigationEvent) => {
    const previous = current.current;
    const next = transition(event);
    if (next !== previous) execute(next);
  };
  const decide = (decision: RelationNavigationDecision) => {
    const active = committed.current;
    if (active?.scope !== scope || snapshot.kind !== 'awaitingDecision') return;
    dispatch({
      type: 'decide',
      request: snapshot.request,
      decision,
      canApply: active.context.session.canApply,
    });
  };
  return {
    pending: snapshot.kind === 'awaitingDecision',
    stay: () => decide('stay'),
    discard: () => decide('discard'),
    apply: () => decide('apply'),
    select: (relationId: string | null) => {
      const active = committed.current;
      if (active?.scope !== scope) return;
      dispatch({
        type: 'select',
        relationId,
        selectedRelationId: active.context.selectedRelationId,
        requiresDecision: active.context.session.hasUnappliedChanges,
      });
    },
  };
}
