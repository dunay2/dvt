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
