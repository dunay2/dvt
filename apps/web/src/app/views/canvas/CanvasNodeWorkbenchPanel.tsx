/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { CircleHelp, X } from 'lucide-react';
import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import { getInspectorPanels } from '../../plugins/registry';
import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import {
  inspectorStatusDotClasses,
  inspectorVisualClasses,
} from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
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
import { resolveCanvasNodeWorkbenchSectionModel } from './canvasNodeWorkbenchSectionStrategy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { buildCanvasNodePresentationCopy } from './canvasNodePresentationCopy';
import { canvasNodeWorkbenchVisualTokens } from './canvasNodeWorkbenchVisualTokens';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { useCanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

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

function hasVisualDvtTransformAuthority(node: CanonicalNode): boolean {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:sql_transform') return false;
  try {
    return readDvtTransformAuthoringAuthority(node).mode === DVT_TRANSFORM_AUTHORING_MODE.visual;
  } catch {
    return false;
  }
}

function buildNodeWorkbenchReadModel({
  model,
  node,
  canEditNode,
  supersededRowIdsBySection,
  supersededSectionIds,
  contributedSectionIds,
}: Readonly<{
  model: NodePropertiesReadModel;
  node: CanonicalNode;
  canEditNode: boolean;
  supersededRowIdsBySection: ReadonlyMap<NodePropertySectionId, ReadonlySet<NodePropertyRowId>>;
  supersededSectionIds: ReadonlySet<NodePropertySectionId>;
  contributedSectionIds: ReadonlySet<NodePropertySectionId>;
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
          (contributedSectionIds.has(section.id) ||
            (canEditNode && node.pluginId === 'dbt' && node.kind === 'dbt:model') ||
            (canEditNode &&
              node.pluginId === 'dvt' &&
              node.kind === 'dvt:sql_transform' &&
              !hasVisualDvtTransformAuthority(node)))
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
  onClose,
}: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);
  const draftController = useCanvasNodeWorkbenchDraftController(node, authoring.workspaceScope);
  const presentationTruth = useMemo(
    () => projectCanvasNodePresentationTruth({ node, nodes, edges }),
    [edges, node, nodes]
  );
  const visualDvtTransformAuthority = hasVisualDvtTransformAuthority(node);
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
  const model = { ...unfilteredModel, sections: sectionModel.sections };
  const resolvedPrimarySectionIds = sectionModel.primarySectionIds;
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
    setActiveTab(nextTabId);
  };

  if (authoring.canEditNode) {
    sectionBeforeChildren.general = (
      <>
        {renderAuthoringSection('general')}
        {sectionBeforeChildren.general}
      </>
    );
    for (const sectionId of ['code', 'sink'] as const) {
      if (sectionId === 'code' && visualDvtTransformAuthority) continue;
      sectionAfterChildren[sectionId] = (
        <>
          {sectionAfterChildren[sectionId]}
          {renderAuthoringSection(sectionId)}
        </>
      );
    }
    if (visualDvtTransformAuthority) {
      sectionAfterChildren.columns = (
        <>
          {sectionAfterChildren.columns}
          {renderAuthoringSection('columns')}
        </>
      );
      if (
        presentationTruth.code.kind === 'generated' &&
        authoring.onConvertVisualTransformToSql != null
      ) {
        const generatedSql = presentationTruth.code.content;
        sectionAfterChildren.code = (
          <>
            {sectionAfterChildren.code}
            <div className="flex justify-end pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    data-slot="canvas-node-workbench-convert-visual-to-sql"
                  >
                    {copy.inspectorVisualTransformConvertToSqlLabel}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {copy.inspectorVisualTransformConvertToSqlTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {copy.inspectorVisualTransformConvertToSqlDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{copy.inspectorCancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => authoring.onConvertVisualTransformToSql?.(generatedSql)}
                    >
                      {copy.inspectorVisualTransformConvertToSqlLabel}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        );
      }
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
    <div
      data-slot="canvas-node-workbench-panel"
      className="flex h-full min-h-0 min-w-0 w-full flex-col"
    >
      <div className={inspectorVisualClasses.contextPanelHeaderRow}>
        <div
          {...dragHandleProps}
          className={cn(
            'min-w-0 flex-1',
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
        <div
          data-slot="canvas-node-workbench-header-actions"
          className="ml-auto flex shrink-0 items-center gap-1"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-slot="canvas-node-workbench-help"
                aria-label={copy.inspectorEditablePropertiesTitle}
              >
                <CircleHelp className="size-4" aria-hidden="true" />
                <span className="sr-only">{copy.inspectorEditablePropertiesTitle}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72">
              {copy.inspectorEditablePropertiesDescription}
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-slot="canvas-node-workbench-close"
            aria-label={copy.nodeWorkbenchCloseLabel}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{copy.nodeWorkbenchCloseLabel}</span>
          </Button>
        </div>
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
            persistentSectionIds={contributedSectionIds.has('code') ? ['code'] : undefined}
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
