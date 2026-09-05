/** Owned concern: render imported Source columns as a fast schema scanner with focused detail. */
import {
  SourceObjectColumnSchema,
  SourceObjectConstraintSchema,
  resolveSourceObjectColumnConstraintSemantics,
  type SourceObjectColumn,
  type SourceObjectConstraint,
} from '@dvt/contracts';
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';

const COPY = {
  en: {
    search: 'Search columns...',
    columns: 'columns',
    noColumns: 'No columns are available for this Source.',
    noMatches: 'No columns match the current search.',
    exactType: 'Physical type',
    nullability: 'Nullability',
    constraints: 'Constraints',
    notNull: 'Not null',
    nullable: 'Nullable',
    primaryKey: 'Primary key',
    unique: 'Unique',
    none: '—',
    listLabel: 'Source columns',
    textFamily: 'Text',
    structuredFamily: 'Structured',
    uuidFamily: 'UUID',
    dateTimeFamily: 'Date/time',
    networkFamily: 'Network',
    numericFamily: 'Numeric',
    booleanFamily: 'Boolean',
    binaryFamily: 'Binary',
    otherFamily: 'Other',
  },
  es: {
    search: 'Buscar columnas...',
    columns: 'columnas',
    noColumns: 'No hay columnas disponibles para este origen.',
    noMatches: 'Ninguna columna coincide con la búsqueda.',
    exactType: 'Tipo físico',
    nullability: 'Nulabilidad',
    constraints: 'Restricciones',
    notNull: 'No nulo',
    nullable: 'Nullable',
    primaryKey: 'Clave primaria',
    unique: 'Única',
    none: '—',
    listLabel: 'Columnas del origen',
    textFamily: 'Texto',
    structuredFamily: 'Estructurado',
    uuidFamily: 'UUID',
    dateTimeFamily: 'Fecha/hora',
    networkFamily: 'Red',
    numericFamily: 'Numérico',
    booleanFamily: 'Booleano',
    binaryFamily: 'Binario',
    otherFamily: 'Otro',
  },
} as const;

type SourceColumnFacts = Readonly<{
  column: SourceObjectColumn;
  primaryKey: boolean;
  independentlyUnique: boolean;
}>;

type TypeCue = Readonly<{
  token: string;
  labelKey:
    | 'textFamily'
    | 'structuredFamily'
    | 'uuidFamily'
    | 'dateTimeFamily'
    | 'networkFamily'
    | 'numericFamily'
    | 'booleanFamily'
    | 'binaryFamily'
    | 'otherFamily';
}>;

function readSourceColumnFacts(node: CanonicalNode): readonly SourceColumnFacts[] {
  const metadata = node.metadata ?? {};
  const parsedColumns = SourceObjectColumnSchema.array().safeParse(metadata.columns);
  if (!parsedColumns.success) return [];

  const parsedConstraints = SourceObjectConstraintSchema.array().safeParse(metadata.constraints);
  const constraints: readonly SourceObjectConstraint[] = parsedConstraints.success
    ? parsedConstraints.data
    : [];

  return parsedColumns.data.map((column) => ({
    column,
    ...resolveSourceObjectColumnConstraintSemantics({ constraints }, column.name),
  }));
}

function resolveTypeCue(type: string): TypeCue {
  const normalized = type.trim().toLowerCase();
  if (/(^|\W)(char|varchar|text|string)/.test(normalized)) {
    return { token: 'T', labelKey: 'textFamily' };
  }
  if (/(json|jsonb|array|struct|map)/.test(normalized)) {
    return { token: '{}', labelKey: 'structuredFamily' };
  }
  if (/uuid/.test(normalized)) {
    return { token: 'U', labelKey: 'uuidFamily' };
  }
  if (/(date|time|timestamp|interval)/.test(normalized)) {
    return { token: 'DT', labelKey: 'dateTimeFamily' };
  }
  if (/(inet|cidr|macaddr)/.test(normalized)) {
    return { token: 'IP', labelKey: 'networkFamily' };
  }
  if (/(int|numeric|decimal|number|real|double|float|serial)/.test(normalized)) {
    return { token: '#', labelKey: 'numericFamily' };
  }
  if (/(bool|boolean)/.test(normalized)) {
    return { token: 'B', labelKey: 'booleanFamily' };
  }
  if (/(bytea|binary|blob)/.test(normalized)) {
    return { token: '01', labelKey: 'binaryFamily' };
  }
  return { token: '·', labelKey: 'otherFamily' };
}

function ConstraintBadges({ facts }: Readonly<{ facts: SourceColumnFacts }>): JSX.Element {
  const showUnique = facts.independentlyUnique && !facts.primaryKey;
  const showNotNull = !facts.column.nullable && !facts.primaryKey;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      {facts.primaryKey ? (
        <Badge
          data-slot="source-column-badge-pk"
          variant="secondary"
          className="border border-(--status-success) bg-transparent px-1.5 py-0 text-[10px] text-(--status-success)"
        >
          PK
        </Badge>
      ) : null}
      {showUnique ? (
        <Badge
          data-slot="source-column-badge-uk"
          variant="secondary"
          className="border border-(--status-info) bg-transparent px-1.5 py-0 text-[10px] text-(--status-info)"
        >
          UK
        </Badge>
      ) : null}
      {showNotNull ? (
        <Badge
          data-slot="source-column-badge-nn"
          variant="secondary"
          className="px-1.5 py-0 text-[10px]"
        >
          NN
        </Badge>
      ) : null}
    </span>
  );
}

