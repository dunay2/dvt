/** Owned concern: render passive node properties from a table-like Inspector read model. */
import type { ReactNode } from 'react';

import type { InspectorPanelContribution } from '../../plugins/contracts/PluginManifest';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { graphVisualClasses } from '../../plugins/graph/graphVisualTokens';
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
import type { NodePropertiesReadModel, NodePropertySection } from './nodePropertiesReadModel';

export type NodePropertiesTabsProps = Readonly<{
  node: CanonicalNode;
  model: NodePropertiesReadModel;
  activeRunId: string | null;
  panels: readonly InspectorPanelContribution[];
  activeTab: string;
  beforePanels?: ReactNode;
  tagsEditor?: ReactNode;
  slotPrefix?: string;
  surface?: 'inspector' | 'workbench';
  showSectionCountBadge?: boolean;
  onActiveTabChange: (tab: string) => void;
  onHide: () => void;
}>;

function renderSectionBody(
  section: NodePropertySection,
  slots: Readonly<{ code: string }>,
  surface: NodePropertiesTabsProps['surface']
): JSX.Element {
  if (section.code != null) {
    return (
      <pre
        data-slot={slots.code}
        className={cn(
          surface === 'workbench' ? 'max-h-80 overflow-auto p-3' : 'max-h-72 overflow-auto p-2',
          graphVisualClasses.inspectorCodeBlock
        )}
      >
        {section.code}
      </pre>
    );
  }

  if (section.tableRows.length > 0) {
    const columnKeys = Array.from(
      new Set(section.tableRows.flatMap((row) => Object.keys(row.cells)))
    );

    return (
      <div
        className={
          surface === 'workbench'
            ? 'max-h-80 overflow-auto rounded border border-(--border-subtle)'
            : 'max-h-72 overflow-auto border-y border-slate-800'
        }
      >
        <table className="w-full border-collapse text-left text-xs">
          <thead
            className={
              surface === 'workbench'
                ? 'sticky top-0 bg-(--surface-panel) text-(--text-muted)'
                : 'sticky top-0 bg-slate-950 text-slate-400'
            }
          >
            <tr>
              {columnKeys.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className={cn(
                    surface === 'workbench'
                      ? 'border-b border-(--border-subtle) capitalize'
                      : 'border-b border-slate-800',
                    'px-2 py-2 font-medium'
                  )}
                >
                  {surface === 'workbench' ? key.replace(/([a-z])([A-Z])/g, '$1 $2') : key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={
              surface === 'workbench'
                ? 'divide-y divide-(--border-subtle)'
                : 'divide-y divide-slate-800'
            }
          >
            {section.tableRows.map((row) => (
              <tr key={row.id}>
                {columnKeys.map((key) => (
                  <td
                    key={`${row.id}:${key}`}
                    className={cn(
                      'px-2 py-2 align-top',
                      surface === 'workbench' ? 'text-(--text-primary)' : 'text-slate-200'
                    )}
                  >
                    {row.cells[key] || (
                      <span className={graphVisualClasses.inspectorSubtle}>-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section.rows.length > 0) {
    return (
      <dl
        className={
          surface === 'workbench'
            ? 'grid grid-cols-[minmax(96px,0.36fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm'
            : 'grid grid-cols-[minmax(92px,0.42fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm'
        }
      >
        {section.rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className={graphVisualClasses.inspectorLabel}>{row.label}</dt>
            <dd
              className={cn(
                'min-w-0 break-words',
                surface === 'workbench' && 'text-(--text-primary)'
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <p className={graphVisualClasses.inspectorBody}>
      {section.emptyState ?? 'No properties are recorded for this section.'}
    </p>
  );
}

function sectionSlot(
  section: NodePropertySection,
  slots: Readonly<{ sectionPrefix: string }>
): string {
  return `${slots.sectionPrefix}-${section.id}-section`;
}

const PRIMARY_NODE_WORKBENCH_SECTION_IDS = new Set<NodePropertySection['id']>([
  'general',
  'columns',
  'inputs-outputs',
  'tests',
  'code',
]);

function isPrimarySection(section: NodePropertySection): boolean {
  return PRIMARY_NODE_WORKBENCH_SECTION_IDS.has(section.id);
}

function renderTabBadge(section: NodePropertySection): JSX.Element | null {
  return section.tableRows.length > 0 ? (
    <Badge variant="secondary" className={graphVisualClasses.contextPanelTabBadge}>
      {section.tableRows.length}
    </Badge>
  ) : null;
}

export function NodePropertiesTabs({
  model,
  node,
  activeRunId,
  panels,
  activeTab,
  beforePanels,
  tagsEditor,
  slotPrefix,
  surface = 'inspector',
  showSectionCountBadge = false,
  onActiveTabChange,
  onHide,
}: NodePropertiesTabsProps): JSX.Element {
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
  const primarySections = model.sections.filter(isPrimarySection);
  const overflowSections = model.sections.filter((section) => !isPrimarySection(section));
  const overflowItems = [
    ...overflowSections.map((section) => ({
      id: section.id,
      label: section.label,
      count: section.tableRows.length,
    })),
    ...panels.map((panel) => ({
      id: panel.id,
      label: resolveString(panel.label),
      count: 0,
    })),
  ];
  const activeOverflowItem = overflowItems.find((item) => item.id === activeTab);

  return (
    <Tabs
      data-slot={slots.root}
      value={activeTab}
      onValueChange={onActiveTabChange}
      className="gap-4"
    >
      <TabsList data-slot={slots.list} className={graphVisualClasses.contextPanelFlatTabsList}>
        {primarySections.map((section) => (
          <TabsTrigger
            key={section.id}
            value={section.id}
            data-slot={`${slots.tabPrefix}-${section.id}`}
            className={graphVisualClasses.contextPanelFlatTabTrigger}
          >
            {section.label}
            {renderTabBadge(section)}
          </TabsTrigger>
        ))}
        {overflowItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-slot={slots.moreTrigger}
                className={cn(
                  graphVisualClasses.contextPanelFlatTabTrigger,
                  activeOverflowItem != null && 'border-(--focus-ring) text-slate-50'
                )}
              >
                {activeOverflowItem == null ? 'More' : `More: ${activeOverflowItem.label}`}
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
                    <Badge variant="secondary" className={graphVisualClasses.contextPanelTabBadge}>
                      {item.count}
                    </Badge>
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TabsList>

      {model.sections.map((section) => (
        <TabsContent key={section.id} value={section.id} className="m-0">
          <section data-slot={sectionSlot(section, slots)} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className={graphVisualClasses.contextPanelSectionTitle}>{section.label}</h3>
              {showSectionCountBadge ? renderTabBadge(section) : null}
            </div>
            {renderSectionBody(section, slots, surface)}
            {section.id === 'general' && beforePanels ? (
              <div
                data-slot={`${slots.sectionPrefix}-editable-properties`}
                className="space-y-3 pt-1"
              >
                {beforePanels}
              </div>
            ) : null}
          </section>
        </TabsContent>
      ))}

      {panels.map((panel) => {
        const PanelComponent = panel.component;
        return (
          <TabsContent key={panel.id} value={panel.id} className="m-0">
            <PanelComponent
              node={node}
              activeRunId={activeRunId}
              onClose={onHide}
              tagsEditor={tagsEditor}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
