/** Owned concern: render selected source metadata without owning wizard flow state. */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { MetricEvidenceHotspot } from '../metrics/MetricEvidenceHotspot';
import { useSourceImportLocalization } from './copy';
import { SourceImportConstraintMarkers } from './SourceImportConstraintMarkers';
import { buildSourceImportObjectViewModel } from './sourceImportCatalogModel';
import {
  resolveSourceImportContextualName,
  resolveSourceImportSharedCatalog,
} from './sourceImportMetadataModel';
import type { SelectableSourceObject } from './types';

type SourceImportObjectsMetadataProps = Readonly<{
  sourceObjects: readonly SelectableSourceObject[];
  activeSourceObjectKey: string | null;
  scope: 'active' | 'selected';
}>;

import styles from './SourceImportMetadata.module.css';
export const sourceImportSelectedMetadataClassNames = styles;

export function SourceImportObjectsMetadata({
  sourceObjects,
  activeSourceObjectKey,
  scope,
}: SourceImportObjectsMetadataProps): JSX.Element {
  const { copy, numberFormatter } = useSourceImportLocalization();
  const viewModels = sourceObjects.map((sourceObject, index) => ({
    sourceObject,
    viewModel: buildSourceImportObjectViewModel(sourceObject, index, copy.catalog, numberFormatter),
  }));
  const sharedCatalog =
    scope === 'selected' ? resolveSourceImportSharedCatalog(sourceObjects) : null;
  const activeKey =
    viewModels.find(({ viewModel }) => viewModel.identityKey === activeSourceObjectKey)?.viewModel
      .identityKey ?? viewModels[0]?.viewModel.identityKey;

  return (
    <section className={sourceImportSelectedMetadataClassNames.root}>
      <header className={sourceImportSelectedMetadataClassNames.heading}>
        <h3 className={sourceImportSelectedMetadataClassNames.title}>
          {scope === 'selected' ? copy.metadata.title : copy.metadata.activeTitle}
        </h3>
        <p className={sourceImportSelectedMetadataClassNames.description}>
          {scope === 'selected' ? copy.metadata.description : copy.metadata.activeDescription}
        </p>
      </header>

      {sharedCatalog ? (
        <div
          className={sourceImportSelectedMetadataClassNames.sharedCatalog}
          data-source-import-shared-catalog={sharedCatalog}
        >
          <span>{copy.metadata.sharedDatabaseLabel}</span>
          <Badge variant="outline">{sharedCatalog}</Badge>
        </div>
      ) : null}

      {viewModels.length > 0 ? (
        <Accordion
          type="multiple"
          value={scope === 'active' && activeKey ? [activeKey] : undefined}
          defaultValue={scope === 'selected' && activeKey ? [activeKey] : []}
          className={sourceImportSelectedMetadataClassNames.list}
        >
          {viewModels.map(({ sourceObject, viewModel }) => (
            <AccordionItem
              key={viewModel.identityKey}
              value={viewModel.identityKey}
              className={sourceImportSelectedMetadataClassNames.item}
              data-source-import-object-metadata={viewModel.identityKey}
            >
              <AccordionTrigger
                className={sourceImportSelectedMetadataClassNames.trigger}
                aria-label={viewModel.inspectionAccessibilityLabel}
                data-source-import-object-metadata-trigger={viewModel.identityKey}
              >
                <div className={sourceImportSelectedMetadataClassNames.triggerContent}>
                  <div className={sourceImportSelectedMetadataClassNames.identity}>
                    <span className={sourceImportSelectedMetadataClassNames.objectName}>
                      {resolveSourceImportContextualName(sourceObject, sharedCatalog)}
                    </span>
                    <Badge variant="outline">{viewModel.kindLabel}</Badge>
                  </div>
                  <div className={sourceImportSelectedMetadataClassNames.metrics}>
                    <MetricEvidenceHotspot
                      detail={viewModel.rowCountDetail}
                      focusable={false}
                      tone={viewModel.rowCountTone}
                      value={viewModel.rowCountLabel}
                    />
                    <MetricEvidenceHotspot
                      detail={viewModel.byteSizeDetail}
                      focusable={false}
                      tone={viewModel.byteSizeTone}
                      value={viewModel.byteSizeLabel}
                    />
                    <span>{viewModel.columnCountLabel}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className={sourceImportSelectedMetadataClassNames.content}>
                <SourceObjectMetadataBody viewModel={viewModel} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div
          className={sourceImportSelectedMetadataClassNames.notice}
          data-source-import-metadata-empty
        >
          {copy.metadata.noObjectSelected}
        </div>
      )}
    </section>
  );
}

function SourceObjectMetadataBody({
  viewModel,
}: Readonly<{
  viewModel: ReturnType<typeof buildSourceImportObjectViewModel>;
}>): JSX.Element {
  const { copy } = useSourceImportLocalization();

  const importability = viewModel.importabilityLabel ? (
    <p
      className={sourceImportSelectedMetadataClassNames.importability}
      data-source-import-importability
    >
      {viewModel.importabilityLabel}
    </p>
  ) : null;

  if (viewModel.columns.length === 0) {
    return (
      <div className={sourceImportSelectedMetadataClassNames.root}>
        {importability}
        <div className={sourceImportSelectedMetadataClassNames.notice}>
          {copy.metadata.columnsUnavailable}
        </div>
      </div>
    );
  }

  return (
    <div className={sourceImportSelectedMetadataClassNames.root}>
      {importability}
      <ScrollArea className={styles.columnScroll}>
        <div className={sourceImportSelectedMetadataClassNames.columnList}>
          {viewModel.columns.map((column) => (
            <div
              key={`${viewModel.identityKey}.${column.name}`}
              className={sourceImportSelectedMetadataClassNames.columnRow}
              data-source-import-metadata-column={`${viewModel.identityKey}.${column.name}`}
            >
              <div className={sourceImportSelectedMetadataClassNames.columnIdentity}>
                <div className={sourceImportSelectedMetadataClassNames.columnName}>
                  {column.name}
                </div>
                <div className={sourceImportSelectedMetadataClassNames.constraintList}>
                  <SourceImportConstraintMarkers markers={column.constraintMarkers} />
                </div>
              </div>
              <span className={sourceImportSelectedMetadataClassNames.columnType}>
                {column.type}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
