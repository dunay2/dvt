/** Owned concern: translate Canvas surface strategy sections into node workbench read-model sections. */
import type { CanvasNodeWorkbenchSectionPolicyId } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  NodePropertySection,
  NodePropertySectionId,
} from '../../components/inspector/nodePropertiesReadModel';

const STRATEGY_SECTION_TO_NODE_PROPERTY_SECTION = new Map<
  CanvasNodeWorkbenchSectionPolicyId,
  NodePropertySectionId
>([
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
  ['sink', 'sink'],
]);

export function resolveNodeWorkbenchPrimarySectionIds(
  strategySectionIds: readonly CanvasNodeWorkbenchSectionPolicyId[]
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

export type CanvasNodeWorkbenchSectionModel = Readonly<{
  sections: readonly NodePropertySection[];
  primarySectionIds: readonly NodePropertySectionId[];
}>;

type ResolveCanvasNodeWorkbenchSectionModelArgs = Readonly<{
  nodeKind: string;
  canEditNode: boolean;
  canOpenNodeCode: boolean;
  strategySectionIds: readonly CanvasNodeWorkbenchSectionPolicyId[];
  contributedSectionIds: ReadonlySet<NodePropertySectionId>;
  sections: readonly NodePropertySection[];
}>;

function isEditableSection(
  nodeKind: string,
  sectionId: NodePropertySectionId,
  canEditNode: boolean
): boolean {
  if (!canEditNode) {
    return false;
  }

  if (sectionId === 'general') {
    return true;
  }

  if (nodeKind === 'dbt:model') {
    return sectionId === 'code';
  }

  if (nodeKind === 'dvt:transform') {
    return sectionId === 'code' || sectionId === 'columns';
  }

  return nodeKind === 'dvt:sink' && sectionId === 'sink';
}

function hasRecordedSectionContent(section: NodePropertySection): boolean {
  return section.rows.length > 0 || section.tableRows.length > 0 || section.code != null;
}

function isSupportedSection(
  section: NodePropertySection,
  args: ResolveCanvasNodeWorkbenchSectionModelArgs
): boolean {
  if (section.id === 'general') {
    return true;
  }

  if (section.id === 'summary') {
    return args.contributedSectionIds.has(section.id) || hasRecordedSectionContent(section);
  }

  if (args.contributedSectionIds.has(section.id)) {
    return true;
  }

  if (section.id === 'code' && args.canOpenNodeCode) {
    return true;
  }

  return (
    hasRecordedSectionContent(section) ||
    isEditableSection(args.nodeKind, section.id, args.canEditNode)
  );
}

/**
 * Resolves section capability separately from tab/overflow placement. Code is
 * first when supported; data-backed sections survive only when they carry
 * current facts, editing semantics, or a plugin contribution.
 */
export function resolveCanvasNodeWorkbenchSectionModel(
  args: ResolveCanvasNodeWorkbenchSectionModelArgs
): CanvasNodeWorkbenchSectionModel {
  const supportedSections = args.sections.filter((section) => isSupportedSection(section, args));
  const supportedSectionById = new Map(
    supportedSections.map((section) => [section.id, section] as const)
  );
  const declaredSectionIds = resolveNodeWorkbenchPrimarySectionIds(args.strategySectionIds);
  const primarySectionIds: NodePropertySectionId[] = [];
  const appendPrimarySection = (sectionId: NodePropertySectionId): void => {
    if (supportedSectionById.has(sectionId) && !primarySectionIds.includes(sectionId)) {
      primarySectionIds.push(sectionId);
    }
  };

  appendPrimarySection('code');
  appendPrimarySection('general');
  for (const sectionId of declaredSectionIds) {
    appendPrimarySection(sectionId);
  }

  const primarySectionIdSet = new Set(primarySectionIds);
  const sections = [
    ...primarySectionIds.flatMap((sectionId): readonly NodePropertySection[] => {
      const section = supportedSectionById.get(sectionId);
      return section == null ? [] : [section];
    }),
    ...supportedSections.filter((section) => !primarySectionIdSet.has(section.id)),
  ];

  return { sections, primarySectionIds };
}
