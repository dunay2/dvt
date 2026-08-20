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
import type { WorkspaceScope } from '../../ports/sessionContext';
import {
  applyObjectFilePostgresAuthoringDraft,
  createObjectFilePostgresAuthoringDraft,
  OBJECT_FILE_POSTGRES_AUTHORING_ERROR,
  validateObjectFilePostgresAuthoringDraft,
} from './objectFilePostgresAuthoringModel';
import { resolveCompatibleDbtModelOrigins } from './canvasDbtModelArtifactProjection';
import {
  readDeclaredDbtModelColumnNames,
  resolveConnectedDbtTestTargets,
} from './canvasDbtTestTargetPolicy';
import {
  applyHttpJsonArtifactAuthoringDraft,
  createHttpJsonArtifactAuthoringDraft,
  HTTP_JSON_AUTHORING_ERROR,
  validateHttpJsonArtifactAuthoringDraft,
} from './httpJsonArtifactAuthoringModel';

export type CanvasInspectorNodeDraftValidationContext = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  workspaceScope?: WorkspaceScope;
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
  const httpJsonArtifactDraft = createHttpJsonArtifactAuthoringDraft(node);
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
    ...(httpJsonArtifactDraft == null ? {} : { httpJsonArtifact: httpJsonArtifactDraft }),
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
      const effectiveSourceId =
        selectedSourceId.length > 0
          ? selectedSourceId
          : connectedOriginIds.size === 1
            ? (connectedOriginIds.values().next().value ?? '')
            : '';
      if (effectiveSourceId.length === 0 || !connectedOriginIds.has(effectiveSourceId)) {
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
    if (
      context?.node.pluginId === 'dbt' &&
      context.node.kind === 'dbt:test' &&
      !dbtTestErrors.targetModelId
    ) {
      const selectedTarget = resolveConnectedDbtTestTargets({
        testNodeId: context.node.id,
        nodes: context.nodes,
        edges: context.edges,
      }).find((target) => target.id === draft.dbtTest?.targetModelId.trim());

      if (!selectedTarget) {
        dbtTestErrors.targetModelId = 'dbt_test_target_required';
      } else if (
        !dbtTestErrors.targetColumn &&
        !readDeclaredDbtModelColumnNames(selectedTarget).includes(draft.dbtTest.targetColumn.trim())
      ) {
        dbtTestErrors.targetColumn = 'dbt_test_column_not_declared';
      }
    }
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
    if (context?.workspaceScope == null) {
      return {
        objectFilePostgres: {
          storageUri: OBJECT_FILE_POSTGRES_AUTHORING_ERROR.storageUri,
        },
      };
    }
    const validation = validateObjectFilePostgresAuthoringDraft(
      draft.objectFilePostgres,
      context.workspaceScope
    );
    if (!validation.ok) {
      return { objectFilePostgres: validation.errors };
    }
  }

  if (draft.httpJsonArtifact) {
    if (context?.workspaceScope == null) {
      return {
        httpJsonArtifact: { storageUri: HTTP_JSON_AUTHORING_ERROR.storageUri },
      };
    }
    const validation = validateHttpJsonArtifactAuthoringDraft(
      draft.httpJsonArtifact,
      context.workspaceScope
    );
    if (!validation.ok) return { httpJsonArtifact: validation.errors };
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
      JSON.stringify(draft.objectFilePostgres ?? null) ||
    JSON.stringify(originalDraft.httpJsonArtifact ?? null) !==
      JSON.stringify(draft.httpJsonArtifact ?? null)
  );
}

export function applyCanvasInspectorNodeDraft(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft,
  workspaceScope?: WorkspaceScope
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
    return workspaceScope == null
      ? node
      : applyObjectFilePostgresAuthoringDraft(baseNode, draft.objectFilePostgres, workspaceScope);
  }

  if (draft.httpJsonArtifact) {
    return workspaceScope == null
      ? node
      : applyHttpJsonArtifactAuthoringDraft(baseNode, draft.httpJsonArtifact, workspaceScope);
  }

  return baseNode;
}

export function canonicalizeCanvasInspectorNodeDraft(
  node: CanonicalNode,
  draft: CanvasInspectorNodeDraft,
  workspaceScope?: WorkspaceScope
): CanvasInspectorNodeDraft {
  return createCanvasInspectorNodeDraft(applyCanvasInspectorNodeDraft(node, draft, workspaceScope));
}
