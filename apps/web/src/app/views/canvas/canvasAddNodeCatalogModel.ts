/** Owned concern: derive searchable Canvas add-node catalog items without rendering UI. */
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy, type CanvasViewCopy } from './copy';

export type CanvasAddNodeCatalogCategory =
  | 'source'
  | 'model'
  | 'seed'
  | 'transformation'
  | 'test'
  | 'output'
  | 'macro'
  | 'node';

export type CanvasAddNodeCatalogItem = Readonly<{
  id: string;
  actionLabel: string;
  category: CanvasAddNodeCatalogCategory;
  categoryLabel: string;
  description: string;
  registration: NodeKindRegistration;
  searchableText: string;
}>;

type BuildCanvasAddNodeCatalogItemsArgs = Readonly<{
  authoringNodeKinds: readonly NodeKindRegistration[];
  copy?: CanvasViewCopy;
}>;

const CATEGORY_ORDER: readonly CanvasAddNodeCatalogCategory[] = [
  'source',
  'model',
  'seed',
  'transformation',
  'test',
  'output',
  'macro',
  'node',
];

function categoryIndex(category: CanvasAddNodeCatalogCategory): number {
  return CATEGORY_ORDER.indexOf(category);
}

export function inferCanvasAddNodeCatalogCategory(
  registration: NodeKindRegistration
): CanvasAddNodeCatalogCategory {
  if (registration.kind.endsWith(':source')) {
    return 'source';
  }

  if (registration.kind === 'dbt:model') {
    return 'model';
  }

  if (registration.kind.endsWith(':seed')) {
    return 'seed';
  }

  if (registration.kind === 'dvt:sql_transform' || registration.role === 'transform') {
    return 'transformation';
  }

  if (registration.kind.endsWith(':test') || registration.role === 'check') {
    return 'test';
  }

  if (registration.kind === 'dvt:sink' || registration.role === 'output') {
    return 'output';
  }

  if (registration.kind.endsWith(':macro')) {
    return 'macro';
  }

  return 'node';
}

export function buildCanvasAddNodeCatalogItems({
  authoringNodeKinds,
  copy = canvasViewCopy,
}: BuildCanvasAddNodeCatalogItemsArgs): readonly CanvasAddNodeCatalogItem[] {
  const seenIds = new Set<string>();
  const items = authoringNodeKinds.map((registration) => {
    const category = inferCanvasAddNodeCatalogCategory(registration);
    const id = `create-node:${registration.kind}`;
    if (seenIds.has(id)) {
      throw new Error(`Duplicate Canvas add-node catalog item "${id}".`);
    }
    seenIds.add(id);

    const actionLabel = resolveCanvasAddNodeCatalogActionLabel(registration, category, copy);
    const categoryLabel = resolveCanvasAddNodeCatalogCategoryLabel(category, copy);
    const description = resolveCanvasAddNodeCatalogDescription(category, copy);

    return {
      id,
      actionLabel,
      category,
      categoryLabel,
      description,
      registration,
      searchableText: [
        actionLabel,
        categoryLabel,
        description,
        registration.kind,
        registration.label,
      ]
        .join(' ')
        .toLowerCase(),
    } satisfies CanvasAddNodeCatalogItem;
  });

  return items.sort(
    (left, right) =>
      categoryIndex(left.category) - categoryIndex(right.category) ||
      left.actionLabel.localeCompare(right.actionLabel) ||
      left.id.localeCompare(right.id)
  );
}

export function filterCanvasAddNodeCatalogItems(
  items: readonly CanvasAddNodeCatalogItem[],
  query: string
): readonly CanvasAddNodeCatalogItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return items;
  }

  return items.filter((item) => item.searchableText.includes(normalizedQuery));
}

function resolveCanvasAddNodeCatalogActionLabel(
  registration: NodeKindRegistration,
  category: CanvasAddNodeCatalogCategory,
  copy: CanvasViewCopy
): string {
  switch (category) {
    case 'source':
      return copy.canvasContextMenuAddSourceLabel;
    case 'model':
      return copy.canvasContextMenuAddModelLabel;
    case 'seed':
      return copy.canvasContextMenuAddSeedLabel;
    case 'transformation':
      return copy.canvasContextMenuAddTransformationLabel;
    case 'test':
      return copy.canvasContextMenuAddTestLabel;
    case 'output':
      return copy.canvasContextMenuAddOutputLabel;
    case 'macro':
      return copy.canvasContextMenuAddMacroLabel;
    case 'node':
      return `${copy.canvasContextMenuAddNodeLabel} ${registration.label}`.trim();
  }
}

function resolveCanvasAddNodeCatalogCategoryLabel(
  category: CanvasAddNodeCatalogCategory,
  copy: CanvasViewCopy
): string {
  switch (category) {
    case 'source':
      return copy.canvasAddNodeCatalogSourceCategoryLabel;
    case 'model':
      return copy.canvasAddNodeCatalogModelCategoryLabel;
    case 'seed':
      return copy.canvasAddNodeCatalogSeedCategoryLabel;
    case 'transformation':
      return copy.canvasAddNodeCatalogTransformationCategoryLabel;
    case 'test':
      return copy.canvasAddNodeCatalogTestCategoryLabel;
    case 'output':
      return copy.canvasAddNodeCatalogOutputCategoryLabel;
    case 'macro':
      return copy.canvasAddNodeCatalogMacroCategoryLabel;
    case 'node':
      return copy.canvasAddNodeCatalogNodeCategoryLabel;
  }
}

function resolveCanvasAddNodeCatalogDescription(
  category: CanvasAddNodeCatalogCategory,
  copy: CanvasViewCopy
): string {
  switch (category) {
    case 'source':
      return copy.canvasAddNodeCatalogSourceDescription;
    case 'model':
      return copy.canvasAddNodeCatalogModelDescription;
    case 'seed':
      return copy.canvasAddNodeCatalogSeedDescription;
    case 'transformation':
      return copy.canvasAddNodeCatalogTransformationDescription;
    case 'test':
      return copy.canvasAddNodeCatalogTestDescription;
    case 'output':
      return copy.canvasAddNodeCatalogOutputDescription;
    case 'macro':
      return copy.canvasAddNodeCatalogMacroDescription;
    case 'node':
      return copy.canvasAddNodeCatalogNodeDescription;
  }
}
