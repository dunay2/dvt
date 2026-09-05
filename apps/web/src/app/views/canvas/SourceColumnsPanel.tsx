/** Owned concern: render the Source Columns A-v2 schema scanner from existing read-model facts. */
import { Check, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { cn } from '../../components/ui/utils';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  projectSourceColumns,
  type SourceColumnBadge,
  type SourceColumnPresentation,
  type SourceColumnTypeFamily,
} from './sourceColumnPresentation';

type ColumnFilter = 'all' | 'keyed' | 'not-null' | 'nullable';
type SourceColumnsCopy = (typeof COPY)['en'] | (typeof COPY)['es'];

const COPY = {
  en: {
    search: 'Search columns…',
    filter: 'Filter columns',
    all: 'All',
    keyed: 'Keyed',
    notNull: 'Not null',
    nullable: 'Nullable',
    noColumns: 'No columns match the current search and filter.',
    selected: 'Selected',
    nullability: 'Nullability',
    keySemantics: 'Key semantics',
    primaryKey: 'Primary key',
    foreignKey: 'Foreign key',
    uniqueKey: 'Unique key',
    indexed: 'Indexed',
    references: 'References',
    uniqueKeys: 'Unique keys',
    indexes: 'Indexes',
    defaultValue: 'Default',
    databaseComment: 'Database comment',
    unknown: 'Unknown',
    notNullValue: 'Not null',
    nullableValue: 'Nullable',
    none: '—',
  },
  es: {
    search: 'Buscar columnas…',
    filter: 'Filtrar columnas',
    all: 'Todas',
    keyed: 'Con clave/índice',
    notNull: 'No nulas',
    nullable: 'Anulables',
    noColumns: 'Ninguna columna coincide con la búsqueda y el filtro.',
    selected: 'Seleccionada',
    nullability: 'Nulabilidad',
    keySemantics: 'Semántica de clave',
    primaryKey: 'Clave primaria',
    foreignKey: 'Clave foránea',
    uniqueKey: 'Clave única',
    indexed: 'Indexada',
    references: 'Referencias',
    uniqueKeys: 'Claves únicas',
    indexes: 'Índices',
    defaultValue: 'Valor por defecto',
    databaseComment: 'Comentario de base de datos',
    unknown: 'Desconocida',
    notNullValue: 'No nula',
    nullableValue: 'Anulable',
    none: '—',
  },
} as const;

const TYPE_TOKEN: Record<SourceColumnTypeFamily, string> = {
  text: 'T',
  number: '#',
  boolean: 'B',
  structured: '{}',
  uuid: 'U',
  datetime: 'DT',
  network: 'IP',
  generic: '•',
};

const TYPE_TOKEN_CLASS: Record<SourceColumnTypeFamily, string> = {
  text: 'border-blue-500/30 bg-blue-500/15 text-blue-200',
  number: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
  boolean: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200',
  structured: 'border-violet-500/30 bg-violet-500/15 text-violet-200',
  uuid: 'border-teal-500/30 bg-teal-500/15 text-teal-200',
  datetime: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
  network: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
  generic: 'border-slate-600 bg-slate-800 text-slate-300',
};

function isKeyed(column: SourceColumnPresentation): boolean {
  return column.badges.some((badge) => ['PK', 'FK', 'UK', 'IDX'].includes(badge));
}

function matchesFilter(column: SourceColumnPresentation, filter: ColumnFilter): boolean {
  if (filter === 'keyed') return isKeyed(column);
  if (filter === 'not-null') return column.nullability === 'not-null';
  if (filter === 'nullable') return column.nullability === 'nullable';
  return true;
}

function badgeClass(badge: SourceColumnBadge): string {
  if (badge === 'PK') return 'border-green-500/30 bg-green-500/15 text-green-300';
  if (badge === 'FK') return 'border-sky-500/30 bg-sky-500/15 text-sky-300';
  if (badge === 'UK') return 'border-violet-500/30 bg-violet-500/15 text-violet-300';
  if (badge === 'IDX') return 'border-amber-500/30 bg-amber-500/15 text-amber-300';
  return 'border-slate-600 bg-slate-700/60 text-slate-300';
}

function nullabilityLabel(column: SourceColumnPresentation, copy: SourceColumnsCopy): string {
  if (column.nullability === 'not-null') return copy.notNullValue;
  if (column.nullability === 'nullable') return copy.nullableValue;
  return copy.unknown;
}

function keySemantics(
  column: SourceColumnPresentation,
  copy: SourceColumnsCopy
): readonly string[] {
  const meanings: string[] = [];
  if (column.badges.includes('PK')) meanings.push(copy.primaryKey);
  if (column.badges.includes('FK')) meanings.push(copy.foreignKey);
  if (column.badges.includes('UK')) meanings.push(copy.uniqueKey);
  if (column.badges.includes('IDX')) meanings.push(copy.indexed);
  return meanings;
}

