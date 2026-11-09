/**
 * Owned concern: passive explorer markup and accessible presentation.
 * @baseline GH-3610: persistent activity buttons retain access to the collapsed dock.
 * @decision Render graph and panels at stable positions; hidden panels leave the focus order.
 * @consequence Switching a panel cannot recreate the graph or lose a search input.
 * @version 1.0.0
 */
import {
  Box,
  PanelsTopLeft,
  Workflow,
  GitBranch,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { useId, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip';
import { DropdownMenuCheckboxItem } from '../../../components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../../../components/ui/collapsible';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  type ImperativePanelHandle,
} from '../../../components/ui/resizable';
import type { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import styles from './CanvasExplorer.module.css';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import { useCanvasNodeActivation } from '../../../components/canvas/useCanvasNodeActivation';

type Copy = ReturnType<typeof resolveCanvasExplorerCopy>;
const panels = [
  { key: 'elements', icon: <Workflow aria-hidden="true" /> },
  { key: 'git', icon: <GitBranch aria-hidden="true" /> },
] as const;
export type CanvasExplorerPanel = (typeof panels)[number]['key'];
export type CanvasExplorerActivityRail = Readonly<{
  codeVisible: boolean;
}>;
export type CanvasExplorerHeading = Readonly<{
  label: string;
  contextLabel?: string;
}>;

export function CanvasExplorerTemplate(
  props: Readonly<{
    id: string;
    active: CanvasExplorerPanel | null;
    visible: boolean;
    dock: Readonly<{
      panelRef: RefObject<ImperativePanelHandle>;
      widthPercent: number;
      minSize: number;
      maxSize: number;
      onResize: (size: number, previousSize: number | undefined) => void;
    }>;
    copy: Copy;
    heading?: CanvasExplorerHeading;
    rootRef?: RefObject<HTMLDivElement>;
    elements: ReactNode;
    hasProjectFiles: boolean;
    children: ReactNode;
    workspaceTask?: ReactNode;
    activityRail?: CanvasExplorerActivityRail;
    shellOwned?: boolean;
    onToggle: (key: CanvasExplorerPanel) => void;
    onKeyToggle: (key: CanvasExplorerPanel, event: KeyboardEvent<HTMLButtonElement>) => void;
    onCollapse: () => void;
    onClose: () => void;
  }>
): JSX.Element {
  const availablePanels = panels.filter(({ key }) => key !== 'git' || props.hasProjectFiles);
  const railVisible = props.visible;
  const activityRail = (
    <nav
      className={styles.rail}
      aria-label={props.copy.navigation}
      hidden={!railVisible}
      aria-hidden={!railVisible}
      {...(railVisible ? {} : { inert: '' })}
    >
      {availablePanels.map(({ key, icon }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              id={`${props.id}-${key}-button`}
              className={styles.activity}
              data-slot={`canvas-explorer-${key}-toggle`}
              aria-label={props.copy[key]}
              aria-expanded={
                key === 'git'
                  ? props.activityRail?.codeVisible
                  : props.activityRail?.codeVisible !== true && props.active === key
              }
              aria-controls={key === 'git' ? 'canvas-code-workspace-surface' : `${props.id}-${key}`}
              onClick={() => props.onToggle(key)}
              onKeyDown={(event) => props.onKeyToggle(key, event)}
            >
              {icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{props.copy[key]}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
  return (
    <div ref={props.rootRef} className={styles.layout} data-slot="canvas-explorer">
      {props.shellOwned ? null : activityRail}
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          ref={props.dock.panelRef}
          id={`${props.id}-dock`}
          order={1}
          defaultSize={props.dock.widthPercent}
          minSize={props.dock.minSize}
          maxSize={props.dock.maxSize}
          onResize={props.dock.onResize}
          className={props.active == null ? styles.hidden : styles.dock}
        >
          {availablePanels.map(({ key }) =>
            key === 'git' ? null : (
              <section
                key={key}
                id={`${props.id}-${key}`}
                aria-label={props.copy[key]}
                data-slot="canvas-explorer-panel"
                hidden={props.active !== key}
                className={styles.panel}
              >
                <header className={styles.header}>
                  <h3 className={styles.heading}>
                    {props.heading == null ? null : (
                      <PanelsTopLeft className={styles.headingIcon} aria-hidden="true" />
                    )}
                    <span
                      className={styles.headingLabel}
                      data-slot="canvas-explorer-heading-label"
                      title={props.heading?.label ?? props.copy[key]}
                    >
                      {props.heading?.label ?? props.copy[key]}
                    </span>
                  </h3>
                  {props.heading?.contextLabel ? (
                    <span className={styles.contextLabel}>{props.heading.contextLabel}</span>
                  ) : null}
                  <button
                    type="button"
                    className={styles.headerAction}
                    aria-label={props.copy.collapse}
                    title={props.copy.collapse}
                    onClick={props.onCollapse}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.headerAction}
                    aria-label={props.copy.close}
                    title={props.copy.close}
                    onClick={props.onClose}
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>
                {props[key]}
              </section>
            )
          )}
        </ResizablePanel>
        <ResizableHandle
          aria-label={props.copy.resize}
          aria-orientation="vertical"
          disabled={props.active == null}
          tabIndex={props.active == null ? -1 : 0}
          className={props.active == null ? styles.hidden : styles.resize}
        />
        <ResizablePanel
          id={`${props.id}-surface`}
          order={2}
          defaultSize={100 - props.dock.widthPercent}
          minSize={40}
          className={styles.surface}
        >
          <div
            className={styles.retainedSurface}
            data-slot="canvas-explorer-retained-surface"
            aria-hidden={props.workspaceTask != null}
            {...(props.workspaceTask != null ? { inert: '' } : {})}
          >
            {props.children}
          </div>
          {props.workspaceTask == null ? null : (
            <div className={styles.workspaceTask} data-slot="canvas-explorer-workspace-task">
              {props.workspaceTask}
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export function CanvasExplorerMenuTemplate({
  visible,
  copy,
  onVisibleChange,
}: Readonly<{
  visible: boolean;
  copy: Copy;
  onVisibleChange: (visible: boolean) => void;
}>): JSX.Element {
  return (
    <DropdownMenuCheckboxItem
      data-slot="canvas-explorer-view-command"
      checked={visible}
      onCheckedChange={onVisibleChange}
    >
      {copy.navigation}
    </DropdownMenuCheckboxItem>
  );
}

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
  copy: Copy;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: React.DragEvent<HTMLButtonElement>) => void;
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
  copy: Copy;
  disabled?: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: React.DragEvent<HTMLButtonElement>) => void;
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
