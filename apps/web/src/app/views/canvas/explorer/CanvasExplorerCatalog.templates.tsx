/**
 * Owned concern: render shared catalogue sections and the single project model list.
 * Reason: catalogue rows and metadata disclosure evolve independently of retained docking.
 * Corner invariant: disclosure never selects or places a model; click inspection and drag retain their owners.
 */
import { Box, Search, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useId, type DragEvent, type JSX, type ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../../../components/ui/collapsible';
import { useCanvasNodeActivation } from '../../../components/canvas/useCanvasNodeActivation';
import type { CanvasExplorerCopy } from './CanvasExplorer.types';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import styles from './CanvasExplorer.module.css';

/** Shared disclosure structure for project connection and model sections. */
export function CanvasExplorerSection({
  title,
  count,
  countSlot,
  slot,
  open,
  onOpenChange,
  action,
  busy,
  children,
}: Readonly<{
  title: string;
  count?: number;
  countSlot: string;
  slot: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: ReactNode;
  busy?: boolean;
  children: ReactNode;
}>): JSX.Element {
  const id = useId();
  return (
    <section className={styles.catalogSection} data-slot={slot} aria-busy={busy}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className={styles.categoryHeader}>
          <h4 className={styles.categoryHeading} aria-label={title}>
            <CollapsibleTrigger
              className={styles.sectionToggle}
              aria-label={title}
              aria-controls={id}
            >
              <ChevronDown aria-hidden="true" />
              <span>{title}</span>
              {count == null ? null : (
                <span className={styles.count} data-slot={countSlot}>
                  {count}
                </span>
              )}
            </CollapsibleTrigger>
          </h4>
          {action}
        </div>
        <CollapsibleContent id={id} className={styles.sectionContent} forceMount hidden={!open}>
          {children}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

/** Passive model rows preserve command activation and expose independent metadata controls. */

function CanvasExplorerModelRow({
  id,
  item,
  expanded,
  onToggleDetails,
  copy,
  disabled,
  onSelect,
  onDragStart,
}: Readonly<{
  id: string;
  item: CanvasExplorerItem;
  expanded: boolean;
  onToggleDetails: (id: string) => void;
  copy: CanvasExplorerCopy;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
}>): JSX.Element {
  const unavailable = disabled || item.disabled;
  const activation = useCanvasNodeActivation(
    item.id,
    unavailable ? undefined : () => onSelect(item.id)
  );
  const draggable = !unavailable && item.draggable !== false && onDragStart != null;
  const detailsId = `${id}-${encodeURIComponent(item.id)}-details`;
  const sourceId = `${id}-${encodeURIComponent(item.id)}-source`;
  const formatId = `${id}-${encodeURIComponent(item.id)}-format`;
  const sqlFile = item.definitionFormat === 'sql';
  const descriptions = [item.isSource ? sourceId : null, sqlFile ? formatId : null]
    .filter(Boolean)
    .join(' ');
  const selected = item.selected === true;
  const description = item.description?.trim();
  return (
    <li data-slot="canvas-explorer-model-row" data-model-id={item.id}>
      <div className={styles.itemRow} data-selected={selected}>
        <button
          type="button"
          className={styles.item}
          aria-pressed={selected}
          aria-label={description ? `${item.label} ${description}` : item.label}
          aria-describedby={descriptions || undefined}
          title={description ? `${item.label} · ${description}` : item.label}
          data-element-id={item.id}
          disabled={unavailable}
          onClick={activation.onClick}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            activation.onDoubleClick(event);
          }}
          draggable={draggable}
          onDragStart={
            draggable
              ? (event) => {
                  activation.cancelPendingClick();
                  onDragStart?.(item.id, event);
                }
              : undefined
          }
        >
          <span className={styles.catalogModelIcon}>
            <Box aria-hidden="true" data-model-icon="model" />
          </span>
          <span className={styles.itemText}>
            <span className={styles.titleLine} data-slot="canvas-explorer-model-title">
              <span className={styles.name}>{item.label}</span>
              {item.isSource || sqlFile ? (
                <span className={styles.facets}>
                  {item.isSource ? (
                    <span id={sourceId} className={styles.property}>
                      {copy.source}
                    </span>
                  ) : null}
                  {sqlFile ? (
                    <span id={formatId} className={styles.format}>
                      {copy.sql}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        {item.details?.length ? (
          <button
            type="button"
            className={styles.detailsToggle}
            data-slot="canvas-explorer-model-disclosure"
            data-model-id={item.id}
            aria-label={`${copy.details}: ${item.label}`}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => onToggleDetails(item.id)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {item.details?.length ? (
        <dl id={detailsId} className={styles.details} hidden={!expanded}>
          {item.details.map((detail) => (
            <div key={`${detail.label}:${detail.value}`}>
              <dt>{copy[detail.label]}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

export function CanvasExplorerListTemplate({
  items,
  open,
  onOpenChange,
  expandedIds,
  onToggleDetails,
  query,
  copy,
  disabled,
  onQuery,
  onSelect,
  onDragStart,
  onAddModel,
  connections,
  status,
  countKnown,
  pending,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expandedIds: ReadonlySet<string>;
  onToggleDetails: (id: string) => void;
  query: string;
  copy: CanvasExplorerCopy;
  disabled?: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  connections?: ReactNode;
  status?: ReactNode;
  countKnown: boolean;
  pending: boolean;
}>): JSX.Element {
  const id = useId();
  return (
    <div className={styles.listPanel}>
      {connections}
      <CanvasExplorerSection
        title={copy.models}
        count={countKnown ? items.length : undefined}
        countSlot="canvas-explorer-model-count"
        slot="canvas-explorer-models"
        open={open}
        onOpenChange={onOpenChange}
        busy={pending}
        action={
          <button
            type="button"
            className={styles.headerAction}
            aria-label={copy.addModel}
            title={copy.addModel}
            disabled={disabled || onAddModel == null}
            onClick={(event) => onAddModel?.(event.currentTarget)}
          >
            <Plus aria-hidden="true" />
          </button>
        }
      >
        {status}
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.currentTarget.value)}
            aria-label={copy.search}
            placeholder={copy.search}
          />
        </label>
        <ul className={styles.list}>
          {items.map((item) => (
            <CanvasExplorerModelRow
              key={item.id}
              id={id}
              item={item}
              expanded={expandedIds.has(item.id)}
              onToggleDetails={onToggleDetails}
              copy={copy}
              disabled={disabled}
              onSelect={onSelect}
              onDragStart={onDragStart}
            />
          ))}
        </ul>
        {countKnown && items.length === 0 ? (
          <p className={styles.empty}>{query.trim() ? copy.noMatches : copy.empty}</p>
        ) : null}
      </CanvasExplorerSection>
    </div>
  );
}
