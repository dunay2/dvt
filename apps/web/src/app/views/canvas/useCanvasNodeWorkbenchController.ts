/** Coordinate existing node-workbench readers, draft ownership and tab requests. */
import { useMemo, useState } from 'react';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import { getInspectorPanels } from '../../plugins/registry';
import type { CanvasNodeWorkbenchSectionPolicyId } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  NodePropertiesReadModel,
  NodePropertySectionId,
} from '../../components/inspector/nodePropertiesContracts';
import { buildNodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import {
  resolveCanvasNodeWorkbenchContributions,
  type CanvasNodeWorkbenchContribution,
} from './canvasNodeWorkbenchContribution';
import { resolveCanvasNodeWorkbenchSectionModel } from './canvasNodeWorkbenchSectionStrategy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { buildCanvasNodePresentationCopy } from './canvasNodePresentationCopy';
import { useCanvasNodePresentation } from './useCanvasNodePresentations';
import { useCanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { isDbtCompatibleModel, reconcileDbtModelConnectedOrigin } from './canvasDbtAuthoringModel';
import { useCanvasColumnCommentCellRenderer } from './useCanvasColumnCommentCellRenderer';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { buildNodeWorkbenchReadModel } from './canvasNodeWorkbenchReadModel';
import { projectCanvasPublishedInputFields } from './canvasPublishedInputFields';

export type CanvasNodeWorkbenchPanelProps = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  activeRunId: string | null;
  registeredPlugins?: ReadonlySet<string>;
  preferredTabId?: string | null;
  preferredTabRequestId?: number;
  primarySectionIds?: readonly CanvasNodeWorkbenchSectionPolicyId[];
  authoring: CanvasInspectorAuthoringContract;
  contributions?: readonly CanvasNodeWorkbenchContribution[];
  onOpenSemanticEditor?: () => void;
  onClose: () => void;
}>;

function resolveActiveNodeWorkbenchTab({
  activeTab,
  model,
  panelIds,
}: Readonly<{
  activeTab?: string;
  model: NodePropertiesReadModel;
  panelIds: readonly string[];
}>): string {
  if (
    activeTab != null &&
    (model.sections.some((section) => section.id === activeTab) || panelIds.includes(activeTab))
  ) {
    return activeTab;
  }

  return model.sections[0]?.id ?? 'general';
}

function readDvtTransformAuthoringMode(
  node: CanonicalNode
): (typeof DVT_TRANSFORM_AUTHORING_MODE)[keyof typeof DVT_TRANSFORM_AUTHORING_MODE] | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return null;
  try {
    return readDvtTransformAuthoringAuthority(node)?.mode ?? null;
  } catch {
    return null;
  }
}

