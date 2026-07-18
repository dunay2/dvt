/** Owned concern: render the Canvas-owned contextual node workbench panel. */
import { useCallback, useEffect, useState, type HTMLAttributes } from 'react';

import { getInspectorPanels } from '../../plugins/registry';
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
} from '../../components/inspector/nodePropertiesReadModel';
import {
  buildNodePropertiesReadModel,
  NODE_PROPERTY_ROW_ID,
} from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import { resolveNodeWorkbenchPrimarySectionIds } from './canvasNodeWorkbenchSectionStrategy';

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

function buildNodeWorkbenchReadModel({
  model,
  node,
  canEditNode,
}: Readonly<{
  model: NodePropertiesReadModel;
  node: CanonicalNode;
  canEditNode: boolean;
}>): NodePropertiesReadModel {
  const hiddenGeneralRowIds = resolveNodeWorkbenchHiddenGeneralRowIds(node, canEditNode);

  if (hiddenGeneralRowIds.size === 0) {
    return model;
  }

  return {
    ...model,
    sections: model.sections.map((section) =>
      section.id === 'general'
        ? {
            ...section,
            rows: section.rows.filter((row) => !hiddenGeneralRowIds.has(row.id)),
          }
        : section
    ),
  };
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
  dragHandleProps,
  onClose,
}: CanvasNodeWorkbenchPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string | undefined>(() => preferredTabId ?? undefined);
  const [appliedPreferredTabKey, setAppliedPreferredTabKey] = useState<string | null>(null);
  const [authoringDraft, setAuthoringDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const [authoringTagsText, setAuthoringTagsText] = useState(() =>
    createCanvasInspectorNodeDraft(node).tags.join(', ')
  );
  const baseModel = buildNodePropertiesReadModel({ node, nodes, edges });
  const model = buildNodeWorkbenchReadModel({
    model: baseModel,
    node,
    canEditNode: authoring.canEditNode,
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
  const resetAuthoringDraft = useCallback(() => {
    const nextDraft = createCanvasInspectorNodeDraft(node);
    setAuthoringDraft(nextDraft);
    setAuthoringTagsText(nextDraft.tags.join(', '));
  }, [node.description, node.id, node.metadata, node.name, node.tags]);
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
        draftController={{
          draft: authoringDraft,
          tagsText: authoringTagsText,
          onDraftChange: setAuthoringDraft,
          onTagsTextChange: setAuthoringTagsText,
          onResetDraft: resetAuthoringDraft,
        }}
      />
    </div>
  );

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

  useEffect(() => {
    resetAuthoringDraft();
  }, [resetAuthoringDraft]);

  return (
    <div data-slot="canvas-node-workbench-panel" className="flex h-full min-h-0 flex-col">
      <div
        {...dragHandleProps}
        className={cn(
          inspectorVisualClasses.contextPanelHeaderRow,
          dragHandleProps?.className,
          dragHandleProps != null && 'cursor-move select-none'
        )}
      >
        <div className="min-w-0 flex-1">
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
          data-workbench-drag-excluded="true"
          onClick={onClose}
        >
          Close
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
            sectionChildren={
              authoring.canEditNode
                ? {
                    general: renderAuthoringSection('general'),
                    columns: renderAuthoringSection('columns'),
                    code: renderAuthoringSection('code'),
                    sink: renderAuthoringSection('sink'),
                  }
                : undefined
            }
            sectionChildrenPlacement={{
              general: 'before-body',
            }}
            slotPrefix="canvas-node-workbench"
            surface="workbench"
            showSectionCountBadge
            onActiveTabChange={setActiveTab}
            onHide={onClose}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
