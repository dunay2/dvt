/** Owned concern: provide reusable presentation primitives for shell operational drawer panels. */
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import type { OperationalDrawerTabId } from './operationalDrawerContributionStore';

const operationalDrawerPanelClassNames = {
  panelSurface: 'h-full min-h-0 overflow-auto px-4 py-3',
  emptyState: 'text-sm text-[var(--text-subtle)]',
  problemList: 'space-y-2',
  problemItem:
    'grid grid-cols-[6rem_1fr] gap-3 border-b border-[color:var(--border-muted)] py-2 text-sm last:border-b-0',
  problemMessageFrame: 'min-w-0 space-y-2',
  problemMessage: 'block text-[var(--text-default)]',
  warningBadge:
    'h-fit rounded border border-amber-400/50 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-100',
  codeToken: 'rounded border border-amber-400/40 px-2 py-0.5 font-mono text-[11px] text-amber-100',
  detailCode: 'mt-1 block font-mono text-[11px] text-[var(--text-muted)]',
  runSummary: 'grid gap-1',
  runLayout: 'flex flex-wrap items-center justify-between gap-3',
  runSummaryLabel: 'text-[var(--text-muted)]',
  runSummaryValue: 'font-mono text-[var(--text-strong)]',
  runSummaryText: 'text-[var(--text-default)]',
  previewLayout: 'flex flex-wrap items-start gap-3',
  previewContent: 'min-w-0 flex-1',
  previewSummary: 'mt-1 text-[var(--text-default)]',
  previewBlockers: 'mt-2 flex flex-wrap gap-1.5',
  sectionKicker: 'text-[11px] font-semibold uppercase text-[var(--text-muted)]',
  tabPanel: 'min-w-0 flex-1',
  dataTableFrame:
    'w-full max-w-full min-w-0 overflow-auto rounded border border-[color:var(--border-default)]',
  dataTable: 'w-max min-w-full border-collapse text-left font-mono text-xs',
  dataTableHeader:
    'sticky top-0 z-10 border-b border-[color:var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-strong)]',
  dataTableHeaderCell:
    'min-w-32 max-w-80 overflow-hidden border-r border-[color:var(--border-default)] px-3 py-2 font-semibold text-ellipsis whitespace-nowrap last:border-r-0',
  dataTableRow: 'last:[&>td]:border-b-0',
  dataTableCell:
    'min-w-32 max-w-80 overflow-hidden border-r border-b border-[color:var(--border-muted)] px-3 py-2 text-[var(--text-default)] last:border-r-0',
  dataTableValue: 'block max-w-80 truncate',
  dataTableNull: 'italic text-[var(--text-muted)]',
  dataNotice: 'mb-2 text-xs text-[var(--text-muted)]',
  screenReaderOnly: 'sr-only',
} as const;

export function OperationalDrawerPanelSurface({
  ariaLabel,
  children,
  dataSlot,
  textSm = false,
}: Readonly<{
  ariaLabel: string;
  children: ReactNode;
  dataSlot: string;
  textSm?: boolean;
}>): JSX.Element {
  return (
    <section
      data-slot={dataSlot}
      className={
        textSm
          ? `${operationalDrawerPanelClassNames.panelSurface} text-sm`
          : operationalDrawerPanelClassNames.panelSurface
      }
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </section>
  );
}

