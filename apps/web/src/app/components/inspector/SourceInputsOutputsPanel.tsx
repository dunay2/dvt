/** Owned concern: render imported Source Canvas relationships as grouped master/detail topology. */
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import type { NodePropertySection, NodePropertyTableRow } from './nodePropertiesReadModel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';

const COPY = {
  en: {
    canvasConnections: 'Canvas connections',
    total: 'total',
    inputs: 'Inputs',
    outputs: 'Outputs',
    noInputs: 'No upstream Canvas connections',
    noOutputs: 'No downstream Canvas connections',
    noConnections: 'No Canvas connections are recorded for this Source.',
    selectedInput: 'selected input',
    selectedOutput: 'selected output',
    currentSource: 'Current Source',
    connectedNode: 'Connected node',
    direction: 'Direction',
    incoming: 'Incoming',
    outgoing: 'Outgoing',
    from: 'From',
    to: 'To',
    relation: 'Relation',
    listLabel: 'Canvas relationships',
  },
  es: {
    canvasConnections: 'Conexiones del Canvas',
    total: 'total',
    inputs: 'Entradas',
    outputs: 'Salidas',
    noInputs: 'Sin conexiones de Canvas aguas arriba',
    noOutputs: 'Sin conexiones de Canvas aguas abajo',
    noConnections: 'No hay conexiones de Canvas registradas para este origen.',
    selectedInput: 'entrada seleccionada',
    selectedOutput: 'salida seleccionada',
    currentSource: 'Origen actual',
    connectedNode: 'Nodo conectado',
    direction: 'Dirección',
    incoming: 'Entrante',
    outgoing: 'Saliente',
    from: 'Desde',
    to: 'Hacia',
    relation: 'Relación',
    listLabel: 'Relaciones del Canvas',
  },
} as const;

type RelationshipDirection = 'input' | 'output';

type SourceRelationship = Readonly<{
  id: string;
  direction: RelationshipDirection;
  relatedNodeName: string;
  relation: string;
}>;

function readRelationship(row: NodePropertyTableRow): SourceRelationship | null {
  const direction: RelationshipDirection | null = row.id.startsWith('input:')
    ? 'input'
    : row.id.startsWith('output:')
      ? 'output'
      : null;
  const relatedNodeName = row.cells.node?.trim();
  if (direction == null || relatedNodeName == null || relatedNodeName.length === 0) return null;

  return {
    id: row.id,
    direction,
    relatedNodeName,
    relation: row.cells.relation?.trim() || '—',
  };
}

function readRelationships(section: NodePropertySection): readonly SourceRelationship[] {
  return section.tableRows.flatMap((row): readonly SourceRelationship[] => {
    const relationship = readRelationship(row);
    return relationship == null ? [] : [relationship];
  });
}

function DetailFact({ label, value }: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className="contents">
      <dt className={inspectorVisualClasses.inspectorLabel}>{label}</dt>
      <dd className="min-w-0 break-words text-(--text-primary)">{value}</dd>
    </div>
  );
}

function RelationshipRow({
  relationship,
  selected,
  tabIndex,
  setRef,
  onSelect,
  onKeyDown,
}: Readonly<{
  relationship: SourceRelationship;
  selected: boolean;
  tabIndex: number;
  setRef: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}>): JSX.Element {
  return (
    <button
      ref={setRef}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={tabIndex}
      data-slot="source-relationship-row"
      data-relationship-id={relationship.id}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--focus-ring)',
        selected
          ? 'border-(--focus-ring) bg-(--surface-selected) text-(--text-strong)'
          : 'border-transparent bg-(--surface-elevated) text-(--text-primary) hover:bg-(--surface-selected)'
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--surface-selected) font-mono text-xs text-(--status-info)"
      >
        {relationship.direction === 'input' ? '←' : '→'}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{relationship.relatedNodeName}</span>
      <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
        {relationship.relation}
      </Badge>
    </button>
  );
}

function TopologyNode({
  name,
  caption,
}: Readonly<{ name: string; caption: string }>): JSX.Element {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-(--border-default) bg-(--surface-selected) px-3 py-3">
      <p className="truncate text-sm font-semibold text-(--text-strong)">{name}</p>
      <p className="mt-1 text-[10px] text-(--text-muted)">{caption}</p>
    </div>
  );
}

