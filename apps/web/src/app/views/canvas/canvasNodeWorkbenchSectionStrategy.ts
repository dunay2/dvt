/** Owned concern: translate Canvas surface strategy sections into node workbench read-model sections. */
import type { NodePropertySectionId } from '../../components/inspector/nodePropertiesReadModel';

const STRATEGY_SECTION_TO_NODE_PROPERTY_SECTION = new Map<string, NodePropertySectionId>([
  ['properties', 'general'],
  ['metadata', 'general'],
  ['columns', 'columns'],
  ['inputs', 'inputs-outputs'],
  ['outputs', 'inputs-outputs'],
  ['inputs-outputs', 'inputs-outputs'],
  ['lineage', 'inputs-outputs'],
  ['tests', 'tests'],
  ['sql', 'code'],
  ['code', 'code'],
]);

export function resolveNodeWorkbenchPrimarySectionIds(
  strategySectionIds: readonly string[]
): readonly NodePropertySectionId[] {
  const sectionIds: NodePropertySectionId[] = [];
  const seenSectionIds = new Set<NodePropertySectionId>();

  for (const strategySectionId of strategySectionIds) {
    const sectionId = STRATEGY_SECTION_TO_NODE_PROPERTY_SECTION.get(strategySectionId);
    if (sectionId == null || seenSectionIds.has(sectionId)) {
      continue;
    }

    sectionIds.push(sectionId);
    seenSectionIds.add(sectionId);
  }

  return sectionIds;
}
