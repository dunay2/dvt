/** Owned concern: reconcile one authoritative selected node with one transient workbench draft. */
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  areCanvasInspectorNodeDraftsEqual,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

export type CanvasNodeWorkbenchDraftController = Readonly<{
  draft: CanvasInspectorNodeDraft;
  tagsText: string;
  onDraftChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
  onTagsTextChange: Dispatch<SetStateAction<string>>;
  onResetDraft: () => void;
}>;

type DraftControllerState = Readonly<{
  nodeId: string;
  authoritativeDraft: CanvasInspectorNodeDraft;
  draft: CanvasInspectorNodeDraft;
  tagsText: string;
}>;

type DraftControllerAction =
  | Readonly<{
      type: 'authority-received';
      nodeId: string;
      draft: CanvasInspectorNodeDraft;
    }>
  | Readonly<{
      type: 'draft-changed';
      update: SetStateAction<CanvasInspectorNodeDraft>;
    }>
  | Readonly<{
      type: 'tags-text-changed';
      update: SetStateAction<string>;
    }>
  | Readonly<{ type: 'reset-requested' }>;

function tagsTextFromDraft(draft: CanvasInspectorNodeDraft): string {
  return draft.tags.join(', ');
}

function tagsFromText(value: string): readonly string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    )
  );
}

function createDraftControllerState(
  nodeId: string,
  authoritativeDraft: CanvasInspectorNodeDraft
): DraftControllerState {
  return {
    nodeId,
    authoritativeDraft,
    draft: authoritativeDraft,
    tagsText: tagsTextFromDraft(authoritativeDraft),
  };
}

function resolveStateUpdate<T>(currentValue: T, update: SetStateAction<T>): T {
  return typeof update === 'function' ? (update as (previousValue: T) => T)(currentValue) : update;
}

function reduceDraftControllerState(
  state: DraftControllerState,
  action: DraftControllerAction
): DraftControllerState {
  switch (action.type) {
    case 'authority-received': {
      if (state.nodeId !== action.nodeId) {
        return createDraftControllerState(action.nodeId, action.draft);
      }

      if (!areCanvasInspectorNodeDraftsEqual(state.draft, state.authoritativeDraft)) {
        return {
          ...state,
          authoritativeDraft: action.draft,
        };
      }

      return createDraftControllerState(action.nodeId, action.draft);
    }
    case 'draft-changed':
      return {
        ...state,
        draft: resolveStateUpdate(state.draft, action.update),
      };
    case 'tags-text-changed': {
      const tagsText = resolveStateUpdate(state.tagsText, action.update);
      return {
        ...state,
        draft: {
          ...state.draft,
          tags: tagsFromText(tagsText),
        },
        tagsText,
      };
    }
    case 'reset-requested':
      return createDraftControllerState(state.nodeId, state.authoritativeDraft);
  }
}

export function useCanvasNodeWorkbenchDraftController(
  node: CanonicalNode
): CanvasNodeWorkbenchDraftController {
  const authoritativeDraft = useMemo(() => createCanvasInspectorNodeDraft(node), [node]);
  const [state, dispatch] = useReducer(
    reduceDraftControllerState,
    createDraftControllerState(node.id, authoritativeDraft)
  );

  useEffect(() => {
    dispatch({
      type: 'authority-received',
      nodeId: node.id,
      draft: authoritativeDraft,
    });
  }, [authoritativeDraft, node.id]);

  const onDraftChange = useCallback<Dispatch<SetStateAction<CanvasInspectorNodeDraft>>>(
    (update) => dispatch({ type: 'draft-changed', update }),
    []
  );
  const onTagsTextChange = useCallback<Dispatch<SetStateAction<string>>>(
    (update) => dispatch({ type: 'tags-text-changed', update }),
    []
  );
  const onResetDraft = useCallback(() => dispatch({ type: 'reset-requested' }), []);

  return useMemo(
    () => ({
      draft: state.draft,
      tagsText: state.tagsText,
      onDraftChange,
      onTagsTextChange,
      onResetDraft,
    }),
    [onDraftChange, onResetDraft, onTagsTextChange, state.draft, state.tagsText]
  );
}
