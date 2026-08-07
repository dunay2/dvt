/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';

import { getInspectorPanels } from '../../plugins/registry';
import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import {
  inspectorStatusDotClasses,
  inspectorVisualClasses,
} from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../components/ui/utils';
import type { CanvasNodeWorkbenchSectionPolicyId } from '../../plugins/canvasSurfaceStrategyContracts';
import { NodePropertiesTabs } from '../../components/inspector/NodePropertiesTabs';
import type {
  NodePropertiesReadModel,
  NodePropertyRowId,
  NodePropertySectionId,
} from '../../components/inspector/nodePropertiesReadModel';
import {
  buildNodePropertiesReadModel,
  NODE_PROPERTY_ROW_ID,
} from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import {
  resolveCanvasNodeWorkbenchContributions,
  type CanvasNodeWorkbenchContribution,
} from './canvasNodeWorkbenchContribution';
import { resolveNodeWorkbenchPrimarySectionIds } from './canvasNodeWorkbenchSectionStrategy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { buildCanvasNodePresentationCopy } from './canvasNodePresentationCopy';
import { canvasNodeWorkbenchVisualTokens } from './canvasNodeWorkbenchVisualTokens';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { useCanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';

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
  dragHandleProps?: CanvasNodeWorkbenchDragHandleProps;
  onOpenNodeCode?: () => void;
  onClose: () => void;
}>;

export type CanvasNodeWorkbenchDragHandleProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{
    'data-slot'?: string;
  }>;

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

