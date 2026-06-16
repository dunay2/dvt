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
  onActiveTabChange: (tab: string) => void;
  onHide: () => void;
}>;

function renderSectionBody(section: NodePropertySection): JSX.Element {
  if (section.code != null) {
    return (
      <pre className={cn('max-h-72 overflow-auto p-2', graphVisualClasses.inspectorCodeBlock)}>
        {section.code}
      </pre>
    );
  }

  if (section.tableRows.length > 0) {
    const columnKeys = Array.from(
      new Set(section.tableRows.flatMap((row) => Object.keys(row.cells)))
    );

    return (
      <div className="max-h-72 overflow-auto border-y border-slate-800">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-slate-950 text-slate-400">
            <tr>
              {columnKeys.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="border-b border-slate-800 px-2 py-2 font-medium"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {section.tableRows.map((row) => (
              <tr key={row.id}>
                {columnKeys.map((key) => (
                  <td key={`${row.id}:${key}`} className="px-2 py-2 align-top text-slate-200">
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
      <div className="grid grid-cols-[minmax(92px,0.42fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        {section.rows.map((row) => (
          <div key={row.label} className="contents">
            <span className={graphVisualClasses.inspectorLabel}>{row.label}</span>
            <span className="min-w-0 break-words">{row.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className={graphVisualClasses.inspectorBody}>
      {section.emptyState ?? 'No properties are recorded for this section.'}
    </p>
  );
}

function sectionSlot(section: NodePropertySection): string {
  return `node-inspector-${section.id}-section`;
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
  onActiveTabChange,
  onHide,
}: NodePropertiesTabsProps): JSX.Element {
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
      data-slot="node-inspector-core-tabs"
      value={activeTab}
      onValueChange={onActiveTabChange}
      className="gap-4"
    >
      <TabsList
        data-slot="node-inspector-core-tabs-list"
        className={graphVisualClasses.contextPanelFlatTabsList}
      >
        {primarySections.map((section) => (
          <TabsTrigger
            key={section.id}
            value={section.id}
            data-slot={`node-inspector-tab-${section.id}`}
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
                data-slot="node-inspector-more-trigger"
                className={cn(
                  graphVisualClasses.contextPanelFlatTabTrigger,
                  activeOverflowItem != null && 'border-[color:var(--focus-ring)] text-slate-50'
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
                  data-slot={`node-inspector-more-item-${item.id}`}
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
          <section data-slot={sectionSlot(section)} className="space-y-3">
            <h3 className={graphVisualClasses.contextPanelSectionTitle}>{section.label}</h3>
            {renderSectionBody(section)}
            {section.id === 'general' && beforePanels ? (
              <div data-slot="node-inspector-editable-properties" className="space-y-3 pt-1">
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
