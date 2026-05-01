/** Owned concern: prove the first Canvas authoring route transition without React, HTTP, or Cypress coupling. */

export type CanvasFirstAuthoringLiveProofTransition =
  | 'needs_canvas'
  | 'canvas_created'
  | 'node_created'
  | 'layout_persisted'
  | 'restored'
  | 'blocked';

type CanvasFirstAuthoringCanvas = Readonly<{
  kind: string;
  title: string;
}>;

type CanvasFirstAuthoringNode = Readonly<{
  id: string;
  kind: string;
  name: string;
}>;

type CanvasFirstAuthoringLayout = Readonly<{
  nodeId: string;
  position: Readonly<{ x: number; y: number }>;
}>;

type CanvasFirstAuthoringRestoredDraft = Readonly<{
  canvas: CanvasFirstAuthoringCanvas | null;
  nodeIds: readonly string[];
  nodePositions: Readonly<Record<string, { x: number; y: number }>>;
}>;

type CanvasFirstAuthoringDraftAccess =
  | Readonly<{ kind: 'writable' }>
  | Readonly<{ kind: 'blocked'; reason: string }>;

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
      reason:
        | 'canvas_save_not_settled'
        | 'draft_canvas_mismatch'
        | 'first_node_mismatch'
        | 'node_save_not_settled'
        | 'restored_canvas_missing'
        | 'restored_layout_missing'
        | 'restored_node_missing'
        | 'unsupported_canvas_kind'
        | string;
      blockedCommand?: 'CreateCanvas' | 'CreateCanvasNode' | 'PersistCanvasLayout';
      blockedQuery?: 'GetWorkspaceGraphDraft' | 'GetCanvasLayout';
      expectedNode?: CanvasFirstAuthoringNode;
    }>;

type CanvasFirstAuthoringDefault = Readonly<{
  canvasKind: string;
  node: CanvasFirstAuthoringNode;
}>;

const FIRST_AUTHORING_DEFAULTS: readonly CanvasFirstAuthoringDefault[] = [
  {
    canvasKind: 'transformation',
    node: {
      id: 'dvt-source-1',
      kind: 'dvt:source',
      name: 'Source 1',
    },
  },
  {
    canvasKind: 'dbt',
    node: {
      id: 'dbt-source-1',
      kind: 'dbt:source',
      name: 'Source 1',
    },
  },
];

export function deriveCanvasFirstAuthoringLiveProof(
  input: CanvasFirstAuthoringLiveProofInput
): CanvasFirstAuthoringLiveProof {
  if (input.draftAccess.kind === 'blocked') {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: input.draftAccess.reason,
      blockedCommand: 'CreateCanvas',
    };
  }

  if (input.activeCanvas == null && input.createdCanvas == null) {
    return {
      kind: 'needs_canvas',
      transition: 'needs_canvas',
      completed: false,
      nextCommand: 'CreateCanvas',
    };
  }

  const canvas = input.createdCanvas?.canvas ?? input.activeCanvas;
  if (canvas == null) {
    return {
      kind: 'needs_canvas',
      transition: 'needs_canvas',
      completed: false,
      nextCommand: 'CreateCanvas',
    };
  }

  if (input.createdCanvas != null && !input.createdCanvas.saveSettled) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'canvas_save_not_settled',
      blockedCommand: input.createdNode == null ? 'CreateCanvas' : 'CreateCanvasNode',
    };
  }

  if (input.activeCanvas != null && input.activeCanvas.kind !== canvas.kind) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'draft_canvas_mismatch',
      blockedCommand: 'CreateCanvas',
    };
  }

  if (input.createdNode == null) {
    return {
      kind: 'canvas_created',
      transition: 'canvas_created',
      completed: false,
      canvas,
      nextCommand: 'CreateCanvasNode',
    };
  }

  const expectedNode = resolveExpectedFirstNode(canvas);
  if (expectedNode == null) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'unsupported_canvas_kind',
      blockedCommand: 'CreateCanvasNode',
    };
  }

  if (!matchesExpectedFirstNode(input.createdNode.node, expectedNode)) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'first_node_mismatch',
      blockedCommand: 'CreateCanvasNode',
      expectedNode,
    };
  }

  if (!input.createdNode.saveSettled) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'node_save_not_settled',
      blockedCommand: 'PersistCanvasLayout',
      expectedNode,
    };
  }

  if (input.persistedLayout == null) {
    return {
      kind: 'node_created',
      transition: 'node_created',
      completed: false,
      canvas,
      node: input.createdNode.node,
      nextCommand: 'PersistCanvasLayout',
    };
  }

  if (input.persistedLayout.nodeId !== input.createdNode.node.id) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'restored_layout_missing',
      blockedQuery: 'GetCanvasLayout',
      expectedNode,
    };
  }

  if (input.restoredDraft == null) {
    return {
      kind: 'layout_persisted',
      transition: 'layout_persisted',
      completed: false,
      canvas,
      node: input.createdNode.node,
      layout: input.persistedLayout,
      nextQuery: 'GetWorkspaceGraphDraft',
    };
  }

  if (input.restoredDraft.canvas == null || input.restoredDraft.canvas.kind !== canvas.kind) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'restored_canvas_missing',
      blockedQuery: 'GetWorkspaceGraphDraft',
      expectedNode,
    };
  }

  if (!input.restoredDraft.nodeIds.includes(input.createdNode.node.id)) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'restored_node_missing',
      blockedQuery: 'GetWorkspaceGraphDraft',
      expectedNode,
    };
  }

  if (!hasRestoredLayout(input.restoredDraft, input.persistedLayout)) {
    return {
      kind: 'blocked',
      transition: 'blocked',
      completed: false,
      reason: 'restored_layout_missing',
      blockedQuery: 'GetCanvasLayout',
      expectedNode,
    };
  }

  return {
    kind: 'restored',
    transition: 'restored',
    completed: true,
    canvas,
    node: input.createdNode.node,
    layout: input.persistedLayout,
  };
}

export function isCanvasFirstAuthoringProofComplete(proof: CanvasFirstAuthoringLiveProof): boolean {
  return proof.kind === 'restored';
}

export function assertCanvasFirstAuthoringInvariant(
  proof: CanvasFirstAuthoringLiveProof
): asserts proof is CanvasFirstAuthoringLiveProof {
  if (proof.kind !== 'restored') {
    return;
  }

  if (proof.layout.nodeId !== proof.node.id) {
    throw new Error('restored proof layout must belong to the created node');
  }
}

function resolveExpectedFirstNode(
  canvas: CanvasFirstAuthoringCanvas
): CanvasFirstAuthoringNode | null {
  return FIRST_AUTHORING_DEFAULTS.find((entry) => entry.canvasKind === canvas.kind)?.node ?? null;
}

function matchesExpectedFirstNode(
  node: CanvasFirstAuthoringNode,
  expectedNode: CanvasFirstAuthoringNode
): boolean {
  return (
    node.id === expectedNode.id &&
    node.kind === expectedNode.kind &&
    node.name === expectedNode.name
  );
}

function hasRestoredLayout(
  restoredDraft: CanvasFirstAuthoringRestoredDraft,
  layout: CanvasFirstAuthoringLayout
): boolean {
  const restoredPosition = restoredDraft.nodePositions[layout.nodeId];

  return (
    restoredPosition != null &&
    restoredPosition.x === layout.position.x &&
    restoredPosition.y === layout.position.y
  );
}