function buildNodeWorkbenchReadModel({
  model,
  node,
  canEditNode,
  supersededRowIdsBySection,
  supersededSectionIds,
}: Readonly<{
  model: NodePropertiesReadModel;
  node: CanonicalNode;
  canEditNode: boolean;
  supersededRowIdsBySection: ReadonlyMap<NodePropertySectionId, ReadonlySet<NodePropertyRowId>>;
  supersededSectionIds: ReadonlySet<NodePropertySectionId>;
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
          canEditNode &&
          node.pluginId === 'dbt' &&
          node.kind === 'dbt:model' &&
          section.id === 'code'
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

function renderWorkbenchContributions(
  contributions: readonly CanvasNodeWorkbenchContribution[] | undefined,
  nodeId: string
): ReactNode {
  if (contributions == null || contributions.length === 0) {
    return null;
  }

  return contributions.map((contribution) => (
    <PluginContributionBoundary
      key={contribution.id}
      resetKey={`${nodeId}:${contribution.id}`}
      fallback={null}
    >
      {contribution.content}
    </PluginContributionBoundary>
  ));
}

function buildContributionChildrenBySection(
  contributionsBySection: ReadonlyMap<
    NodePropertySectionId,
    readonly CanvasNodeWorkbenchContribution[]
  >,
  nodeId: string
): Partial<Record<NodePropertySectionId, ReactNode>> {
  return Object.fromEntries(
    Array.from(contributionsBySection, ([sectionId, contributions]) => [
      sectionId,
      renderWorkbenchContributions(contributions, nodeId),
    ])
  );
}

export function CanvasNodeWorkbenchPanel({
  node,
  nodes,
  edges,
  activeRunId,
  registeredPlugins = new Set(),
  preferredTabId = null,
  preferredTabRequestId = 0,
  primarySectionIds,
  authoring,
  contributions = [],
  dragHandleProps,
  onOpenNodeCode,
  onClose,
}: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);
  const draftController = useCanvasNodeWorkbenchDraftController(node);
  const presentationTruth = useMemo(
    () => projectCanvasNodePresentationTruth({ node, nodes, edges }),
    [edges, node, nodes]
  );
  const baseModel = buildNodePropertiesReadModel({
    node,
    nodes,
    edges,
    presentationCopy: buildCanvasNodePresentationCopy(copy),
    presentationTruth,
  });
  const contributionModel = resolveCanvasNodeWorkbenchContributions(node.id, contributions);
  const model = buildNodeWorkbenchReadModel({
    model: baseModel,
    node,
    canEditNode: authoring.canEditNode,
    supersededRowIdsBySection: contributionModel.supersededRowIdsBySection,
    supersededSectionIds: contributionModel.supersededSectionIds,
  });
  const panels = getInspectorPanels(node, { activeRunId, registeredPlugins });
  const resolvedPrimarySectionIds =
    primarySectionIds == null
      ? undefined
      : resolveNodeWorkbenchPrimarySectionIds(primarySectionIds);
  const panelIds = panels.map((panel) => panel.id);
  const resolvedActiveTab = resolveActiveNodeWorkbenchTab({ activeTab, model, panelIds });
  const dotClass = inspectorStatusDotClasses[node.status] ?? inspectorStatusDotClasses.idle;
  const preferredTabKey =
    preferredTabId == null ? null : `${node.id}:${preferredTabId}:${preferredTabRequestId}`;
  const renderAuthoringSection = (
    section: 'general' | 'columns' | 'code' | 'sink'
  ): JSX.Element => (
    <div data-slot="canvas-node-workbench-authoring" className="space-y-3 pt-1">
      <CanvasInspectorAuthoringSection
        node={node}
        nodes={nodes}
        edges={edges}
        authoring={authoring}
        section={section}
        draftController={draftController}
      />
    </div>
  );
  const sectionBeforeChildren = buildContributionChildrenBySection(
    contributionModel.beforeBodyBySection,
    node.id
  );
  const sectionAfterChildren = buildContributionChildrenBySection(
    contributionModel.afterBodyBySection,
    node.id
  );
  const handleActiveTabChange = (nextTabId: string): void => {
    if (nextTabId === 'code' && onOpenNodeCode != null) {
      onOpenNodeCode();
      return;
    }

    setActiveTab(nextTabId);
  };

  if (authoring.canEditNode) {
    sectionBeforeChildren.general = (
      <>
        {renderAuthoringSection('general')}
        {sectionBeforeChildren.general}
      </>
    );
    for (const sectionId of ['columns', 'code', 'sink'] as const) {
      sectionAfterChildren[sectionId] = (
        <>
          {sectionAfterChildren[sectionId]}
          {renderAuthoringSection(sectionId)}
        </>
      );
    }
  }

  useEffect(() => {
    if (preferredTabKey == null || preferredTabKey === appliedPreferredTabKey) {
      return;
    }

    setActiveTab(preferredTabId ?? undefined);
    setAppliedPreferredTabKey(preferredTabKey);
  }, [appliedPreferredTabKey, preferredTabId, preferredTabKey]);

  useEffect(() => {
    if (activeTab !== resolvedActiveTab) {
      setActiveTab(resolvedActiveTab);
    }
  }, [activeTab, resolvedActiveTab]);

  return (
    <div data-slot="canvas-node-workbench-panel" className="flex h-full min-h-0 flex-col">
      <div className={inspectorVisualClasses.contextPanelHeaderRow}>
        <div
          {...dragHandleProps}
          className={cn(
            dragHandleProps != null && canvasNodeWorkbenchVisualTokens.dragHandle,
            dragHandleProps?.className
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn('size-2 shrink-0 rounded-full', dotClass)} />
            <h2 className={cn('truncate', inspectorVisualClasses.contextPanelTitle)}>
              {node.name}
            </h2>
          </div>
          <p className={cn('font-mono', inspectorVisualClasses.contextPanelSubtitle)}>
            {node.kind}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-slot="canvas-node-workbench-close"
          onClick={onClose}
        >
          {copy.nodeWorkbenchCloseLabel}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <NodePropertiesTabs
            node={node}
            model={model}
            activeRunId={activeRunId}
            panels={panels}
            activeTab={resolvedActiveTab}
            primarySectionIds={resolvedPrimarySectionIds}
            sectionBeforeChildren={sectionBeforeChildren}
            sectionAfterChildren={sectionAfterChildren}
            moreLabel={copy.nodeWorkbenchMoreLabel}
            slotPrefix="canvas-node-workbench"
            surface="workbench"
            showSectionCountBadge
            onActiveTabChange={handleActiveTabChange}
            onHide={onClose}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
