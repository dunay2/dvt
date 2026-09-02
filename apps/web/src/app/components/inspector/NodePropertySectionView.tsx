/** Owned concern: render one node property section from the Inspector read model. */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { MetricEvidenceHotspot } from '../metrics/MetricEvidenceHotspot';
import { MonacoCodeViewer } from '../monaco/MonacoCodeViewer';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import type { NodePropertySection } from './nodePropertiesReadModel';

export type NodePropertyTableCellRenderContext = Readonly<{
  sectionId: NodePropertySection['id'];
  rowId: string;
  columnKey: string;
  value: string;
}>;

export type NodePropertySectionViewProps = Readonly<{
  section: NodePropertySection;
  slots: Readonly<{ sectionPrefix: string; code: string }>;
  surface?: 'inspector' | 'workbench';
  showCountBadge?: boolean;
  beforeBody?: ReactNode;
  afterBody?: ReactNode;
  renderTableCell?: (context: NodePropertyTableCellRenderContext) => ReactNode;
}>;

function sectionSlot(
  section: NodePropertySection,
  slots: Readonly<{ sectionPrefix: string }>
): string {
  return `${slots.sectionPrefix}-${section.id}-section`;
}

function renderSectionBody(
  section: NodePropertySection,
  slots: Readonly<{ code: string }>,
  surface: NodePropertySectionViewProps['surface'],
  hasContextualContent: boolean,
  renderTableCell?: NodePropertySectionViewProps['renderTableCell']
): JSX.Element | null {
  if (section.code != null) {
    return (
      <div data-slot={slots.code}>
        <MonacoCodeViewer
          ariaLabel={section.label}
          language={section.codeLanguage ?? 'text'}
          loadingLabel={section.label}
          path={section.codePath}
          value={section.code}
        />
      </div>
    );
  }

  if (section.tableRows.length > 0) {
    const columnKeys = Array.from(
      new Set(section.tableRows.flatMap((row) => Object.keys(row.cells)))
    );
    const resolveColumnLabel = (key: string): string =>
      section.columnLabels?.[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');

    if (surface === 'workbench' && section.id === 'columns') {
      const detailColumnKeys = columnKeys.filter((key) => key !== 'name');

      return (
        <div
          role="region"
          aria-label={section.label}
          tabIndex={0}
          className="max-h-80 overflow-y-auto rounded border border-(--border-subtle) bg-(--surface-panel)"
        >
          <ul data-slot="node-property-column-list" className="divide-y divide-(--border-subtle)">
            {section.tableRows.map((row) => (
              <li key={row.id} data-slot="node-property-column-record">
                <details data-slot="node-property-column-disclosure" className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2.5 text-sm text-(--text-primary) outline-none hover:bg-(--surface-hover) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring) [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      data-slot="node-property-column-disclosure-arrow"
                      className="mt-0.5 size-4 shrink-0 text-(--text-muted) transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words font-medium">
                      {row.cells.name || row.id}
                    </span>
                  </summary>
                  {detailColumnKeys.length === 0 ? null : (
                    <dl className="grid grid-cols-[minmax(6rem,0.34fr)_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 pb-3 pl-9 text-xs">
                      {detailColumnKeys.map((key) => (
                        <div key={`${row.id}:${key}`} className="contents">
                          <dt className={inspectorVisualClasses.inspectorLabel}>
                            {resolveColumnLabel(key)}
                          </dt>
                          <dd className="min-w-0 break-words text-(--text-primary)">
                            {(renderTableCell?.({
                              sectionId: section.id,
                              rowId: row.id,
                              columnKey: key,
                              value: row.cells[key] ?? '',
                            }) ??
                              row.cells[key]) || (
                              <span className={inspectorVisualClasses.inspectorSubtle}>-</span>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div
        role="region"
        aria-label={section.label}
        tabIndex={0}
        className={
          surface === 'workbench'
            ? 'max-h-80 overflow-auto rounded border border-(--border-subtle) bg-(--surface-panel)'
            : 'max-h-72 overflow-auto border-y border-slate-800'
        }
      >
        <table
          className={cn(
            'w-full border-collapse text-left text-xs',
            surface === 'workbench' && 'min-w-max'
          )}
        >
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
                    'px-2 py-2 font-medium',
                    surface === 'workbench' && 'whitespace-nowrap'
                  )}
                >
                  {surface === 'workbench' ? resolveColumnLabel(key) : key}
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
                      surface === 'workbench'
                        ? 'whitespace-nowrap text-(--text-primary)'
                        : 'text-slate-200'
                    )}
                  >
                    {(renderTableCell?.({
                      sectionId: section.id,
                      rowId: row.id,
                      columnKey: key,
                      value: row.cells[key] ?? '',
                    }) ??
                      row.cells[key]) || (
                      <span className={inspectorVisualClasses.inspectorSubtle}>-</span>
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
            <dt className={inspectorVisualClasses.inspectorLabel}>{row.label}</dt>
            <dd
              className={cn(
                'min-w-0 break-words',
                surface === 'workbench' && 'text-(--text-primary)'
              )}
            >
              {row.detail == null ? (
                row.value
              ) : (
                <MetricEvidenceHotspot
                  dataSlot="node-property-metric-evidence"
                  detail={row.detail}
                  tone={row.tone ?? 'neutral'}
                  value={row.value}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (hasContextualContent) {
    return null;
  }

  return (
    <p className={inspectorVisualClasses.inspectorBody}>
      {section.emptyState ?? 'No properties are recorded for this section.'}
    </p>
  );
}

function renderSectionCountBadge(section: NodePropertySection): JSX.Element | null {
  return section.tableRows.length > 0 ? (
    <Badge variant="secondary" className={inspectorVisualClasses.contextPanelTabBadge}>
      {section.tableRows.length}
    </Badge>
  ) : null;
}

export function NodePropertySectionView({
  section,
  slots,
  surface = 'inspector',
  showCountBadge = false,
  beforeBody,
  afterBody,
  renderTableCell,
}: NodePropertySectionViewProps): JSX.Element {
  const renderContributionSlot = (placement: 'before-body' | 'after-body', content: ReactNode) =>
    content == null ? null : (
      <div
        data-slot={`${slots.sectionPrefix}-editable-properties`}
        data-placement={placement}
        className="space-y-3 pt-1"
      >
        {content}
      </div>
    );

  return (
    <section data-slot={sectionSlot(section, slots)} className="space-y-3">
      {surface === 'workbench' && (section.id === 'code' || section.id === 'general') ? null : (
        <div className="flex items-center justify-between gap-3">
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{section.label}</h3>
          {showCountBadge ? renderSectionCountBadge(section) : null}
        </div>
      )}
      {section.description == null ? null : (
        <p
          data-slot={`${slots.sectionPrefix}-${section.id}-description`}
          className={inspectorVisualClasses.contextPanelSectionDescription}
        >
          {section.description}
        </p>
      )}
      {renderContributionSlot('before-body', beforeBody)}
      {renderSectionBody(
        section,
        slots,
        surface,
        beforeBody != null || afterBody != null,
        renderTableCell
      )}
      {renderContributionSlot('after-body', afterBody)}
    </section>
  );
}
