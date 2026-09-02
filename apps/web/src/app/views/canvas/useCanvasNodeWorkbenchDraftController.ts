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
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { limitCanvasNodeTagsText } from './canvasNodeTagPolicy';
import {
  areCanvasInspectorNodeDraftsEqual,
  canonicalizeCanvasInspectorNodeDraft,
  createCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';

export type CanvasNodeWorkbenchDraftController = Readonly<{
  draft: CanvasInspectorNodeDraft;
  tagsText: string;
  onDraftChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
  onTagsTextChange: Dispatch<SetStateAction<string>>;
  onDraftSubmitted: (draft?: CanvasInspectorNodeDraft) => void;
  onResetDraft: () => void;
}>;

type DraftControllerState = Readonly<{
  nodeId: string;
  authoritativeDraft: CanvasInspectorNodeDraft;
  draft: CanvasInspectorNodeDraft;
  submittedDraft: CanvasInspectorNodeDraft | null;
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
  | Readonly<{
      type: 'draft-submitted';
      node: CanonicalNode;
      workspaceScope: WorkspaceScope | undefined;
      draft?: CanvasInspectorNodeDraft;
    }>
  | Readonly<{ type: 'reset-requested' }>;

function tagsTextFromDraft(draft: CanvasInspectorNodeDraft): string {
  return draft.tags.filter((tag) => !isSemanticCanvasNodeTag(tag)).join(', ');
}

function tagsFromText(value: string): readonly string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && !isSemanticCanvasNodeTag(tag))
    )
  );
}

function isSemanticCanvasNodeTag(tag: string): boolean {
  return tag === 'authoring' || tag.startsWith('template:') || tag.startsWith('target:');
}

function mergeBusinessTagsWithSemanticAuthority(
  authority: CanvasInspectorNodeDraft,
  businessTags: readonly string[]
): readonly string[] {
  return [
    ...authority.tags.filter(isSemanticCanvasNodeTag),
    ...businessTags.filter((tag) => !isSemanticCanvasNodeTag(tag)),
  ];
}

function createDraftControllerState(
  nodeId: string,
  authoritativeDraft: CanvasInspectorNodeDraft
): DraftControllerState {
  return {
    nodeId,
    authoritativeDraft,
    draft: authoritativeDraft,
    submittedDraft: null,
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

      if (
        state.submittedDraft != null &&
        areCanvasInspectorNodeDraftsEqual(state.submittedDraft, action.draft)
      ) {
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
        submittedDraft: null,
      };
    case 'tags-text-changed': {
      const tagsText = limitCanvasNodeTagsText(resolveStateUpdate(state.tagsText, action.update));
      return {
        ...state,
        draft: {
          ...state.draft,
          tags: mergeBusinessTagsWithSemanticAuthority(
            state.authoritativeDraft,
            tagsFromText(tagsText)
          ),
        },
        submittedDraft: null,
        tagsText,
      };
    }
    case 'draft-submitted':
      return {
        ...state,
        submittedDraft: canonicalizeCanvasInspectorNodeDraft(
          action.node,
          action.draft ?? state.draft,
          action.workspaceScope
        ),
      };
    case 'reset-requested':
      return createDraftControllerState(state.nodeId, state.authoritativeDraft);
  }
}

export function useCanvasNodeWorkbenchDraftController(
  node: CanonicalNode,
  workspaceScope?: WorkspaceScope
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
  const onDraftSubmitted = useCallback(
    (draft?: CanvasInspectorNodeDraft) =>
      dispatch({ type: 'draft-submitted', node, workspaceScope, draft }),
    [node, workspaceScope]
  );
  const onResetDraft = useCallback(() => dispatch({ type: 'reset-requested' }), []);

  return useMemo(
    () => ({
      draft: state.draft,
      tagsText: state.tagsText,
      onDraftChange,
      onTagsTextChange,
      onDraftSubmitted,
      onResetDraft,
    }),
    [onDraftChange, onDraftSubmitted, onResetDraft, onTagsTextChange, state.draft, state.tagsText]
  );
}
