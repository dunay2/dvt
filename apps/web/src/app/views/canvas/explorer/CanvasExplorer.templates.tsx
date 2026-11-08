/**
 * Owned concern: passive explorer markup and accessible presentation.
 * @baseline GH-3610: persistent activity buttons retain access to the collapsed dock.
 * @decision Render graph and panels at stable positions; hidden panels leave the focus order.
 * @consequence Switching a panel cannot recreate the graph or lose a search input.
 * @version 1.0.0
 */
import {
  Workflow,
  GitBranch,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
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
import type { CanvasExplorerItem, CanvasExplorerCategoryAction } from './canvasExplorerItems';

type Copy = ReturnType<typeof resolveCanvasExplorerCopy>;
const panels = [
  { key: 'elements', icon: <Workflow aria-hidden="true" /> },
  { key: 'git', icon: <GitBranch aria-hidden="true" /> },
] as const;
export type CanvasExplorerPanel = (typeof panels)[number]['key'];
export type CanvasExplorerActivityRail = Readonly<{
  codeVisible: boolean;
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
    rootRef?: RefObject<HTMLDivElement>;
    elements: ReactNode;
    hasProjectFiles: boolean;
    children: ReactNode;
    workspaceTask?: ReactNode;
    activityRail?: CanvasExplorerActivityRail;
    railTarget?: HTMLElement | null;
    railActive?: boolean;
    onToggle: (key: CanvasExplorerPanel) => void;
    onKeyToggle: (key: CanvasExplorerPanel, event: KeyboardEvent<HTMLButtonElement>) => void;
    onCollapse: () => void;
    onClose: () => void;
  }>
): JSX.Element {
  const availablePanels = panels.filter(({ key }) => key !== 'git' || props.hasProjectFiles);
  const shellOwned = props.railTarget !== undefined;
  const railVisible =
    props.railActive !== false && (shellOwned ? props.hasProjectFiles : props.visible);
  const activityRail = (
    <nav
      className={styles.rail}
      aria-label={props.copy.navigation}
      hidden={!railVisible}
      aria-hidden={!railVisible}
      {...(railVisible ? {} : { inert: '' })}
    >
      {availablePanels
        .filter(({ key }) => !shellOwned || key !== 'elements')
        .map(({ key, icon }) => (
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
                aria-controls={
                  key === 'git' ? 'canvas-code-workspace-surface' : `${props.id}-${key}`
                }
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
      {props.railTarget === undefined
        ? activityRail
        : props.railTarget === null
          ? null
          : createPortal(activityRail, props.railTarget)}
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
                  <h3 className={styles.heading}>{props.copy[key]}</h3>
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

export function CanvasExplorerListTemplate({
  categories,
  collapsedCategories,
  onCategoryOpenChange,
  query,
  copy,
  disabled,
  onQuery,
  onSelect,
  onDragStart,
  categoryActions,
}: Readonly<{
  categories: ReadonlyMap<string | undefined, readonly CanvasExplorerItem[]>;
  collapsedCategories: ReadonlySet<string>;
  onCategoryOpenChange: (category: string, open: boolean) => void;
  query: string;
  copy: Copy;
  disabled?: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onDragStart?: (id: string, event: React.DragEvent<HTMLButtonElement>) => void;
  categoryActions?: ReadonlyMap<string, CanvasExplorerCategoryAction>;
}>): JSX.Element {
  const renderItem = (item: CanvasExplorerItem) => {
    const unavailable = disabled || item.disabled;
    const draggable = !unavailable && item.draggable !== false && onDragStart != null;
    return (
      <li key={item.id}>
        <button
          type="button"
          className={styles.item}
          aria-pressed={item.selected === true}
          title={item.description == null ? item.label : `${item.label} · ${item.description}`}
          data-element-id={item.id}
          disabled={unavailable}
          onClick={() => onSelect(item.id)}
          draggable={draggable}
          onDragStart={draggable ? (event) => onDragStart?.(item.id, event) : undefined}
        >
          <span className={styles.itemText}>
            <span className={styles.name}>{item.label}</span>{' '}
            {item.description == null ? null : (
              <span className={styles.description}>{item.description}</span>
            )}
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className={styles.listPanel}>
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
        {Array.from(categories, ([category, items]) => {
          if (category == null) return items.map(renderItem);
          const open = !collapsedCategories.has(category);
          const action = categoryActions?.get(category);
          return (
            <li key={category}>
              <Collapsible
                open={open}
                onOpenChange={(nextOpen) => onCategoryOpenChange(category, nextOpen)}
              >
                <div className={styles.categoryHeader}>
                  <h4 className={styles.categoryHeading}>
                    <CollapsibleTrigger
                      className={styles.heading}
                      aria-label={`${copy.elements}: ${category}`}
                    >
                      {open ? (
                        <ChevronDown size={12} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={12} aria-hidden="true" />
                      )}
                      {category}
                    </CollapsibleTrigger>
                  </h4>
                  {action == null ? null : (
                    <button
                      type="button"
                      className={styles.headerAction}
                      aria-label={action.label}
                      title={action.label}
                      disabled={disabled || action.onAdd == null}
                      onClick={(event) => action.onAdd?.(event.currentTarget)}
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  )}
                </div>
                <CollapsibleContent>
                  <ul className={styles.list}>{items.map(renderItem)}</ul>
                </CollapsibleContent>
              </Collapsible>
            </li>
          );
        })}
      </ul>
      {Array.from(categories.values()).every((items) => items.length === 0) ? (
        <p className={styles.empty}>{query.trim() ? copy.noMatches : copy.empty}</p>
      ) : null}
    </div>
  );
}
