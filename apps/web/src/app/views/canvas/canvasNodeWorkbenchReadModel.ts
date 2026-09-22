/** Owned concern: compose passive node properties with their owned editors. */
import type { CanonicalNode } from '../../types/canonical';
import {
  NODE_PROPERTY_ROW_ID,
  type NodePropertiesReadModel,
  type NodePropertyRowId,
  type NodePropertySectionId,
} from '../../components/inspector/nodePropertiesReadModel';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import type { CanvasNodeCodeTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';

const GENERAL_WORKBENCH_ALWAYS_EDITED_ROW_IDS = new Set<NodePropertyRowId>([
  NODE_PROPERTY_ROW_ID.name,
]);
const DVT_SOURCE_TARGET_ROW_IDS = new Set<NodePropertyRowId>([
  NODE_PROPERTY_ROW_ID.database,
  NODE_PROPERTY_ROW_ID.schema,
  NODE_PROPERTY_ROW_ID.table,
  NODE_PROPERTY_ROW_ID.source,
]);
const DVT_SINK_TARGET_ROW_IDS = new Set<NodePropertyRowId>([
  NODE_PROPERTY_ROW_ID.database,
  NODE_PROPERTY_ROW_ID.schema,
  NODE_PROPERTY_ROW_ID.table,
  NODE_PROPERTY_ROW_ID.materialization,
]);

function resolveNodeWorkbenchHiddenGeneralRowIds(
  node: CanonicalNode,
  canEditNode: boolean
): ReadonlySet<NodePropertyRowId> {
  const rowIds = new Set(GENERAL_WORKBENCH_ALWAYS_EDITED_ROW_IDS);

  if (node.id === node.name) {
    rowIds.add(NODE_PROPERTY_ROW_ID.nodeId);
  }

  if (canEditNode && node.kind === 'dvt:source') {
    for (const rowId of DVT_SOURCE_TARGET_ROW_IDS) {
      rowIds.add(rowId);
    }
  }

  if (canEditNode && node.kind === 'dvt:sink') {
    for (const rowId of DVT_SINK_TARGET_ROW_IDS) {
      rowIds.add(rowId);
    }
  }

  return rowIds;
}

export function buildNodeWorkbenchReadModel({
  model,
  node,
  canEditNode,
  supersededRowIdsBySection,
  supersededSectionIds,
  contributedSectionIds,
  codeTruth,
}: Readonly<{
  model: NodePropertiesReadModel;
  node: CanonicalNode;
  canEditNode: boolean;
  supersededRowIdsBySection: ReadonlyMap<NodePropertySectionId, ReadonlySet<NodePropertyRowId>>;
  supersededSectionIds: ReadonlySet<NodePropertySectionId>;
  contributedSectionIds: ReadonlySet<NodePropertySectionId>;
  codeTruth: CanvasNodeCodeTruth;
}>): NodePropertiesReadModel {
  const hiddenGeneralRowIds = resolveNodeWorkbenchHiddenGeneralRowIds(node, canEditNode);
  const hiddenRowIdsBySection = new Map(supersededRowIdsBySection);
  hiddenRowIdsBySection.set(
    'general',
    new Set([
      ...hiddenGeneralRowIds,
      ...(supersededRowIdsBySection.get('general') ?? new Set<NodePropertyRowId>()),
    ])
  );

  return {
    ...model,
    sections: model.sections
      .filter((section) => !supersededSectionIds.has(section.id))
      .map((section) => {
        const resolvedSection =
          section.id === 'code' &&
          !(
            codeTruth.kind === 'unavailable' &&
            codeTruth.reason === 'invalid-canonical-substrait-document'
          ) &&
          (contributedSectionIds.has(section.id) ||
            (canEditNode && isDbtCompatibleModel(node)) ||
            (node.pluginId === 'dvt' &&
              node.kind === 'dvt:transform' &&
              !isDbtCompatibleModel(node)))
            ? (() => {
                const {
                  code: _passiveCode,
                  description: _passiveDescription,
                  emptyState: _passiveEmptyState,
                  ...editableCodeSection
                } = section;
                return editableCodeSection;
              })()
            : section;
        const hiddenRowIds = hiddenRowIdsBySection.get(section.id);
        return hiddenRowIds == null || hiddenRowIds.size === 0
          ? resolvedSection
          : {
              ...resolvedSection,
              rows: resolvedSection.rows.filter((row) => !hiddenRowIds.has(row.id)),
            };
      }),
  };
}
