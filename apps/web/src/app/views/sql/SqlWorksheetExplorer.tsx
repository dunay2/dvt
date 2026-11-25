/** Browse actual project definitions and protected database catalogues for SQL insertion. */
import { useMemo, useState, type DragEvent } from 'react';
import type { SourceObject } from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import { CanvasExplorerList } from '../canvas/explorer/CanvasExplorerList';
import { CanvasWarehouseConnections } from '../canvas/explorer/CanvasWarehouseConnections';
import { SQL_WORKSHEET_REFERENCE_MIME, type SqlWorksheetDragReference } from './sqlWorksheet.types';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import type { useSqlWorksheetCatalogue } from './useSqlWorksheetCatalogue';
import styles from './SqlWorksheet.module.css';
import { hasPublishedCanvasExplorerDefinition } from '../canvas/explorer/canvasExplorerItems';

type Catalogue = ReturnType<typeof useSqlWorksheetCatalogue>;
type Props = Readonly<{
  catalogue: Catalogue;
  scopeKey: string;
  enabled: boolean;
  busy: boolean;
  onReference: (reference: SqlWorksheetDragReference) => void;
  copy: SqlWorksheetCopy;
}>;

function writeReference(
  event: DragEvent<HTMLButtonElement>,
  reference: SqlWorksheetDragReference
): void {
  event.dataTransfer.setData(SQL_WORKSHEET_REFERENCE_MIME, JSON.stringify(reference));
  event.dataTransfer.effectAllowed = 'copy';
}

function SqlWorksheetSchemaPicker({
  catalogue,
  enabled,
  copy,
}: Pick<Props, 'catalogue' | 'enabled' | 'copy'>): JSX.Element {
  const { schemas, schemaItems } = catalogue;
  return (
    <>
      <label className={styles.field}>
        <span>{copy.schema}</span>
        <select
          className={styles.select}
          disabled={!enabled || schemas.isPending}
          value={
            catalogue.schema == null
              ? ''
              : JSON.stringify([catalogue.schema.catalog, catalogue.schema.schema])
          }
          onChange={(event) => {
            const selected = schemaItems.find(
              (item) => JSON.stringify([item.catalog, item.schema]) === event.target.value
            );
            if (selected != null) catalogue.chooseSchema(selected);
          }}
        >
          <option value="">{copy.chooseSchema}</option>
          {schemaItems.map((item) => (
            <option
              key={JSON.stringify([item.catalog, item.schema])}
              value={JSON.stringify([item.catalog, item.schema])}
            >
              {item.schema} ({item.objectCount})
            </option>
          ))}
        </select>
      </label>
      {schemas.hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={schemas.isFetching}
          onClick={() => {
            void schemas.fetchNextPage();
          }}
        >
          {copy.loadMore}
        </Button>
      ) : null}
    </>
  );
}

function SqlWorksheetCatalogueStatus({
  catalogue,
  enabled,
  copy,
}: Pick<Props, 'catalogue' | 'enabled' | 'copy'>): JSX.Element {
  const { schemas, objects } = catalogue;
  const queries = [schemas, objects];
  const error = queries.some((query) => query.isError);
  const loading = enabled && queries.some((query) => query.isFetching);
  const empty = objects.isSuccess && catalogue.objectItems.length === 0;
  function retry(): void {
    void schemas.refetch();
    if (objects.isEnabled) void objects.refetch();
  }
  return (
    <>
      {error ? (
        <p className={styles.error} role="alert">
          {copy.catalogError}
          <Button size="sm" variant="ghost" onClick={retry}>
            {copy.retry}
          </Button>
        </p>
      ) : null}
      {loading ? (
        <p className={styles.message} role="status">
          {copy.loading}
        </p>
      ) : null}
      {empty ? <p className={styles.message}>{copy.noObjects}</p> : null}
    </>
  );
}

function SqlWorksheetObjectRows({
  catalogue,
  scopeKey,
  enabled,
  busy,
  onReference,
  copy,
}: Props): JSX.Element {
  const insert = (object: SourceObject) =>
    onReference({ scopeKey, kind: 'table', id: object.objectId });
  return (
    <ul className={styles.objectList}>
      {catalogue.objectItems.map((object) => {
        const available = enabled && !busy && object.locator.kind === 'relation';
        return (
          <li key={object.objectId}>
            <button
              className={styles.objectButton}
              type="button"
              disabled={!available}
              draggable={available}
              onDragStart={(event) =>
                writeReference(event, { scopeKey, kind: 'table', id: object.objectId })
              }
              onClick={() => insert(object)}
              title={copy.insert}
              data-object-id={object.objectId}
            >
              <span>
                {object.locator.kind === 'relation'
                  ? `${object.locator.schema}.${object.locator.name}`
                  : object.displayName}
              </span>
              <small>
                {object.locator.kind === 'relation'
                  ? object.locator.relationType
                  : object.locator.kind}
              </small>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SqlWorksheetObjects(props: Props): JSX.Element {
  const [search, setSearch] = useState('');
  const { catalogue, enabled, copy } = props;
  const { objects } = catalogue;
  return (
    <section className={styles.objects} aria-label={copy.objects}>
      <h2 className={styles.catalogueHeading}>{copy.objects}</h2>
      <SqlWorksheetSchemaPicker catalogue={catalogue} enabled={enabled} copy={copy} />
      <form
        className={styles.objectSearch}
        onSubmit={(event) => {
          event.preventDefault();
          catalogue.searchObjects(search);
        }}
      >
        <input
          className={styles.search}
          aria-label={copy.searchObjects}
          value={search}
          disabled={!enabled}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="outline" size="sm" disabled={!enabled} type="submit">
          {copy.search}
        </Button>
      </form>
      <SqlWorksheetCatalogueStatus catalogue={catalogue} enabled={enabled} copy={copy} />
      <SqlWorksheetObjectRows {...props} />
      {objects.hasNextPage ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={objects.isFetching}
          onClick={() => {
            void objects.fetchNextPage();
          }}
        >
          {copy.loadMore}
        </Button>
      ) : null}
    </section>
  );
}

export function SqlWorksheetExplorer(props: Props): JSX.Element {
  const { catalogue, scopeKey, enabled, busy, onReference, copy } = props;
  const items = useMemo(() => {
    const published = new Set(
      catalogue.nodes.filter(hasPublishedCanvasExplorerDefinition).map((node) => node.id)
    );
    return catalogue.items.map((item) =>
      published.has(item.id)
        ? item
        : {
            ...item,
            disabled: true,
            draggable: false,
            description:
              item.definitionIdentity == null ? copy.unpublished : copy.unavailableFileModel,
          }
    );
  }, [catalogue.items, catalogue.nodes, copy.unpublished, copy.unavailableFileModel]);
  return (
    <div className={styles.catalogue}>
      {!enabled ? <p className={styles.message}>{copy.selectConnection}</p> : null}
      <CanvasExplorerList
        items={items}
        disabled={!enabled || busy}
        pending={catalogue.schemas.isFetching}
        onSelect={(id) => onReference({ scopeKey, kind: 'node', id })}
        onDragStart={(id, event) => writeReference(event, { scopeKey, kind: 'node', id })}
        connections={<CanvasWarehouseConnections />}
      />
      <SqlWorksheetObjects {...props} />
    </div>
  );
}
