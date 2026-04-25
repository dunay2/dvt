/** Owned concern: derive, validate, and apply the route-owned Inspector DTO for governed node details. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';

function normalizeNodeName(value: string): string {
  return value.trim();
}

function normalizeNodeDescription(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function createCanvasInspectorNodeDraft(
  node: CanonicalNode
): CanvasInspectorNodeDraft {
  return {
    name: node.name,
    description: node.description ?? '',
  };
}

export function validateCanvasInspectorNodeDraft(
  draft: CanvasInspectorNodeDraft
): CanvasInspectorNodeDraftErrors {
  if (normalizeNodeName(draft.name).length === 0) {
    return {
      name: 'Node name is required.',
    };
  }

  return {};
}

export function hasCanvasInspectorNodeDraftChanges(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft
): boolean {
  return (
    node.name !== normalizeNodeName(draft.name) ||
    (node.description ?? undefined) !== normalizeNodeDescription(draft.description)
  );
}

export function applyCanvasInspectorNodeDraft(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft
): CanonicalNode {
  return {
    ...node,
    name: normalizeNodeName(draft.name),
    description: normalizeNodeDescription(draft.description),
  };
}
