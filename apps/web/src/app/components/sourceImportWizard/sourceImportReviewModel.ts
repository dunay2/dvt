import {
  buildSourceImportObjectViewModel,
  formatSourceImportObjectCount,
  type SourceImportCatalogCopy,
  type SourceImportObjectViewModel,
} from './sourceImportCatalogModel';
import { buildSourceImportRegistryPath, getSelectedSourceObjects } from './sourceImportWizardModel';
import type { SourceImportGroupingStrategy, SelectableSourceObject } from './types';

export type SourceImportReviewPreviewGroupViewModel = Readonly<{
  registryPath: string;
  objectCountLabel: string;
  sourceObjects: readonly SourceImportObjectViewModel[];
}>;

export function buildSourceImportReviewPreviewGroups({
  sourceObjects,
  groupingStrategy,
  copy,
  numberFormatter = new Intl.NumberFormat(),
}: Readonly<{
  sourceObjects: readonly SelectableSourceObject[];
  groupingStrategy: SourceImportGroupingStrategy;
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): readonly SourceImportReviewPreviewGroupViewModel[] {
  const groups = new Map<string, SourceImportObjectViewModel[]>();

  getSelectedSourceObjects(sourceObjects).forEach((sourceObject, index) => {
    const registryPath = buildSourceImportRegistryPath(sourceObject, groupingStrategy);
    const groupSourceObjects = groups.get(registryPath) ?? [];
    groupSourceObjects.push(
      buildSourceImportObjectViewModel(sourceObject, index, copy, numberFormatter)
    );
    groups.set(registryPath, groupSourceObjects);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([registryPath, groupSourceObjects]) => ({
      registryPath,
      objectCountLabel: formatSourceImportObjectCount(
        groupSourceObjects.length,
        copy,
        numberFormatter
      ),
      sourceObjects: groupSourceObjects,
    }));
}
