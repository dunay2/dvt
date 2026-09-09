/** Owned concern: derive, validate, and apply the route-owned Inspector DTO for governed node details. */
import {
  CANVAS_AUTHORING_FIELD_LIMITS_V1,
  CanvasDescriptionV1Schema,
  CanvasHumanNameV1Schema,
  CanvasTagsV1Schema,
  countUnicodeCodePoints,
  isWellFormedCanvasText,
  PostgresIdentifierV1Schema,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDbtNodeAuthoringMetadata,
  createDbtNodeAuthoringMetadata,
  hasDbtCompatibilityMetadata,
  isDbtCompatibleModel,
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
  readEffectiveDbtModelColumnNames,
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
  return value.trim().length === 0 ? undefined : value;
}

function normalizeNodeTags(tags: readonly string[]): string[] {
  return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

export function createCanvasInspectorNodeDraft(node: CanonicalNode): CanvasInspectorNodeDraft {
  const hasDbtCompatibility = hasDbtCompatibilityMetadata(node);
  const dvtMetadata = hasDbtCompatibility ? null : createDvtNodeAuthoringMetadata(node);
  const objectFilePostgresDraft = createObjectFilePostgresAuthoringDraft(node);
  const httpJsonArtifactDraft = createHttpJsonArtifactAuthoringDraft(node);
  const tags = normalizeNodeTags(node.tags);

  return {
    name: node.name,
    description: node.description ?? '',
    tags,
    ...(hasDbtCompatibility && node.kind !== 'dbt:test'
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
  const normalizedName = normalizeNodeName(draft.name);
  if (normalizedName.length === 0) {
    return {
      name: 'node_name_required',
    };
  }
  if (!isWellFormedCanvasText(normalizedName)) {
    return { name: 'node_name_invalid' };
  }
  if (!CanvasHumanNameV1Schema.safeParse(normalizedName).success) {
    return { name: 'node_name_too_long' };
  }

  const normalizedDescription = normalizeNodeDescription(draft.description);
  if (normalizedDescription != null && !isWellFormedCanvasText(normalizedDescription)) {
    return { description: 'node_description_invalid' };
  }
  if (
    normalizedDescription != null &&
    !CanvasDescriptionV1Schema.safeParse(normalizedDescription).success
  ) {
    return { description: 'node_description_too_long' };
  }

  const normalizedTags = normalizeNodeTags(draft.tags);
  if (normalizedTags.some((tag) => !isWellFormedCanvasText(tag))) {
    return { tags: 'node_tags_invalid' };
  }
  if (
    normalizedTags.some(
      (tag) => countUnicodeCodePoints(tag) > CANVAS_AUTHORING_FIELD_LIMITS_V1.tagCodePoints
    )
  ) {
    return { tags: 'node_tag_too_long' };
  }
  if (!CanvasTagsV1Schema.safeParse(normalizedTags).success) {
    return { tags: 'node_tags_invalid' };
  }
  const outputNameDrafts = Object.values(draft.outputNameDrafts ?? {});
  if (outputNameDrafts.some((value) => value.trim().length === 0)) {
    return { outputNames: 'dvt_alias_required' };
  }
  if (outputNameDrafts.some((value) => !isWellFormedCanvasText(value))) {
    return { outputNames: 'dvt_identifier_invalid' };
  }
  if (outputNameDrafts.some((value) => value !== value.trim())) {
    return { outputNames: 'dvt_identifier_whitespace' };
  }
  if (outputNameDrafts.some((value) => !PostgresIdentifierV1Schema.safeParse(value).success)) {
    return { outputNames: 'dvt_identifier_too_long' };
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
    if (context != null && isDbtCompatibleModel(context.node)) {
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
        !readEffectiveDbtModelColumnNames({
          node: selectedTarget,
          nodes: context.nodes,
          edges: context.edges,
        }).includes(draft.dbtTest.targetColumn.trim())
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
  const draftTags = normalizeNodeTags(draft.tags);

  return (
    node.name !== normalizeNodeName(draft.name) ||
    (node.description ?? undefined) !== normalizeNodeDescription(draft.description) ||
    JSON.stringify(originalDraft.tags) !== JSON.stringify(draftTags) ||
    JSON.stringify(originalDraft.dbt ?? null) !== JSON.stringify(draft.dbt ?? null) ||
    JSON.stringify(originalDraft.dbtTest ?? null) !== JSON.stringify(draft.dbtTest ?? null) ||
    JSON.stringify(originalDraft.dvt ?? null) !== JSON.stringify(draft.dvt ?? null) ||
    Object.keys(draft.outputNameDrafts ?? {}).length > 0 ||
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
  const tags = normalizeNodeTags(draft.tags);
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
