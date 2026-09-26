/** Owned concern: own Inspector and node workbench visual tokens. */

export const inspectorVisualClasses = {
  inspectorCard: 'border-slate-700 bg-slate-950 p-3 text-slate-50',
  inspectorTitle: 'mb-2 text-sm font-medium text-slate-100',
  inspectorLabel: 'text-slate-400',
  inspectorLabelFixed: 'shrink-0 text-slate-400',
  inspectorBody: 'text-xs text-slate-300',
  inspectorMuted: 'text-sm text-slate-400',
  inspectorMutedBlock: 'space-y-2 text-sm text-slate-400',
  inspectorSubtle: 'text-slate-500',
  inspectorCodeBlock:
    'whitespace-pre-wrap rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-50',
  inspectorCodeText: 'whitespace-pre-wrap font-mono text-xs text-slate-50',
  inspectorArtifactDetail: 'text-xs leading-5 text-(--text-muted)',
  contextPanelLeftShell: 'flex h-full flex-col border-r border-slate-700 bg-slate-900',
  contextPanelRightShell:
    'flex h-full flex-col border-l border-slate-700 bg-slate-900 text-slate-50',
  contextPanelHeader: 'border-b border-slate-700 px-4 py-3',
  contextPanelHeaderRow: 'flex items-start justify-between border-b border-slate-700 px-4 py-3',
  contextPanelTitle: 'text-sm font-semibold text-slate-50',
  contextPanelSubtitle: 'mt-0.5 text-xs text-slate-300',
  contextPanelHelpText: 'text-[11px] leading-5 text-slate-400',
  contextPanelIconButton: 'size-7 text-slate-300 hover:text-white',
  contextPanelActionButton:
    'h-8 justify-start gap-2 border-slate-600 bg-slate-950/40 px-3 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-white',
  contextPanelSection: 'border-b border-slate-700 px-4 py-3',
  contextPanelSectionTitle: 'text-xs font-semibold uppercase text-slate-300',
  contextPanelSectionDescription: 'text-xs leading-5 text-(--text-muted)',
  contextPanelAccordionItem: 'border-b border-slate-700',
  contextPanelAccordionTrigger: 'px-2 py-2 text-sm hover:bg-slate-950',
  contextPanelActiveRow: 'bg-slate-800 text-slate-50 ring-1 ring-blue-500',
  contextPanelInteractiveRow: 'cursor-move hover:bg-slate-950',
  contextPanelReadOnlyRow: 'cursor-default text-slate-300',
  contextPanelSecondaryText: 'text-[10px] text-slate-400',
  contextPanelEmptyText: 'max-w-xs text-center text-sm text-slate-400',
  contextPanelTabsList: 'justify-start rounded-md border border-slate-700 bg-transparent p-1',
  contextPanelTabsTrigger:
    'text-slate-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white',
  contextPanelFlatTabsList:
    'flex h-auto min-h-10 w-full flex-wrap justify-start gap-x-3 gap-y-1 overflow-visible rounded-none border-0 border-b border-slate-700 bg-transparent p-0 pb-1',
  contextPanelFlatTabTrigger:
    'h-10 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-xs font-medium leading-none text-slate-400 shadow-none hover:bg-transparent hover:text-slate-50 data-[state=active]:border-[color:var(--focus-ring)] data-[state=active]:bg-transparent data-[state=active]:text-slate-50 data-[state=active]:shadow-none',
  contextPanelTabBadge:
    'ml-0.5 rounded-full border border-slate-700 bg-slate-900 px-1 py-0 text-[9px] text-slate-300',
  contextPanelDetailsSection: 'border-b border-slate-800 pb-4',
  contextPanelColumnsList:
    'max-h-72 divide-y divide-slate-800 overflow-auto border-y border-slate-800',
  contextPanelColumnType: 'shrink-0 text-xs text-slate-300',
  contextPanelColumnMeta: 'mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400',
  inspectorErrorText: 'text-xs text-red-300',
  inspectorSelectInput:
    'border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm text-slate-50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  inspectorDbtSection: 'space-y-3 border-t border-slate-700 pt-3',
} as const;

export const inspectorStatusDotClasses: Record<string, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

const propertyPanel = 'rounded border border-(--border-subtle) bg-(--surface-panel)';
const propertyValue = 'min-w-0 break-words';
const propertyTable = 'w-full border-collapse text-left text-xs';
const propertyCell = 'px-2 py-2 align-top';

