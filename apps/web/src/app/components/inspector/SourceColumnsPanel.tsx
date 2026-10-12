/** Owned concern: coordinate Source column inspection, focus and existing transfer/order gestures. */
import { Search, ListFilter } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';
import { writeGraphColumnTransfer } from '../../plugins/graph/graphColumnTransfer';
import { useCanvasInspectorListOrder } from './useCanvasInspectorListOrder';
import { useInspectorListReorder } from './useInspectorListReorder';
import {
  matchesSourceColumn,
  readSourceColumnFacts,
  type SourceColumnFilter,
} from './sourceColumnFacts';
import { sourceColumnsCopy } from './sourceColumnsCopy';
import { SourceColumnRow } from './SourceColumnRow';
import { SourceColumnDetail } from './SourceColumnDetail';
import styles from './SourceColumns.module.css';

export function SourceColumnsPanel({
  node,
  beforeBody,
  afterBody,
  canReorder = false,
  workspaceLayoutKey = null,
  transferColumns = [],
  detailColumnName,
  onDetailColumnChange,
}: Readonly<{
  node: CanonicalNode;
  beforeBody?: ReactNode;
  afterBody?: ReactNode;
  canReorder?: boolean;
  workspaceLayoutKey?: string | null;
  transferColumns?: readonly GraphNodeColumn[];
  detailColumnName: string | null;
  onDetailColumnChange: (name: string | null) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = language.toLowerCase().startsWith('es')
    ? sourceColumnsCopy.es
    : sourceColumnsCopy.en;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SourceColumnFilter>('all');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [reorderStatus, setReorderStatus] = useState('');
  const reorderHintId = useId();
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef<string | null>(null);
  const canonicalFacts = useMemo(() => readSourceColumnFacts(node), [node]);
  const canonicalNames = useMemo(
    () => canonicalFacts.map(({ column }) => column.name),
    [canonicalFacts]
  );
  const listOrder = useCanvasInspectorListOrder({
    workspaceLayoutKey,
    nodeId: node.id,
    listId: 'columns',
    canonicalIds: canonicalNames,
  });
  const factsByName = new Map(canonicalFacts.map((facts) => [facts.column.name, facts]));
  const visible = listOrder.orderedIds.flatMap((name) => {
    const facts = factsByName.get(name);
    return facts != null && matchesSourceColumn(facts, query, filter) ? [facts] : [];
  });
  const selected = visible.find(({ column }) => column.name === selectedName) ?? visible[0];
  const position = visible.findIndex(({ column }) => column.name === detailColumnName);
  const reorder = useInspectorListReorder({
    orderedIds: listOrder.orderedIds,
    visibleIds: visible.map(({ column }) => column.name),
    enabled: canReorder && listOrder.canPersist,
    onMove: listOrder.move,
    onMoved: (name) => {
      setSelectedName(name);
      rowRefs.current.get(name)?.focus();
      setReorderStatus(`${copy.reordered}: ${name}`);
    },
  });
  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    event.preventDefault();
    event.stopPropagation();
    const name = visible[index]?.column.name;
    if (name == null) return;
    setSelectedName(name);
    rowRefs.current.get(name)?.focus();
  };
  const openDetail = (name: string): void => {
    setSelectedName(name);
    onDetailColumnChange(name);
  };

  return (
    <div data-slot="canvas-source-columns" className={styles.panel}>
      {detailColumnName != null ? (
        <SourceColumnDetail
          facts={factsByName.get(detailColumnName) ?? null}
          copy={copy}
          position={position}
          count={visible.length}
          onBack={() => {
            returnFocus.current = visible.some(({ column }) => column.name === detailColumnName)
              ? detailColumnName
              : (visible[0]?.column.name ?? null);
            onDetailColumnChange(null);
          }}
          onPrevious={() => {
            const name = visible[position - 1]?.column.name;
            if (name != null) openDetail(name);
          }}
          onNext={() => {
            const name = visible[position + 1]?.column.name;
            if (name != null) openDetail(name);
          }}
        />
      ) : (
        <>
          {beforeBody}
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Search aria-hidden="true" />
              <input
                type="search"
                data-slot="source-columns-search"
                aria-label={copy.search}
                placeholder={copy.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <label className={styles.filter} data-active={filter !== 'all'} title={copy.filter}>
              <ListFilter aria-hidden="true" />
              <select
                data-slot="source-columns-filter"
                aria-label={copy.filter}
                value={filter}
                onChange={(event) => setFilter(event.target.value as SourceColumnFilter)}
              >
                <option value="all">{copy.all}</option>
                <option value="key">{copy.key}</option>
                <option value="not-null">{copy.notNull}</option>
                <option value="nullable">{copy.nullable}</option>
              </select>
            </label>
          </div>
          <p
            data-slot="source-columns-visible-count"
            className={query.trim() || filter !== 'all' ? styles.count : 'sr-only'}
          >
            {visible.length} / {canonicalFacts.length} {copy.columns}
          </p>
          {visible.length === 0 ? (
            <p className={styles.empty}>
              {canonicalFacts.length === 0 ? copy.noColumns : copy.noMatches}
            </p>
          ) : (
            <>
              <p id={reorderHintId} className="sr-only">
                {reorder.canReorder ? copy.reorderHint : ''}
              </p>
              <ul
                role="listbox"
                aria-label={copy.listLabel}
                aria-describedby={reorder.canReorder ? reorderHintId : undefined}
                className={styles.list}
              >
                {visible.map((facts, index) => {
                  const name = facts.column.name;
                  const transfer = transferColumns.find(
                    (column) => (column.id ?? column.name) === name
                  );
                  return (
                    <li key={name}>
                      <SourceColumnRow
                        facts={facts}
                        copy={copy}
                        buttonProps={{
                          ref: (element) => {
                            if (element == null) rowRefs.current.delete(name);
                            else {
                              rowRefs.current.set(name, element);
                              if (returnFocus.current === name) {
                                element.focus();
                                returnFocus.current = null;
                              }
                            }
                          },
                          draggable: reorder.canReorder || transfer != null,
                          title: transfer == null ? undefined : copy.transferHint,
                          'aria-selected': selected?.column.name === name,
                          tabIndex: selected?.column.name === name ? 0 : -1,
                          onClick: () => openDetail(name),
                          onDragStart: (event) => {
                            event.stopPropagation();
                            reorder.startDrag(name, event);
                            if (transfer != null)
                              writeGraphColumnTransfer(event, node.id, transfer);
                          },
                          onDragEnd: reorder.endDrag,
                          onDragOver: (event) => reorder.dragOver(name, event),
                          onDragLeave: reorder.dragLeave,
                          onDrop: (event) => reorder.drop(name, event),
                          onKeyDown: (event) => {
                            if (reorder.moveWithKeyboard(name, event)) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              openDetail(name);
                            } else if (event.key === 'ArrowDown') moveSelection(event, index + 1);
                            else if (event.key === 'ArrowUp') moveSelection(event, index - 1);
                            else if (event.key === 'Home') moveSelection(event, 0);
                            else if (event.key === 'End') moveSelection(event, visible.length - 1);
                          },
                          ...{ 'data-drop-placement': reorder.dropPlacement(name) },
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {afterBody}
        </>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {reorderStatus}
      </p>
    </div>
  );
}