function DetailFact({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): JSX.Element {
  return (
    <div className="contents">
      <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
      <dd className="min-w-0 break-words text-(--text-primary)">{children}</dd>
    </div>
  );
}

export function SourceColumnsPanel({
  readModel,
}: Readonly<{ readModel: NodePropertiesReadModel }>): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = applicationLanguage.trim().toLowerCase().startsWith('es') ? COPY.es : COPY.en;
  const columns = useMemo(() => projectSourceColumns(readModel), [readModel]);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<ColumnFilter>('all');
  const [selectedColumnId, setSelectedColumnId] = useState(columns[0]?.id ?? '');
  const normalizedSearch = searchText.trim().toLowerCase();
  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (column) =>
          matchesFilter(column, filter) &&
          (normalizedSearch.length === 0 || column.name.toLowerCase().includes(normalizedSearch))
      ),
    [columns, filter, normalizedSearch]
  );
  const selectedColumn =
    columns.find((column) => column.id === selectedColumnId) ?? visibleColumns[0] ?? columns[0];

  useEffect(() => {
    if (visibleColumns.length === 0) return;
    if (!visibleColumns.some((column) => column.id === selectedColumnId)) {
      setSelectedColumnId(visibleColumns[0]!.id);
    }
  }, [selectedColumnId, visibleColumns]);

  return (
    <section
      data-slot="canvas-source-columns"
      className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex items-center gap-2 border-b border-(--border-subtle) p-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)"
          />
          <Input
            type="search"
            value={searchText}
            aria-label={copy.search}
            placeholder={copy.search}
            className="pl-8"
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <label className="shrink-0">
          <span className="sr-only">{copy.filter}</span>
          <select
            aria-label={copy.filter}
            value={filter}
            className={cn(inspectorVisualClasses.inspectorSelectInput, 'w-36')}
            onChange={(event) => setFilter(event.currentTarget.value as ColumnFilter)}
          >
            <option value="all">{copy.all}</option>
            <option value="keyed">{copy.keyed}</option>
            <option value="not-null">{copy.notNull}</option>
            <option value="nullable">{copy.nullable}</option>
          </select>
        </label>
      </div>

      <div className="grid min-h-[420px] grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] divide-x divide-(--border-subtle)">
        <div data-slot="canvas-source-columns-list" className="min-w-0 space-y-1 p-3">
          {visibleColumns.length === 0 ? (
            <p className={cn('p-3', inspectorVisualClasses.inspectorBody)}>{copy.noColumns}</p>
          ) : (
            visibleColumns.map((column) => {
              const selected = column.id === selectedColumn?.id;
              return (
                <button
                  key={column.id}
                  type="button"
                  aria-pressed={selected}
                  data-slot="canvas-source-column-row"
                  data-column-id={column.id}
                  data-selected={selected ? 'true' : 'false'}
                  title={`${column.name}: ${column.physicalType}`}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
                    selected
                      ? 'border-(--focus-ring) bg-(--surface-selected)'
                      : 'border-transparent bg-(--surface-elevated) hover:border-(--border-default) hover:bg-(--surface-hover)'
                  )}
                  onClick={() => setSelectedColumnId(column.id)}
                >
                  <span
                    data-slot="canvas-source-column-type-token"
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded border font-mono text-[9px] font-semibold',
                      TYPE_TOKEN_CLASS[column.typeFamily]
                    )}
                    aria-label={column.physicalType}
                  >
                    {TYPE_TOKEN[column.typeFamily]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-(--text-primary)">
                    {column.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {column.badges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="outline"
                        className={cn('h-5 px-1.5 py-0 text-[9px]', badgeClass(badge))}
                      >
                        {badge}
                      </Badge>
                    ))}
                    {selected ? (
                      <Check
                        data-slot="canvas-source-column-selected-marker"
                        className="size-3.5 text-(--focus-ring)"
                        aria-label={copy.selected}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div data-slot="canvas-source-column-detail" className="min-w-0 p-5">
          {selectedColumn == null ? (
            <p className={inspectorVisualClasses.inspectorBody}>{copy.noColumns}</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-(--text-primary)">
                    {selectedColumn.name}
                  </h3>
                  <p className="mt-1 break-all font-mono text-xs text-(--status-readonly)">
                    {selectedColumn.physicalType}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {selectedColumn.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="outline"
                      className={cn('h-5 px-1.5 py-0 text-[9px]', badgeClass(badge))}
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              <dl className="grid grid-cols-[minmax(100px,0.34fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-xs">
                <DetailFact label={copy.nullability}>
                  {nullabilityLabel(selectedColumn, copy)}
                </DetailFact>
                {keySemantics(selectedColumn, copy).length > 0 ? (
                  <DetailFact label={copy.keySemantics}>
                    {keySemantics(selectedColumn, copy).join(' · ')}
                  </DetailFact>
                ) : null}
                {selectedColumn.foreignKeyTargets.length > 0 ? (
                  <DetailFact label={copy.references}>
                    {selectedColumn.foreignKeyTargets.join(', ')}
                  </DetailFact>
                ) : null}
                {selectedColumn.uniqueKeyNames.length > 0 ? (
                  <DetailFact label={copy.uniqueKeys}>
                    {selectedColumn.uniqueKeyNames.join(', ')}
                  </DetailFact>
                ) : null}
                {selectedColumn.indexNames.length > 0 ? (
                  <DetailFact label={copy.indexes}>{selectedColumn.indexNames.join(', ')}</DetailFact>
                ) : null}
                {selectedColumn.defaultValue ? (
                  <DetailFact label={copy.defaultValue}>
                    <code>{selectedColumn.defaultValue}</code>
                  </DetailFact>
                ) : null}
              </dl>

              <div className="space-y-2 border-t border-(--border-subtle) pt-4">
                <h4 className="text-xs font-medium text-(--text-primary)">{copy.databaseComment}</h4>
                <p className={inspectorVisualClasses.inspectorBody}>
                  {selectedColumn.databaseComment ?? copy.none}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