function TypeFamilyCue({
  type,
  labels,
}: Readonly<{
  type: string;
  labels: (typeof COPY)['en'] | (typeof COPY)['es'];
}>): JSX.Element {
  const cue = resolveTypeCue(type);
  return (
    <span
      data-slot="source-column-type-cue"
      title={`${labels[cue.labelKey]} · ${type}`}
      aria-label={`${labels[cue.labelKey]}: ${type}`}
      className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-(--border-subtle) bg-(--surface-selected) px-1 font-mono text-[10px] font-semibold text-(--status-info)"
    >
      {cue.token}
    </span>
  );
}

function DetailFact({ label, value }: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className="contents">
      <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
      <dd className="min-w-0 break-words text-(--text-primary)">{value}</dd>
    </div>
  );
}

function constraintText(
  facts: SourceColumnFacts,
  copy: (typeof COPY)['en'] | (typeof COPY)['es']
): string {
  if (facts.primaryKey) return copy.primaryKey;
  if (facts.independentlyUnique) return copy.unique;
  return copy.none;
}

export function SourceColumnsPanel({
  node,
  beforeBody,
  afterBody,
}: Readonly<{
  node: CanonicalNode;
  beforeBody?: ReactNode;
  afterBody?: ReactNode;
}>): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = applicationLanguage.trim().toLowerCase().startsWith('es') ? COPY.es : COPY.en;
  const [query, setQuery] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const facts = useMemo(() => readSourceColumnFacts(node), [node]);
  const filteredFacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery.length === 0
      ? facts
      : facts.filter(({ column }) => column.name.toLowerCase().includes(normalizedQuery));
  }, [facts, query]);
  const selectedFacts =
    filteredFacts.find(({ column }) => column.name === selectedName) ?? filteredFacts[0] ?? null;

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
    targetIndex: number
  ): void => {
    if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= filteredFacts.length) return;
    event.preventDefault();
    const nextName = filteredFacts[targetIndex]!.column.name;
    setSelectedName(nextName);
    rowRefs.current.get(nextName)?.focus();
  };

  return (
    <div data-slot="canvas-source-columns" className="space-y-3">
      {beforeBody}
      <div className="flex items-center gap-3">
        <Input
          data-slot="source-columns-search"
          aria-label={copy.search}
          placeholder={copy.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-[22rem]"
        />
        <span data-slot="source-columns-visible-count" className="ml-auto text-xs text-(--text-muted)">
          {filteredFacts.length} {copy.columns}
        </span>
      </div>

      <div className="grid min-h-[36rem] grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-panel)">
        <section className="min-w-0 border-r border-(--border-subtle) p-3">
          {facts.length === 0 ? (
            <p className={inspectorVisualClasses.inspectorSubtle}>{copy.noColumns}</p>
          ) : filteredFacts.length === 0 ? (
            <p className={inspectorVisualClasses.inspectorSubtle}>{copy.noMatches}</p>
          ) : (
            <ul role="listbox" aria-label={copy.listLabel} className="space-y-1">
              {filteredFacts.map((columnFacts, index) => {
                const selected = selectedFacts?.column.name === columnFacts.column.name;
                return (
                  <li key={columnFacts.column.name}>
                    <button
                      ref={(element) => {
                        if (element == null) rowRefs.current.delete(columnFacts.column.name);
                        else rowRefs.current.set(columnFacts.column.name, element);
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      data-slot="source-column-row"
                      data-column-name={columnFacts.column.name}
                      onClick={() => setSelectedName(columnFacts.column.name)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') moveSelection(event, index, index + 1);
                        else if (event.key === 'ArrowUp') moveSelection(event, index, index - 1);
                        else if (event.key === 'Home') moveSelection(event, index, 0);
                        else if (event.key === 'End') {
                          moveSelection(event, index, filteredFacts.length - 1);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
                        selected
                          ? 'border-(--focus-ring) bg-(--surface-selected) text-(--text-strong)'
                          : 'border-transparent bg-(--surface-elevated) text-(--text-primary) hover:bg-(--surface-selected)'
                      )}
                    >
                      <TypeFamilyCue type={columnFacts.column.type} labels={copy} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {columnFacts.column.name}
                      </span>
                      <ConstraintBadges facts={columnFacts} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section data-slot="source-column-detail" className="min-w-0 p-5">
          {selectedFacts == null ? (
            <p className={inspectorVisualClasses.inspectorSubtle}>
              {facts.length === 0 ? copy.noColumns : copy.noMatches}
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <TypeFamilyCue type={selectedFacts.column.type} labels={copy} />
                <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-(--text-strong)">
                  {selectedFacts.column.name}
                </h3>
                <ConstraintBadges facts={selectedFacts} />
              </div>

              <dl className="grid grid-cols-[minmax(7rem,0.34fr)_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
                <DetailFact label={copy.exactType} value={selectedFacts.column.type} />
                <DetailFact
                  label={copy.nullability}
                  value={selectedFacts.column.nullable ? copy.nullable : copy.notNull}
                />
                <DetailFact
                  label={copy.constraints}
                  value={constraintText(selectedFacts, copy)}
                />
              </dl>
            </div>
          )}
        </section>
      </div>
      {afterBody}
    </div>
  );
}