/** Shared property templates; surface differences are explicit, not copied into JSX. */
export const inspectorPropertyClasses = {
  section: 'space-y-3',
  sectionFill: 'flex h-full min-h-0 flex-col',
  contribution: 'space-y-3 pt-1',
  contributionFill: 'flex min-h-0 flex-1 flex-col',
  header: 'flex items-center justify-between gap-3',
  fact: 'contents',
  value: { inspector: propertyValue, workbench: `${propertyValue} text-(--text-primary)` },
  facts: {
    inspector: 'grid grid-cols-[minmax(92px,0.42fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm',
    workbench: 'grid grid-cols-[minmax(96px,0.36fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm',
    relationship: 'grid grid-cols-[minmax(6rem,0.3fr)_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm',
  },
  records: {
    relationship: 'space-y-3',
    column: 'divide-y divide-(--border-subtle)',
    card: `overflow-hidden ${propertyPanel}`,
    region: `max-h-80 overflow-y-auto ${propertyPanel}`,
    disclosure: 'group',
    trigger:
      'flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-sm text-(--text-primary) outline-none hover:bg-(--surface-hover) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring) [&::-webkit-details-marker]:hidden',
    arrow: 'mt-0.5 size-4 shrink-0 text-(--text-muted) transition-transform group-open:rotate-90',
    name: `${propertyValue} font-medium`,
    details:
      'grid grid-cols-[minmax(6rem,0.34fr)_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 pb-3 pl-9 text-xs',
    divided: 'divide-y divide-(--border-subtle)',
    field: 'space-y-1 px-3 py-2.5',
    value: 'min-w-0 [overflow-wrap:anywhere] text-sm text-(--text-primary)',
  },
  table: {
    inspector: {
      region: 'max-h-72 overflow-auto border-y border-slate-800',
      root: propertyTable,
      head: 'sticky top-0 bg-slate-950 text-slate-400',
      heading: 'border-b border-slate-800 px-2 py-2 font-medium',
      body: 'divide-y divide-slate-800',
      cell: `${propertyCell} text-slate-200`,
    },
    workbench: {
      region: `max-h-80 overflow-auto ${propertyPanel}`,
      root: `${propertyTable} min-w-max`,
      head: 'sticky top-0 bg-(--surface-panel) text-(--text-muted)',
      heading:
        'border-b border-(--border-subtle) capitalize px-2 py-2 font-medium whitespace-nowrap',
      body: 'divide-y divide-(--border-subtle)',
      cell: `${propertyCell} whitespace-nowrap text-(--text-primary)`,
    },
  },
} as const;

export const inspectorRelationshipClasses = {
  root: inspectorPropertyClasses.section,
  layout:
    'grid min-h-[36rem] grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-panel)',
  master: 'min-w-0 border-r border-(--border-subtle) p-3',
  header: 'mb-4 flex items-center justify-between gap-2',
  title: 'text-sm font-semibold text-(--text-strong)',
  count: 'text-xs text-(--text-muted)',
  accessible: 'sr-only',
  groups: 'space-y-5',
  group: 'space-y-2',
  groupTitle: 'text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)',
  rows: 'space-y-1',
  row: 'relative flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
  selected: 'border-(--focus-ring) bg-(--surface-selected) text-(--text-strong)',
  unselected:
    'border-transparent bg-(--surface-elevated) text-(--text-primary) hover:bg-(--surface-selected)',
  drop: 'pointer-events-none absolute left-1 right-1 h-0.5 bg-(--status-info)',
  placement: { before: 'top-0', after: 'bottom-0' },
  handle: 'size-4 shrink-0 cursor-grab text-(--text-muted)',
  direction:
    'flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-selected) font-mono text-xs text-(--status-info)',
  name: 'min-w-0 flex-1 truncate font-medium',
  badge: 'shrink-0 px-1.5 py-0 text-[10px]',
  detail: 'min-w-0 p-5',
  detailBody: 'space-y-6',
  detailHeader: 'flex items-start justify-between gap-3',
  detailTitle: 'min-w-0 flex-1 truncate text-lg font-semibold text-(--text-strong)',
  caption: 'shrink-0 text-[10px] text-(--text-muted)',
  topology:
    'flex items-center gap-3 rounded-lg border border-(--border-default) bg-(--surface-elevated) p-4',
  node: 'min-w-0 flex-1 rounded-lg border border-(--border-default) bg-(--surface-selected) px-3 py-3',
  nodeName: 'truncate text-sm font-semibold text-(--text-strong)',
  nodeCaption: 'mt-1 text-[10px] text-(--text-muted)',
  arrow: 'shrink-0 text-lg text-(--status-info)',
} as const;