export function SourceInputsOutputsPanel({
  node,
  section,
  beforeBody,
  afterBody,
}: Readonly<{
  node: CanonicalNode;
  section: NodePropertySection;
  beforeBody?: ReactNode;
  afterBody?: ReactNode;
}>): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = applicationLanguage.trim().toLowerCase().startsWith('es') ? COPY.es : COPY.en;
  const relationships = useMemo(() => readRelationships(section), [section]);
  const inputs = useMemo(
    () => relationships.filter((relationship) => relationship.direction === 'input'),
    [relationships]
  );
  const outputs = useMemo(
    () => relationships.filter((relationship) => relationship.direction === 'output'),
    [relationships]
  );
  const orderedRelationships = useMemo(() => [...inputs, ...outputs], [inputs, outputs]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const selected =
    orderedRelationships.find((relationship) => relationship.id === selectedId) ??
    orderedRelationships[0] ??
    null;

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
    targetIndex: number
  ): void => {
    if (
      targetIndex === currentIndex ||
      targetIndex < 0 ||
      targetIndex >= orderedRelationships.length
    ) {
      return;
    }
    event.preventDefault();
    const next = orderedRelationships[targetIndex]!;
    setSelectedId(next.id);
    rowRefs.current.get(next.id)?.focus();
  };

  const renderGroup = (
    label: string,
    emptyLabel: string,
    group: readonly SourceRelationship[]
  ): JSX.Element => (
    <div role="group" aria-label={`${label} ${group.length}`} className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
        {label} {group.length}
      </h4>
      {group.length === 0 ? (
        <p className={inspectorVisualClasses.inspectorSubtle}>{emptyLabel}</p>
      ) : (
        <div className="space-y-1">
          {group.map((relationship) => {
            const relationshipIndex = orderedRelationships.findIndex(
              (item) => item.id === relationship.id
            );
            const isSelected = selected?.id === relationship.id;
            return (
              <RelationshipRow
                key={relationship.id}
                relationship={relationship}
                selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                setRef={(element) => {
                  if (element == null) rowRefs.current.delete(relationship.id);
                  else rowRefs.current.set(relationship.id, element);
                }}
                onSelect={() => setSelectedId(relationship.id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') moveSelection(event, relationshipIndex, relationshipIndex + 1);
                  else if (event.key === 'ArrowUp') moveSelection(event, relationshipIndex, relationshipIndex - 1);
                  else if (event.key === 'Home') moveSelection(event, relationshipIndex, 0);
                  else if (event.key === 'End') {
                    moveSelection(event, relationshipIndex, orderedRelationships.length - 1);
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const fromName =
    selected == null
      ? ''
      : selected.direction === 'output'
        ? node.name
        : selected.relatedNodeName;
  const toName =
    selected == null
      ? ''
      : selected.direction === 'output'
        ? selected.relatedNodeName
        : node.name;

  return (
    <div data-slot="canvas-source-inputs-outputs" className="space-y-3">
      {beforeBody}
      <div className="grid min-h-[36rem] grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-panel)">
        <section className="min-w-0 border-r border-(--border-subtle) p-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-(--text-strong)">{copy.canvasConnections}</h3>
            <span className="text-xs text-(--text-muted)">
              {orderedRelationships.length} {copy.total}
            </span>
          </div>
          <div role="listbox" aria-label={copy.listLabel} className="space-y-5">
            {renderGroup(copy.inputs, copy.noInputs, inputs)}
            {renderGroup(copy.outputs, copy.noOutputs, outputs)}
          </div>
        </section>

        <section data-slot="source-relationship-detail" className="min-w-0 p-5">
          {selected == null ? (
            <p className={inspectorVisualClasses.inspectorSubtle}>{copy.noConnections}</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-(--text-strong)">
                  {selected.relatedNodeName}
                </h3>
                <span className="shrink-0 text-[10px] text-(--text-muted)">
                  {selected.direction === 'input' ? copy.selectedInput : copy.selectedOutput}
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-(--border-default) bg-(--surface-elevated) p-4">
                <TopologyNode
                  name={fromName}
                  caption={selected.direction === 'output' ? copy.currentSource : copy.connectedNode}
                />
                <span aria-hidden="true" className="shrink-0 text-lg text-(--status-info)">→</span>
                <TopologyNode
                  name={toName}
                  caption={selected.direction === 'output' ? copy.connectedNode : copy.currentSource}
                />
              </div>

              <dl className="grid grid-cols-[minmax(6rem,0.3fr)_minmax(0,1fr)] gap-x-4 gap-y-4 text-sm">
                <DetailFact
                  label={copy.direction}
                  value={selected.direction === 'input' ? copy.incoming : copy.outgoing}
                />
                <DetailFact label={copy.from} value={fromName} />
                <DetailFact label={copy.to} value={toName} />
                <DetailFact label={copy.relation} value={selected.relation} />
              </dl>
            </div>
          )}
        </section>
      </div>
      {afterBody}
    </div>
  );
}
