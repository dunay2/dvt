/** Compose existing inspector sections and editors; no semantic decisions or draft mutations. */
import type { ReactNode } from 'react';

import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import { NodePropertiesTabs } from '../../components/inspector/NodePropertiesTabs';
import type { NodePropertySectionId } from '../../components/inspector/nodePropertiesContracts';
import { CanvasInspectorAuthoringSection } from './CanvasInspectorAuthoringSection';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { DvtTransformCodeWorkbenchContent } from './DvtTransformCodeWorkbenchContent';
import { SourceOverviewPanel } from './SourceOverviewPanel';
import type {
  CanvasNodeWorkbenchController,
  CanvasNodeWorkbenchPanelProps,
} from './useCanvasNodeWorkbenchController';

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

export function CanvasNodeWorkbenchSections({
  controller,
  nodes,
  edges,
  authoring,
  activeRunId,
  onOpenSemanticEditor,
  onClose,
}: CanvasNodeWorkbenchPanelProps & { controller: CanvasNodeWorkbenchController }): JSX.Element {
  const {
    node,
    copy,
    semanticEditorCopy,
    workspaceLayoutKey,
    draftController,
    renderTableCell,
    transferColumns,
    presentationTruth,
    semanticDvtTransform,
    approvedWarehouseSourceOverview,
    baseModel,
    contributionModel,
    contributedSectionIds,
    panels,
    model,
    resolvedPrimarySectionIds,
    resolvedActiveTab,
    containsCanonicalCodeOutput,
    onActiveTabChange,
  } = controller;
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
  if (semanticDvtTransform) {
    const codeDescription = baseModel.sections.find(
      (section) => section.id === 'code'
    )?.description;
    sectionAfterChildren.code = (
      <>
        {sectionAfterChildren.code}
        <DvtTransformCodeWorkbenchContent
          key={`${node.id}:${presentationTruth.code.kind === 'canonical' ? presentationTruth.code.digest : presentationTruth.code.kind}`}
          transformNode={node}
          nodes={nodes}
          edges={edges}
          {...(presentationTruth.code.kind === 'canonical'
            ? { canonicalContent: presentationTruth.code.content }
            : {})}
          canonicalDescription={codeDescription}
          openSemanticEditorLabel={semanticEditorCopy.openEditorAction}
          {...(onOpenSemanticEditor == null ? {} : { onOpenSemanticEditor })}
          copy={copy}
        />
      </>
    );
  }
  if (approvedWarehouseSourceOverview) {
    sectionBeforeChildren.general = (
      <>
        <SourceOverviewPanel
          node={node}
          nodes={nodes}
          edges={edges}
          readModel={baseModel}
          authoring={authoring}
          draftController={draftController}
        />
        {sectionBeforeChildren.general}
      </>
    );
  }

  if (authoring.canEditNode) {
    if (!approvedWarehouseSourceOverview) {
      sectionBeforeChildren.general = (
        <>
          {renderAuthoringSection('general')}
          {sectionBeforeChildren.general}
        </>
      );
    }
    for (const sectionId of ['code', 'sink'] as const) {
      if (sectionId === 'code' && semanticDvtTransform) continue;
      sectionAfterChildren[sectionId] = (
        <>
          {sectionAfterChildren[sectionId]}
          {renderAuthoringSection(sectionId)}
        </>
      );
    }
  }

  return (
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
      fillAvailableHeight={containsCanonicalCodeOutput}
      moreLabel={copy.nodeWorkbenchMoreLabel}
      slotPrefix="canvas-node-workbench"
      surface="workbench"
      showSectionCountBadge
      sourceListOrdering={{ canReorder: authoring.canEditNode, workspaceLayoutKey }}
      sourceTransferColumns={transferColumns}
      renderTableCell={renderTableCell}
      onActiveTabChange={onActiveTabChange}
      onHide={onClose}
    />
  );
}