export function useCanvasNodeWorkbenchController({
  node: canonicalNode,
  nodes,
  edges,
  activeRunId,
  registeredPlugins = new Set(),
  preferredTabId = null,
  preferredTabRequestId = 0,
  primarySectionIds,
  authoring,
  contributions = [],
}: CanvasNodeWorkbenchPanelProps) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const semanticEditorCopy = resolveCanvasSemanticEditorCopy(applicationLanguage);
  const workspaceLayoutKey =
    authoring.workspaceScope == null
      ? null
      : `${authoring.workspaceScope.tenantId}::${authoring.workspaceScope.projectId}::${authoring.workspaceScope.environmentId}`;
  const node = useMemo(
    () => reconcileDbtModelConnectedOrigin({ node: canonicalNode, nodes, edges }),
    [canonicalNode, edges, nodes]
  );
  const requestKey = JSON.stringify([node.id, preferredTabId, preferredTabRequestId]);
  const [selection, setSelection] = useState<{ requestKey: string; tabId: string }>();
  const activeTab =
    selection?.requestKey === requestKey ? selection.tabId : (preferredTabId ?? undefined);
  const draftController = useCanvasNodeWorkbenchDraftController(node, authoring.workspaceScope);
  const renderTableCell = useCanvasColumnCommentCellRenderer({ copy, authoring, draftController });
  const presentationTruth = useCanvasNodePresentation({ node, nodes, edges });
  const transferColumns = authoring.canEditNode
    ? projectCanvasPublishedInputFields(node, presentationTruth).map(
        ({ columnId, name, type }) => ({ id: columnId, name, type })
      )
    : [];
  const dvtTransformAuthoringMode = readDvtTransformAuthoringMode(node);
  const semanticDvtTransform =
    node.pluginId === 'dvt' && node.kind === 'dvt:transform' && !isDbtCompatibleModel(node);
  const canonicalSubstraitTransformAuthority =
    dvtTransformAuthoringMode === DVT_TRANSFORM_AUTHORING_MODE.substrait;
  const canonicalDvtRelationColumnAuthority =
    canonicalSubstraitTransformAuthority ||
    (node.kind === 'dvt:source' &&
      draftController.draft.dvt?.kind === 'source' &&
      draftController.draft.dvt.semantic != null);
  const approvedWarehouseSourceOverview =
    node.kind === 'dvt:source' && node.pluginId === 'dvt.warehouse-source';
  const baseModel = buildNodePropertiesReadModel({
    node,
    nodes,
    edges,
    presentationCopy: buildCanvasNodePresentationCopy(copy, applicationLanguage),
    presentationTruth,
  });
  const contributionModel = resolveCanvasNodeWorkbenchContributions(node.id, contributions);
  const contributedSectionIds = new Set<NodePropertySectionId>([
    ...contributionModel.beforeBodyBySection.keys(),
    ...contributionModel.afterBodyBySection.keys(),
  ]);
  const unfilteredModel = buildNodeWorkbenchReadModel({
    codeTruth: presentationTruth.code,
    model: baseModel,
    node,
    canEditNode: authoring.canEditNode,
    supersededRowIdsBySection: contributionModel.supersededRowIdsBySection,
    supersededSectionIds: contributionModel.supersededSectionIds,
    contributedSectionIds,
  });
  const panels = getInspectorPanels(node, { activeRunId, registeredPlugins });
  const sectionModel = resolveCanvasNodeWorkbenchSectionModel({
    nodeKind: node.kind,
    canEditNode: authoring.canEditNode,
    canOpenNodeCode: contributedSectionIds.has('code'),
    strategySectionIds: primarySectionIds ?? [
      'code',
      'properties',
      'columns',
      'inputs-outputs',
      'tests',
    ],
    contributedSectionIds,
    sections: unfilteredModel.sections,
  });
  const model = {
    ...unfilteredModel,
    sections: sectionModel.sections.map((section) =>
      approvedWarehouseSourceOverview && section.id === 'general'
        ? { ...section, rows: [] }
        : section
    ),
  };
  const resolvedPrimarySectionIds = sectionModel.primarySectionIds;
  const panelIds = panels.map((panel) => panel.id);
  const resolvedActiveTab = resolveActiveNodeWorkbenchTab({ activeTab, model, panelIds });
  const containsCanonicalCodeOutput =
    resolvedActiveTab === 'code' &&
    canonicalSubstraitTransformAuthority &&
    presentationTruth.code.kind === 'canonical';
  return {
    node,
    copy,
    semanticEditorCopy,
    workspaceLayoutKey,
    draftController,
    renderTableCell,
    transferColumns,
    presentationTruth,
    semanticDvtTransform,
    canonicalDvtRelationColumnAuthority,
    approvedWarehouseSourceOverview,
    baseModel,
    contributionModel,
    contributedSectionIds,
    panels,
    model,
    resolvedPrimarySectionIds,
    resolvedActiveTab,
    containsCanonicalCodeOutput,
    onActiveTabChange: (tabId: string) => setSelection({ requestKey, tabId }),
  };
}

export type CanvasNodeWorkbenchController = ReturnType<typeof useCanvasNodeWorkbenchController>;
