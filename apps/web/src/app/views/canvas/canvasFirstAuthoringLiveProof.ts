/** Owned concern: derive the first Canvas authoring proof transition from route facts. */

import {
  matchesExpectedFirstNode,
  resolveExpectedFirstNode,
} from './canvasFirstAuthoringFirstNodePolicy';
import type {
  CanvasFirstAuthoringLiveProof,
  CanvasFirstAuthoringLiveProofInput,
} from './canvasFirstAuthoringLiveProof.types';
import { hasRestoredLayout } from './canvasFirstAuthoringRestoredLayoutPolicy';

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
