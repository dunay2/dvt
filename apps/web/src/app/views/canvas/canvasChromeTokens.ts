/** Owned concern: own Canvas route chrome visual tokens for toolbar and tab-strip presentation. */
export const canvasChromeClasses = {
  toolbar:
    'flex h-10 shrink-0 items-center justify-end gap-3 border-b border-[color:var(--border-default)] bg-[var(--surface-panel)] px-3',
  separator: 'h-5 bg-[var(--border-default)]',
  statusBadge:
    'h-7 border border-[color:var(--border-default)] bg-[var(--surface-app)] px-2 text-[11px] font-medium',
  ghostButton:
    'h-8 gap-1.5 px-3 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
  outlineButton:
    'h-8 border-[color:var(--border-default)] bg-transparent px-3 text-xs text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
  replacementButton:
    'h-8 shrink-0 gap-1.5 border-[color:var(--border-default)] bg-[var(--surface-app)] px-2.5 text-xs text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
  replacementDialog:
    'border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-strong)]',
  replacementDescription: 'text-[var(--text-muted)]',
  tabKindBadge:
    'rounded-sm border border-[color:var(--border-default)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--text-subtle)]',
} as const;

export const canvasDraftStatusToneClasses = {
  danger:
    'border-[color:var(--status-danger)] bg-[var(--surface-elevated)] text-[var(--status-danger)]',
  neutral:
    'border-[color:var(--border-default)] bg-[var(--surface-app)] text-[var(--text-default)]',
  warning:
    'border-[color:var(--status-warning)] bg-[var(--surface-elevated)] text-[var(--status-warning)]',
} as const;

export type CanvasChromeTone = keyof typeof canvasDraftStatusToneClasses | 'success';

export function resolveCanvasDraftStatusClassName(
  tone: keyof typeof canvasDraftStatusToneClasses
): string {
  return canvasDraftStatusToneClasses[tone];
}

export function resolveCanvasWorkflowStatusClassName(tone: CanvasChromeTone): string {
  switch (tone) {
    case 'danger':
      return 'text-[var(--status-danger)]';
    case 'success':
      return 'text-[var(--status-success)]';
    case 'warning':
      return 'text-[var(--status-warning)]';
    default:
      return 'text-[var(--text-default)]';
  }
}
