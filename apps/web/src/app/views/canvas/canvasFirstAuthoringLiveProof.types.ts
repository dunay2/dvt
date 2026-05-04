/** Owned concern: name first-authoring proof vocabulary and data shapes only. */

export type CanvasFirstAuthoringLiveProofTransition =
  | 'needs_canvas'
  | 'canvas_created'
  | 'node_created'
  | 'layout_persisted'
  | 'restored'
  | 'blocked';

export type CanvasFirstAuthoringDraftAccessBlockedReason =
  | 'read_only'
  | 'unauthenticated'
  | 'forbidden_scope'
  | 'format_error'
  | 'stale_conflict'
  | 'missing_remote'
  | 'projection_gap'
  | 'unknown_pending';

export type CanvasFirstAuthoringBlockedReason =
  | CanvasFirstAuthoringDraftAccessBlockedReason
  | 'canvas_save_not_settled'
  | 'draft_canvas_mismatch'
  | 'first_node_mismatch'
  | 'node_save_not_settled'
  | 'restored_canvas_missing'
  | 'restored_layout_missing'
  | 'restored_node_missing'
  | 'unsupported_canvas_kind';

export type CanvasFirstAuthoringCanvas = Readonly<{
  kind: string;
  title: string;
}>;

export type CanvasFirstAuthoringNode = Readonly<{
  id: string;
  kind: string;
  name: string;
}>;

export type CanvasFirstAuthoringLayout = Readonly<{
  nodeId: string;
  position: Readonly<{ x: number; y: number }>;
}>;

export type CanvasFirstAuthoringRestoredDraft = Readonly<{
  canvas: CanvasFirstAuthoringCanvas | null;
  nodeIds: readonly string[];
  nodePositions: Readonly<Record<string, { x: number; y: number }>>;
}>;

export type CanvasFirstAuthoringDraftAccess =
  | Readonly<{ kind: 'writable' }>
  | Readonly<{ kind: 'blocked'; reason: CanvasFirstAuthoringDraftAccessBlockedReason }>;

export type CanvasFirstAuthoringLiveProofInput = Readonly<{
  draftAccess: CanvasFirstAuthoringDraftAccess;
  activeCanvas: CanvasFirstAuthoringCanvas | null;
  createdCanvas: Readonly<{ canvas: CanvasFirstAuthoringCanvas; saveSettled: boolean }> | null;
  createdNode: Readonly<{ node: CanvasFirstAuthoringNode; saveSettled: boolean }> | null;
  persistedLayout: CanvasFirstAuthoringLayout | null;
  restoredDraft: CanvasFirstAuthoringRestoredDraft | null;
}>;

export type CanvasFirstAuthoringLiveProof =
  | Readonly<{
      kind: 'needs_canvas';
      transition: 'needs_canvas';
      completed: false;
      nextCommand: 'CreateCanvas';
    }>
  | Readonly<{
      kind: 'canvas_created';
      transition: 'canvas_created';
      completed: false;
      canvas: CanvasFirstAuthoringCanvas;
      nextCommand: 'CreateCanvasNode';
    }>
  | Readonly<{
      kind: 'node_created';
      transition: 'node_created';
      completed: false;
      canvas: CanvasFirstAuthoringCanvas;
      node: CanvasFirstAuthoringNode;
      nextCommand: 'PersistCanvasLayout';
    }>
  | Readonly<{
      kind: 'layout_persisted';
      transition: 'layout_persisted';
      completed: false;
      canvas: CanvasFirstAuthoringCanvas;
      node: CanvasFirstAuthoringNode;
      layout: CanvasFirstAuthoringLayout;
      nextQuery: 'GetWorkspaceGraphDraft';
    }>
  | Readonly<{
      kind: 'restored';
      transition: 'restored';
      completed: true;
      canvas: CanvasFirstAuthoringCanvas;
      node: CanvasFirstAuthoringNode;
      layout: CanvasFirstAuthoringLayout;
    }>
  | Readonly<{
      kind: 'blocked';
      transition: 'blocked';
      completed: false;
      reason: CanvasFirstAuthoringBlockedReason;
      blockedCommand?: 'CreateCanvas' | 'CreateCanvasNode' | 'PersistCanvasLayout';
      blockedQuery?: 'GetWorkspaceGraphDraft' | 'GetCanvasLayout';
      expectedNode?: CanvasFirstAuthoringNode;
    }>;