export function OperationalDrawerEmptyState({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <p className={operationalDrawerPanelClassNames.emptyState}>{children}</p>;
}

export function OperationalDrawerDataNotice({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <p className={operationalDrawerPanelClassNames.dataNotice}>{children}</p>;
}

export function OperationalDrawerDataTable({
  caption,
  columns,
  nullValueLabel,
  rows,
}: Readonly<{
  caption: string;
  columns: readonly Readonly<{ name: string }>[];
  nullValueLabel: string;
  rows: readonly Readonly<{ values: readonly (string | null)[] }>[];
}>): JSX.Element {
  return (
    <div
      data-slot="bottom-operational-data-table-frame"
      className={operationalDrawerPanelClassNames.dataTableFrame}
    >
      <table
        data-slot="bottom-operational-data-table"
        className={operationalDrawerPanelClassNames.dataTable}
      >
        <caption className={operationalDrawerPanelClassNames.screenReaderOnly}>{caption}</caption>
        <thead className={operationalDrawerPanelClassNames.dataTableHeader}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.name}
                scope="col"
                className={operationalDrawerPanelClassNames.dataTableHeaderCell}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={operationalDrawerPanelClassNames.dataTableRow}>
              {row.values.map((value, columnIndex) => (
                <td key={columnIndex} className={operationalDrawerPanelClassNames.dataTableCell}>
                  {value == null ? (
                    <span className={operationalDrawerPanelClassNames.dataTableNull}>
                      {nullValueLabel}
                    </span>
                  ) : (
                    <span
                      data-slot="bottom-operational-data-value"
                      className={operationalDrawerPanelClassNames.dataTableValue}
                      title={value}
                      aria-label={value}
                    >
                      {value}
                    </span>
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

export function OperationalDrawerWarningBadge({
  children,
  dataSlot,
}: Readonly<{
  children: ReactNode;
  dataSlot: string;
}>): JSX.Element {
  return (
    <span data-slot={dataSlot} className={operationalDrawerPanelClassNames.warningBadge}>
      {children}
    </span>
  );
}

export function OperationalDrawerProblemList({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <ol className={operationalDrawerPanelClassNames.problemList}>{children}</ol>;
}

export function OperationalDrawerProblemItem({
  action,
  detail,
  message,
  severityLabel,
}: Readonly<{
  action?: Readonly<{ label: string; onAction: () => void }> | null;
  detail: string;
  message: string;
  severityLabel: string;
}>): JSX.Element {
  return (
    <li className={operationalDrawerPanelClassNames.problemItem}>
      <OperationalDrawerWarningBadge dataSlot="bottom-operational-problem-severity">
        {severityLabel}
      </OperationalDrawerWarningBadge>
      <span className={operationalDrawerPanelClassNames.problemMessageFrame}>
        <span className={operationalDrawerPanelClassNames.problemMessage}>{message}</span>
        <OperationalDrawerDetailCode>{detail}</OperationalDrawerDetailCode>
        {action == null ? null : (
          <OperationalDrawerSecondaryAction onClick={action.onAction}>
            {action.label}
          </OperationalDrawerSecondaryAction>
        )}
      </span>
    </li>
  );
}

export function OperationalDrawerDetailCode({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <span
      data-slot="bottom-operational-detail-code"
      className={operationalDrawerPanelClassNames.detailCode}
    >
      {children}
    </span>
  );
}

export function OperationalDrawerCodeToken({
  children,
  dataSlot,
}: Readonly<{
  children: ReactNode;
  dataSlot: string;
}>): JSX.Element {
  return (
    <code data-slot={dataSlot} className={operationalDrawerPanelClassNames.codeToken}>
      {children}
    </code>
  );
}

export function OperationalDrawerSectionKicker({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={operationalDrawerPanelClassNames.sectionKicker}>{children}</div>;
}

export function OperationalDrawerRunActiveSummary({
  activeRunId,
  statusLabel,
  summary,
}: Readonly<{ activeRunId: string; statusLabel: string; summary?: string }>): JSX.Element {
  return (
    <div className={operationalDrawerPanelClassNames.runSummary}>
      <span className={operationalDrawerPanelClassNames.runSummaryLabel}>{statusLabel}</span>
      <code className={operationalDrawerPanelClassNames.runSummaryValue}>{activeRunId}</code>
      {summary == null ? null : (
        <span className={operationalDrawerPanelClassNames.runSummaryText}>{summary}</span>
      )}
    </div>
  );
}

export function OperationalDrawerRunLayout({
  actions,
  children,
}: Readonly<{ actions: ReactNode; children: ReactNode }>): JSX.Element {
  return (
    <div className={operationalDrawerPanelClassNames.runLayout}>
      {children}
      {actions}
    </div>
  );
}

export function OperationalDrawerRunStatusSummary({
  statusLabel,
  summary,
}: Readonly<{ statusLabel: string; summary: string }>): JSX.Element {
  return (
    <div className={operationalDrawerPanelClassNames.runSummary}>
      <span className={operationalDrawerPanelClassNames.runSummaryLabel}>{statusLabel}</span>
      <span className={operationalDrawerPanelClassNames.runSummaryText}>{summary}</span>
    </div>
  );
}

export function OperationalDrawerPreviewLayout({
  action,
  children,
}: Readonly<{ action: ReactNode; children: ReactNode }>): JSX.Element {
  return (
    <div className={operationalDrawerPanelClassNames.previewLayout}>
      <div className={operationalDrawerPanelClassNames.previewContent}>{children}</div>
      {action}
    </div>
  );
}

export function OperationalDrawerPreviewSummary({
  blockers,
  statusLabel,
  summary,
}: Readonly<{
  blockers: readonly string[];
  statusLabel: string;
  summary: string;
}>): JSX.Element {
  return (
    <>
      <OperationalDrawerSectionKicker>{statusLabel}</OperationalDrawerSectionKicker>
      <p className={operationalDrawerPanelClassNames.previewSummary}>{summary}</p>
      {blockers.length > 0 ? (
        <div className={operationalDrawerPanelClassNames.previewBlockers}>
          {blockers.map((blocker) => (
            <OperationalDrawerCodeToken key={blocker} dataSlot="bottom-operational-preview-blocker">
              {blocker}
            </OperationalDrawerCodeToken>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function OperationalDrawerPrimaryAction({
  children,
  dataSlot,
  disabled,
  onClick,
}: Readonly<{
  children: ReactNode;
  dataSlot: string;
  disabled: boolean;
  onClick: () => void;
}>): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-slot={dataSlot}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function OperationalDrawerSecondaryAction({
  children,
  disabled = false,
  onClick,
}: Readonly<{
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}>): JSX.Element {
  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function OperationalDrawerTabPanel({
  active,
  children,
  tabId,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  tabId: OperationalDrawerTabId;
}>): JSX.Element {
  return (
    <div
      id={`bottom-operational-drawer-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`bottom-operational-drawer-tab-${tabId}`}
      tabIndex={active ? 0 : -1}
      hidden={!active}
      data-slot="bottom-operational-drawer-panel"
      data-tab={tabId}
      className={operationalDrawerPanelClassNames.tabPanel}
    >
      {active ? children : null}
    </div>
  );
}
