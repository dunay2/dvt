/** Owned concern: validate and group route-owned contributions to one selected-node workbench. */
import type { ReactNode } from 'react';

import type {
  NodePropertyRowId,
  NodePropertySectionId,
} from '../../components/inspector/nodePropertiesReadModel';

export type CanvasNodeWorkbenchContribution = Readonly<{
  id: string;
  nodeId: string;
  sectionId: NodePropertySectionId;
  placement: 'before-body' | 'after-body';
  content: ReactNode;
  supersededRowIds?: readonly NodePropertyRowId[];
}>;

export type CanvasNodeWorkbenchContributionModel = Readonly<{
  beforeBodyBySection: ReadonlyMap<
    NodePropertySectionId,
    readonly CanvasNodeWorkbenchContribution[]
  >;
  afterBodyBySection: ReadonlyMap<
    NodePropertySectionId,
    readonly CanvasNodeWorkbenchContribution[]
  >;
  supersededRowIdsBySection: ReadonlyMap<NodePropertySectionId, ReadonlySet<NodePropertyRowId>>;
}>;

function appendContribution(
  target: Map<NodePropertySectionId, CanvasNodeWorkbenchContribution[]>,
  contribution: CanvasNodeWorkbenchContribution
): void {
  const current = target.get(contribution.sectionId) ?? [];
  current.push(contribution);
  target.set(contribution.sectionId, current);
}

export function resolveCanvasNodeWorkbenchContributions(
  nodeId: string,
  contributions: readonly CanvasNodeWorkbenchContribution[]
): CanvasNodeWorkbenchContributionModel {
  const beforeBodyBySection = new Map<NodePropertySectionId, CanvasNodeWorkbenchContribution[]>();
  const afterBodyBySection = new Map<NodePropertySectionId, CanvasNodeWorkbenchContribution[]>();
  const supersededRowIdsBySection = new Map<NodePropertySectionId, Set<NodePropertyRowId>>();
  const contributionIds = new Set<string>();

  for (const contribution of contributions) {
    if (contribution.nodeId !== nodeId) {
      continue;
    }
    if (contributionIds.has(contribution.id)) {
      throw new Error(`Duplicate node workbench contribution id: ${contribution.id}`);
    }
    contributionIds.add(contribution.id);

    appendContribution(
      contribution.placement === 'before-body' ? beforeBodyBySection : afterBodyBySection,
      contribution
    );

    if (contribution.supersededRowIds == null) {
      continue;
    }
    const rowIds = supersededRowIdsBySection.get(contribution.sectionId) ?? new Set();
    for (const rowId of contribution.supersededRowIds) {
      rowIds.add(rowId);
    }
    supersededRowIdsBySection.set(contribution.sectionId, rowIds);
  }

  return {
    beforeBodyBySection,
    afterBodyBySection,
    supersededRowIdsBySection,
  };
}
