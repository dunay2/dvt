/** Owned concern: derive, validate, and apply the route-owned Inspector DTO for governed node details. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDbtNodeAuthoringMetadata,
  createDbtNodeAuthoringMetadata,
} from './canvasDbtAuthoringModel';
import {
  applyDbtTestAuthoringMetadata,
  createDbtTestAuthoringMetadata,
  validateDbtTestAuthoringMetadata,
} from './canvasDbtTestAuthoringModel';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
  validateDvtNodeAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import {
  applyObjectFilePostgresAuthoringDraft,
  createObjectFilePostgresAuthoringDraft,
  validateObjectFilePostgresAuthoringDraft,
} from './objectFilePostgresAuthoringModel';
import { resolveCompatibleDbtModelOrigins } from './canvasDbtModelArtifactProjection';

export type CanvasInspectorNodeDraftValidationContext = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

function normalizeNodeName(value: string): string {
  return value.trim();
}

function normalizeNodeDescription(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function createCanvasInspectorNodeDraft(node: CanonicalNode): CanvasInspectorNodeDraft {
  const dvtMetadata = createDvtNodeAuthoringMetadata(node);
  const objectFilePostgresDraft = createObjectFilePostgresAuthoringDraft(node);
  const tags = Array.from(
    new Set(node.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );

  return {
    name: node.name,
    description: node.description ?? '',
    tags,
    ...(node.pluginId === 'dbt' && node.kind !== 'dbt:test'
      ? { dbt: createDbtNodeAuthoringMetadata(node) }
      : {}),
    ...(node.pluginId === 'dbt' && node.kind === 'dbt:test'
      ? { dbtTest: createDbtTestAuthoringMetadata(node) }
      : {}),
    ...(dvtMetadata ? { dvt: dvtMetadata } : {}),
    ...(objectFilePostgresDraft == null ? {} : { objectFilePostgres: objectFilePostgresDraft }),
  };
}

export function areCanvasInspectorNodeDraftsEqual(
  left: CanvasInspectorNodeDraft,
  right: CanvasInspectorNodeDraft
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateCanvasInspectorNodeDraft(
  draft: CanvasInspectorNodeDraft,
  context?: CanvasInspectorNodeDraftValidationContext
): CanvasInspectorNodeDraftErrors {
  if (normalizeNodeName(draft.name).length === 0) {
    return {
      name: 'node_name_required',
    };
  }

  if (draft.dbt) {
    const dbtErrors: NonNullable<CanvasInspectorNodeDraftErrors['dbt']> = {};
    if (draft.dbt.packageName.trim().length === 0) {
      dbtErrors.packageName = 'dbt_package_required';
    }
    if (draft.dbt.sourceName.trim().length === 0) {
      dbtErrors.sourceName = 'dbt_source_required';
    }
    if (draft.dbt.schemaName.trim().length === 0) {
      dbtErrors.schemaName = 'dbt_schema_required';
    }
    if (draft.dbt.tableName.trim().length === 0) {
      dbtErrors.tableName = 'dbt_table_required';
    }
    if (!['view', 'table', 'incremental', 'ephemeral'].includes(draft.dbt.materialized)) {
      dbtErrors.materialized = 'dbt_materialization_invalid';
    }
    if (context?.node.pluginId === 'dbt' && context.node.kind === 'dbt:model') {
      const selectedSourceId = draft.dbt.selectedSourceId.trim();
      const connectedOriginIds = new Set(
        resolveCompatibleDbtModelOrigins({
          modelNode: context.node,
          nodes: context.nodes,
          edges: context.edges,
        }).map((origin) => origin.id)
      );
      if (selectedSourceId.length === 0 || !connectedOriginIds.has(selectedSourceId)) {
        dbtErrors.selectedSourceId = 'dbt_source_required';
      }
    }
    if (Object.keys(dbtErrors).length > 0) {
      return {
        dbt: dbtErrors,
      };
    }
  }

  if (draft.dbtTest) {
    const dbtTestErrors = validateDbtTestAuthoringMetadata(draft.dbtTest);
    if (Object.keys(dbtTestErrors).length > 0) {
      return { dbtTest: dbtTestErrors };
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

  if (draft.objectFilePostgres) {
    const validation = validateObjectFilePostgresAuthoringDraft(draft.objectFilePostgres);
    if (!validation.ok) {
      return { objectFilePostgres: validation.errors };
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
    JSON.stringify(originalDraft.dbtTest ?? null) !== JSON.stringify(draft.dbtTest ?? null) ||
    JSON.stringify(originalDraft.dvt ?? null) !== JSON.stringify(draft.dvt ?? null) ||
    JSON.stringify(originalDraft.objectFilePostgres ?? null) !==
      JSON.stringify(draft.objectFilePostgres ?? null)
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

  if (draft.dbtTest) {
    return applyDbtTestAuthoringMetadata(baseNode, draft.dbtTest);
  }

  if (draft.dbt) {
    return applyDbtNodeAuthoringMetadata(baseNode, draft.dbt);
  }

  if (draft.dvt) {
    return applyDvtNodeAuthoringMetadata(baseNode, draft.dvt);
  }

  if (draft.objectFilePostgres) {
    return applyObjectFilePostgresAuthoringDraft(baseNode, draft.objectFilePostgres);
  }

  return baseNode;
}

export function canonicalizeCanvasInspectorNodeDraft(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft
): CanvasInspectorNodeDraft {
  return createCanvasInspectorNodeDraft(applyCanvasInspectorNodeDraft(node, draft));
}
