/** Owned concern: render passive node properties from a table-like Inspector read model. */
import type { ReactNode } from 'react';

import type { InspectorPanelContribution } from '../../plugins/contracts/PluginManifest';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';
import {
  NodePropertySectionView,
  type NodePropertyTableCellRenderContext,
} from './NodePropertySectionView';
import { SourceColumnsPanel } from './SourceColumnsPanel';
import type { NodePropertiesReadModel, NodePropertySection } from './nodePropertiesReadModel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

export type NodePropertiesTabsProps = Readonly<{
  node: CanonicalNode;
  model: NodePropertiesReadModel;
  activeRunId: string | null;
  panels: readonly InspectorPanelContribution[];
  activeTab: string;
  primarySectionIds?: readonly NodePropertySection['id'][];
  persistentSectionIds?: readonly NodePropertySection['id'][];
  beforePanels?: ReactNode;
  sectionBeforeChildren?: Partial<Record<NodePropertySection['id'], ReactNode>>;
  sectionAfterChildren?: Partial<Record<NodePropertySection['id'], ReactNode>>;
  moreLabel: string;
  tagsEditor?: ReactNode;
  fillAvailableHeight?: boolean;
  slotPrefix?: string;
  surface?: 'inspector' | 'workbench';
  showSectionCountBadge?: boolean;
  renderTableCell?: (context: NodePropertyTableCellRenderContext) => ReactNode;
  onActiveTabChange: (tab: string) => void;
  onHide: () => void;
}>;

const PRIMARY_NODE_WORKBENCH_SECTION_IDS = new Set<NodePropertySection['id']>([
  'general',
  'columns',
  'inputs-outputs',
  'tests',
  'code',
]);

const SOURCE_OVERVIEW_LABEL = {
  key: 'canvas.nodeWorkbench.source.overviewLabel',
  fallback: 'Overview',
  translations: { es: 'Resumen' },
} as const;

function isPrimarySection(section: NodePropertySection): boolean {
  return PRIMARY_NODE_WORKBENCH_SECTION_IDS.has(section.id);
}

function resolvePrimarySections({
  sections,
  primarySectionIds,
}: Readonly<{
  sections: readonly NodePropertySection[];
  primarySectionIds?: readonly NodePropertySection['id'][];
}>): readonly NodePropertySection[] {
  if (primarySectionIds == null) {
    return sections.filter(isPrimarySection);
  }

  const sectionById = new Map(sections.map((section) => [section.id, section]));
  return primarySectionIds.flatMap((sectionId): readonly NodePropertySection[] => {
    const section = sectionById.get(sectionId);
    return section == null ? [] : [section];
  });
}

function renderTabBadge(section: NodePropertySection): JSX.Element | null {
  return section.tableRows.length > 0 ? (
    <Badge variant="secondary" className={inspectorVisualClasses.contextPanelTabBadge}>
      {section.tableRows.length}
    </Badge>
  ) : null;
}

function resolvePresentedSection(
  section: NodePropertySection,
  node: CanonicalNode,
  applicationLanguage: string
): NodePropertySection {
  if (node.kind !== 'dvt:source' || section.id !== 'general') {
    return section;
  }

  return {
    ...section,
    label: resolveString(SOURCE_OVERVIEW_LABEL, applicationLanguage),
  };
}

function usesApprovedWarehouseSourceColumns(node: CanonicalNode, section: NodePropertySection): boolean {
  return (
    node.kind === 'dvt:source' &&
    node.pluginId === 'dvt.warehouse-source' &&
    section.id === 'columns'
  );
}

