/** Owned concern: derive, validate, and apply the route-owned Inspector DTO for governed node details. */
import type { CanonicalNode } from '../../types/canonical';
import {
  applyDbtNodeAuthoringMetadata,
  createDbtNodeAuthoringMetadata,
} from './canvasDbtAuthoringModel';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
  validateDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
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

export function createCanvasInspectorNodeDraft(node: CanonicalNode): CanvasInspectorNodeDraft {
  const dvtMetadata = createDvtNodeAuthoringMetadata(node);
  const tags = Array.from(
    new Set(node.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );

  return {
    name: node.name,
    description: node.description ?? '',
    tags,
    ...(node.pluginId === 'dbt' ? { dbt: createDbtNodeAuthoringMetadata(node) } : {}),
    ...(dvtMetadata ? { dvt: dvtMetadata } : {}),
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

  if (draft.dbt) {
    const dbtErrors: NonNullable<CanvasInspectorNodeDraftErrors['dbt']> = {};
    if (draft.dbt.packageName.trim().length === 0) {
      dbtErrors.packageName = 'Package is required.';
    }
    if (draft.dbt.sourceName.trim().length === 0) {
      dbtErrors.sourceName = 'Source is required.';
    }
    if (draft.dbt.schemaName.trim().length === 0) {
      dbtErrors.schemaName = 'Schema is required.';
    }
    if (draft.dbt.tableName.trim().length === 0) {
      dbtErrors.tableName = 'Table is required.';
    }
    if (!['view', 'table', 'incremental', 'ephemeral'].includes(draft.dbt.materialized)) {
      dbtErrors.materialized = 'Materialization must be view, table, incremental, or ephemeral.';
    }
    if (Object.keys(dbtErrors).length > 0) {
      return {
        dbt: dbtErrors,
      };
    }
  }

  if (draft.dvt) {
    const dvtErrors = validateDvtNodeAuthoringMetadata(draft.dvt);
    if (Object.keys(dvtErrors).length > 0) {
      return {
        dvt: dvtErrors,
      };
    }
  }

  return {};
}

export function hasCanvasInspectorNodeDraftChanges(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft
): boolean {
  const originalDraft = createCanvasInspectorNodeDraft(node);
  const draftTags = Array.from(
    new Set(draft.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );

  return (
    node.name !== normalizeNodeName(draft.name) ||
    (node.description ?? undefined) !== normalizeNodeDescription(draft.description) ||
    JSON.stringify(originalDraft.tags) !== JSON.stringify(draftTags) ||
    JSON.stringify(originalDraft.dbt ?? null) !== JSON.stringify(draft.dbt ?? null) ||
    JSON.stringify(originalDraft.dvt ?? null) !== JSON.stringify(draft.dvt ?? null)
  );
}

export function applyCanvasInspectorNodeDraft(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft
): CanonicalNode {
  const tags = Array.from(
    new Set(draft.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );
  const baseNode = {
    ...node,
    name: normalizeNodeName(draft.name),
    description: normalizeNodeDescription(draft.description),
    tags,
  };

  if (draft.dbt) {
    return applyDbtNodeAuthoringMetadata(baseNode, draft.dbt);
  }

  if (draft.dvt) {
    return applyDvtNodeAuthoringMetadata(baseNode, draft.dvt);
  }

  return baseNode;
}
