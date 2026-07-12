/** Owned concern: render selected-source review without owning wizard flow state. */
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { sourceImportWizardCopy as copy } from './copy';
import { SourceImportSelectionBasket } from './SourceImportSelectionBasket';
import type { SourceImportObjectViewModel } from './sourceImportCatalogModel';
import type { SourceImportReviewPreviewGroupViewModel } from './sourceImportReviewModel';
import type { SourceImportGroupingStrategy } from './types';

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
  registryPath: 'text-xs text-slate-300',
  groupCode: 'text-sm text-blue-400',
  objectList: 'space-y-1 text-xs text-slate-400',
  objectRow: 'flex min-w-0 items-center justify-between gap-2',
  objectName: 'truncate font-mono',
  objectMeta: 'flex shrink-0 flex-wrap justify-end gap-2 text-right',
  selectedObject:
    'flex min-w-0 items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1',
} as const;

type SourceImportReviewViewProps = Readonly<{
  selectedSourceObjects: readonly SourceImportObjectViewModel[];
  previewGroups: readonly SourceImportReviewPreviewGroupViewModel[];
  selectedCount: number;
  groupingStrategy: SourceImportGroupingStrategy;
  selectedConnectionName: string;
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onRemoveSourceObject: (sourceObjectIndex: number) => void;
}>;

export function SourceImportReviewView({
  selectedSourceObjects,
  previewGroups,
  selectedCount,
  groupingStrategy,
  selectedConnectionName,
  sourceImportOptions,
  sourceImportOptionValues,
  onRemoveSourceObject,
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
        selectedSourceObjects={selectedSourceObjects}
        previewGroups={previewGroups}
      />

      <SourceImportSelectionBasket
        selectedSourceObjects={selectedSourceObjects}
        onRemoveSourceObject={onRemoveSourceObject}
      />
    </div>
  );
}

type SourceImportReviewSummaryCardProps = Readonly<{
  selectedConnectionName: string;
  selectedCount: number;
  dataObjectGroupCount: number;
  groupingStrategy: SourceImportGroupingStrategy;
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
          label={copy.review.sourceObjectsSelectedLabel}
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
  selectedSourceObjects: readonly SourceImportObjectViewModel[];
  previewGroups: readonly SourceImportReviewPreviewGroupViewModel[];
}>;

export function SourceImportAttachmentPreview({
  selectedSourceObjects,
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
          {previewGroups.map((group) => (
            <div
              key={group.registryPath}
              className={sourceImportReviewViewClassNames.group}
              data-source-import-registry-path={group.registryPath}
            >
              <div className={sourceImportReviewViewClassNames.groupHeader}>
                <div>
                  <div className={sourceImportReviewViewClassNames.groupCode}>
                    {copy.review.dataObjectGroupPrefix}
                  </div>
                  <code className={sourceImportReviewViewClassNames.registryPath}>
                    {copy.review.registryFileLabel}: {group.registryPath}
                  </code>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {group.objectCountLabel}
                </Badge>
              </div>
              <div className={sourceImportReviewViewClassNames.objectList}>
                {group.sourceObjects.slice(0, 3).map((sourceObject) => (
                  <SourceImportReviewSourceObjectRow
                    key={sourceObject.identityKey}
                    sourceObject={sourceObject}
                  />
                ))}
                {group.sourceObjects.length > 3 ? (
                  <div>
                    {copy.review.moreSourceObjectsPrefix} {group.sourceObjects.length - 3}{' '}
                    {copy.review.moreSourceObjectsSuffix}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {previewGroups.length === 0
            ? selectedSourceObjects.map((sourceObject) => (
                <div
                  key={sourceObject.identityKey}
                  className={sourceImportReviewViewClassNames.selectedObject}
                >
                  <span className={sourceImportReviewViewClassNames.objectName}>
                    {sourceObject.canonicalName}
                  </span>
                  <span className={sourceImportReviewViewClassNames.objectMeta}>
                    {sourceObject.columnCountLabel}
                  </span>
                </div>
              ))
            : null}
        </div>
      </ScrollArea>
    </Card>
  );
}

function SourceImportReviewSourceObjectRow({
  sourceObject,
}: Readonly<{ sourceObject: SourceImportObjectViewModel }>): JSX.Element {
  return (
    <div
      className={sourceImportReviewViewClassNames.objectRow}
      data-source-import-review-object={sourceObject.identityKey}
    >
      <span className={sourceImportReviewViewClassNames.objectName}>
        {sourceObject.canonicalName}
      </span>
      <span className={sourceImportReviewViewClassNames.objectMeta}>
        <span>{sourceObject.rowCountLabel}</span>
        <span>{sourceObject.byteSizeLabel}</span>
        <span>{sourceObject.columnCountLabel}</span>
      </span>
    </div>
  );
}