export function NodePropertiesTabs({
  model,
  node,
  activeRunId,
  panels,
  activeTab,
  primarySectionIds,
  persistentSectionIds = [],
  beforePanels,
  sectionBeforeChildren,
  sectionAfterChildren,
  moreLabel,
  tagsEditor,
  fillAvailableHeight = false,
  slotPrefix,
  surface = 'inspector',
  showSectionCountBadge = false,
  renderTableCell,
  onActiveTabChange,
  onHide,
}: NodePropertiesTabsProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const slots =
    slotPrefix == null
      ? {
          root: 'node-inspector-core-tabs',
          list: 'node-inspector-core-tabs-list',
          tabPrefix: 'node-inspector-tab',
          moreTrigger: 'node-inspector-more-trigger',
          moreItemPrefix: 'node-inspector-more-item',
          sectionPrefix: 'node-inspector',
          code: 'node-inspector-code',
        }
      : {
          root: `${slotPrefix}-tabs`,
          list: `${slotPrefix}-tabs-list`,
          tabPrefix: `${slotPrefix}-tab`,
          moreTrigger: `${slotPrefix}-more-trigger`,
          moreItemPrefix: `${slotPrefix}-more-item`,
          sectionPrefix: slotPrefix,
          code: `${slotPrefix}-code`,
        };
  const presentedSections = model.sections.map((section) =>
    resolvePresentedSection(section, node, applicationLanguage)
  );
  const primarySections = resolvePrimarySections({
    sections: presentedSections,
    primarySectionIds,
  });
  const primarySectionIdsSet = new Set(primarySections.map((section) => section.id));
  const overflowSections = presentedSections.filter(
    (section) => !primarySectionIdsSet.has(section.id)
  );
  const overflowItems = [
    ...overflowSections.map((section) => ({
      id: section.id,
      label: section.label,
      count: section.tableRows.length,
    })),
    ...panels.map((panel) => ({
      id: panel.id,
      label: resolveString(panel.label, applicationLanguage),
      count: 0,
    })),
  ];
  const activeOverflowItem = overflowItems.find((item) => item.id === activeTab);

  return (
    <Tabs
      data-slot={slots.root}
      value={activeTab}
      onValueChange={onActiveTabChange}
      className={cn('gap-4', fillAvailableHeight && 'h-full min-h-0')}
    >
      <div data-slot={slots.list} className={inspectorVisualClasses.contextPanelFlatTabsList}>
        <TabsList
          data-slot={`${slots.list}-tablist`}
          className="flex h-auto w-auto flex-wrap justify-start gap-x-3 rounded-none bg-transparent p-0"
        >
          {primarySections.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              data-slot={`${slots.tabPrefix}-${section.id}`}
              className={inspectorVisualClasses.contextPanelFlatTabTrigger}
            >
              {section.label}
              {renderTabBadge(section)}
            </TabsTrigger>
          ))}
        </TabsList>
        {overflowItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-slot={slots.moreTrigger}
                className={cn(
                  inspectorVisualClasses.contextPanelFlatTabTrigger,
                  activeOverflowItem != null && 'border-(--focus-ring) text-slate-50'
                )}
              >
                {activeOverflowItem == null
                  ? moreLabel
                  : `${moreLabel}: ${activeOverflowItem.label}`}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="border-slate-700 bg-slate-950 text-slate-50"
            >
              {overflowItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  data-slot={`${slots.moreItemPrefix}-${item.id}`}
                  onSelect={() => onActiveTabChange(item.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.count > 0 ? (
                    <Badge
                      variant="secondary"
                      className={inspectorVisualClasses.contextPanelTabBadge}
                    >
                      {item.count}
                    </Badge>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {presentedSections.map((section) => {
        const beforeBody =
          sectionBeforeChildren?.[section.id] ?? (section.id === 'general' ? beforePanels : null);
        const afterBody = sectionAfterChildren?.[section.id];
        const sourceColumns = usesApprovedWarehouseSourceColumns(node, section);

        return (
          <TabsContent
            key={section.id}
            value={section.id}
            forceMount={persistentSectionIds.includes(section.id) ? true : undefined}
            data-slot={`${slots.sectionPrefix}-${section.id}-content`}
            className={cn(
              'm-0 data-[state=inactive]:hidden',
              fillAvailableHeight && section.id === activeTab && 'min-h-0 overflow-hidden'
            )}
          >
            {sourceColumns ? (
              <SourceColumnsPanel node={node} beforeBody={beforeBody} afterBody={afterBody} />
            ) : (
              <NodePropertySectionView
                section={section}
                slots={slots}
                surface={surface}
                showCountBadge={showSectionCountBadge}
                fillAvailableHeight={fillAvailableHeight && section.id === activeTab}
                beforeBody={beforeBody}
                afterBody={afterBody}
                renderTableCell={renderTableCell}
              />
            )}
          </TabsContent>
        );
      })}

      {panels.map((panel) => {
        const PanelComponent = panel.component;
        return (
          <TabsContent key={panel.id} value={panel.id} className="m-0">
            <PluginContributionBoundary resetKey={`${node.id}:${panel.id}`} fallback={null}>
              <PanelComponent
                node={node}
                activeRunId={activeRunId}
                onClose={onHide}
                tagsEditor={tagsEditor}
              />
            </PluginContributionBoundary>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
