/** Owned concern: render selected-source review without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy as copy } from './copy';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import {
  buildSourceImportTableViewModel,
  type SourceImportTableViewModel,
} from './sourceImportCatalogModel';
import type { TableInfo } from './types';

export const sourceImportReviewViewClassNames = {
  root: 'space-y-4',
  description: 'mb-4 text-sm text-slate-300',
  card: 'border-slate-600 p-4',
  summary: 'space-y-3 text-sm',
  summaryRow: 'flex justify-between',
  summaryLabel: 'text-slate-300',
  summaryValue: 'font-medium',
  optionRow: 'flex justify-between gap-4',
  previewTitle: 'mb-3 text-sm font-medium',
  destinationPosture:
    'mb-3 rounded border border-amber-800/70 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/80',
  previewScroll: 'h-48',
  previewList: 'space-y-2',
  group: 'rounded border border-slate-600 p-3',
  groupHeader: 'mb-2 flex items-center justify-between',
  groupCode: 'text-sm text-blue-400',
  tableList: 'space-y-1 text-xs text-slate-400',
  tableRow: 'flex min-w-0 items-center justify-between gap-2',
  tableName: 'truncate font-mono',
  tableMeta: 'shrink-0',
  selectedTable:
    'flex min-w-0 items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1',
} as const;

type SourceImportReviewViewProps = Readonly<{
  selectedTables: readonly SourceImportTableViewModel[];
  previewGroups: ReadonlyArray<readonly [string, readonly TableInfo[]]>;
  selectedCount: number;
  groupingStrategy: 'schema' | 'database' | 'custom';
  selectedConnectionName: string;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onRemoveTable: (tableIndex: number) => void;
}>;

export function SourceImportReviewView({
  selectedTables,
  previewGroups,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  sourceImportOptions,
  sourceImportOptionValues,
  onRemoveTable,
}: SourceImportReviewViewProps): JSX.Element {
  return (
    <div className={sourceImportReviewViewClassNames.root}>
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.review.title}</h3>
        <p className={sourceImportReviewViewClassNames.description}>{copy.review.description}</p>
      </div>

      <SourceImportReviewSummaryCard
        selectedConnectionName={selectedConnectionName}
        selectedCount={selectedCount}
        dataObjectGroupCount={previewGroups.length}
        groupingStrategy={groupingStrategy}
        sourceImportOptions={sourceImportOptions}
        sourceImportOptionValues={sourceImportOptionValues}
      />

      <SourceImportAttachmentPreview
        selectedTables={selectedTables}
        previewGroups={previewGroups}
      />

      <SourceImportSelectionBasket selectedTables={selectedTables} onRemoveTable={onRemoveTable} />
    </div>
  );
}

type SourceImportReviewSummaryCardProps = Readonly<{
  selectedConnectionName: string;
  selectedCount: number;
  dataObjectGroupCount: number;
  groupingStrategy: 'schema' | 'database' | 'custom';
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
}>;

export function SourceImportReviewSummaryCard({
  selectedConnectionName,
  selectedCount,
  dataObjectGroupCount,
  groupingStrategy,
  sourceImportOptions,
  sourceImportOptionValues,
}: SourceImportReviewSummaryCardProps): JSX.Element {
  return (
    <Card className={sourceImportReviewViewClassNames.card}>
      <div className={sourceImportReviewViewClassNames.summary}>
        <SourceImportReviewSummaryRow
          label={copy.review.connectionLabel}
          value={selectedConnectionName}
        />
        <Separator />
        <SourceImportReviewSummaryRow
          label={copy.review.tablesSelectedLabel}
          value={String(selectedCount)}
        />
        <SourceImportReviewSummaryRow
          label={copy.review.dataObjectGroupsLabel}
          value={String(dataObjectGroupCount)}
        />
        <div className={sourceImportReviewViewClassNames.summaryRow}>
          <span className={sourceImportReviewViewClassNames.summaryLabel}>
            {copy.review.groupingStrategyLabel}
          </span>
          <Badge variant="outline">{groupingStrategy}</Badge>
        </div>
        <Separator />
        {sourceImportOptions.map((option) => {
          const enabled = sourceImportOptionValues[option.id];
          return (
            <div key={option.id} className={sourceImportReviewViewClassNames.optionRow}>
              <span className={sourceImportReviewViewClassNames.summaryLabel}>
                {resolveString(option.label)}:
              </span>
              <Badge variant={enabled ? 'default' : 'secondary'}>
                {enabled ? copy.review.enabledLabel : copy.review.disabledLabel}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SourceImportReviewSummaryRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className={sourceImportReviewViewClassNames.summaryRow}>
      <span className={sourceImportReviewViewClassNames.summaryLabel}>{label}</span>
      <span className={sourceImportReviewViewClassNames.summaryValue}>{value}</span>
    </div>
  );
}

type SourceImportAttachmentPreviewProps = Readonly<{
  selectedTables: readonly SourceImportTableViewModel[];
  previewGroups: ReadonlyArray<readonly [string, readonly TableInfo[]]>;
}>;

export function SourceImportAttachmentPreview({
  selectedTables,
  previewGroups,
}: SourceImportAttachmentPreviewProps): JSX.Element {
  return (
    <Card className={sourceImportReviewViewClassNames.card}>
      <h4 className={sourceImportReviewViewClassNames.previewTitle}>{copy.review.previewTitle}</h4>
      <div className={sourceImportReviewViewClassNames.destinationPosture}>
        {copy.review.destinationPosture}
      </div>
      <ScrollArea className={sourceImportReviewViewClassNames.previewScroll}>
        <div className={sourceImportReviewViewClassNames.previewList}>
          {previewGroups.map(([key, groupTables]) => (
            <div key={key} className={sourceImportReviewViewClassNames.group}>
              <div className={sourceImportReviewViewClassNames.groupHeader}>
                <code className={sourceImportReviewViewClassNames.groupCode}>
                  {copy.review.dataObjectGroupPrefix}: {key.toLowerCase()}
                </code>
                <Badge variant="secondary" className="text-xs">
                  {formatReviewTableCount(groupTables.length)}
                </Badge>
              </div>
              <div className={sourceImportReviewViewClassNames.tableList}>
                {groupTables.slice(0, 3).map((table) => (
                  <SourceImportReviewSourceTableRow
                    key={`${table.database}.${table.schema}.${table.table}`}
                    table={table}
                  />
                ))}
                {groupTables.length > 3 ? (
                  <div>
                    {copy.review.moreTablesPrefix} {groupTables.length - 3}{' '}
                    {copy.review.moreTablesSuffix}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {previewGroups.length === 0
            ? selectedTables.map((table) => (
                <div
                  key={table.canonicalName}
                  className={sourceImportReviewViewClassNames.selectedTable}
                >
                  <span className={sourceImportReviewViewClassNames.tableName}>
                    {table.canonicalName}
                  </span>
                  <span className={sourceImportReviewViewClassNames.tableMeta}>
                    {table.columnCountLabel}
                  </span>
                </div>
              ))
            : null}
        </div>
      </ScrollArea>
    </Card>
  );
}

function SourceImportReviewSourceTableRow({ table }: Readonly<{ table: TableInfo }>): JSX.Element {
  const tableViewModel = buildSourceImportTableViewModel(
    table,
    0,
    copy.catalog,
    sourceImportCatalogNumberFormatter
  );

  return (
    <div className={sourceImportReviewViewClassNames.tableRow}>
      <span className={sourceImportReviewViewClassNames.tableName}>
        {tableViewModel.canonicalName}
      </span>
      <span className={sourceImportReviewViewClassNames.tableMeta}>
        {tableViewModel.columnCountLabel}
      </span>
    </div>
  );
}

function formatReviewTableCount(tableCount: number): string {
  const suffix = tableCount === 1 ? copy.catalog.tableSingular : copy.catalog.tablePlural;
  return `${tableCount} ${suffix}`;
}
