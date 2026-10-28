/**
 * Owned concern: passive explorer markup and accessible presentation.
 * @baseline GH-3610: persistent activity buttons replace the separate collapse control.
 * @decision Render graph and panels at stable positions; hidden panels leave the focus order.
 * @consequence Switching a panel cannot recreate the graph or lose a search input.
 * @version 1.0.0
 */
import { Database, Workflow, Search, Plus, ChevronLeft, X } from 'lucide-react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { DropdownMenuCheckboxItem } from '../../../components/ui/dropdown-menu';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../../../components/ui/resizable';
import type { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import styles from './CanvasExplorer.module.css';
import type { CanvasExplorerItem } from './canvasExplorerItems';

type Copy = ReturnType<typeof resolveCanvasExplorerCopy>;
const panels = [
  { key: 'sources', icon: <Database aria-hidden="true" /> },
  { key: 'elements', icon: <Workflow aria-hidden="true" /> },
  {
    key: 'git',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="m12 2 10 10-10 10L2 12Z" strokeLinejoin="round" />
        <path d="m8 8 8 8M8 8v8" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        <circle cx="8" cy="16" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
] as const;
export type CanvasExplorerPanel = (typeof panels)[number]['key'];

export function CanvasExplorerTemplate(
  props: Readonly<{
    id: string;
    active: CanvasExplorerPanel | null;
    visible: boolean;
    copy: Copy;
    rootRef?: RefObject<HTMLDivElement>;
    sources: ReactNode;
    elements: ReactNode;
    hasProjectFiles: boolean;
    children: ReactNode;
    workspaceTask?: ReactNode;
    onToggle: (key: CanvasExplorerPanel) => void;
    onKeyToggle: (key: CanvasExplorerPanel, event: KeyboardEvent<HTMLButtonElement>) => void;
    onCollapse: () => void;
    onClose: () => void;
  }>
): JSX.Element {
  const availablePanels = panels.filter(({ key }) => key !== 'git' || props.hasProjectFiles);
  return (
    <div ref={props.rootRef} className={styles.layout} data-slot="canvas-explorer">
      <nav className={styles.rail} aria-label={props.copy.navigation} hidden={!props.visible}>
        {availablePanels.map(({ key, icon }) => (
          <button
            key={key}
            type="button"
            id={`${props.id}-${key}-button`}
            className={styles.activity}
            data-slot={`canvas-explorer-${key}-toggle`}
            aria-label={props.copy[key]}
            title={props.copy[key]}
            aria-expanded={key === 'git' ? undefined : props.active === key}
            aria-controls={key === 'git' ? 'canvas-code-workspace-surface' : `${props.id}-${key}`}
            onClick={() => props.onToggle(key)}
            onKeyDown={(event) => props.onKeyToggle(key, event)}
          >
            {icon}
          </button>
        ))}
      </nav>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          id={`${props.id}-dock`}
          order={1}
          defaultSize={22}
          minSize={15}
          maxSize={40}
          className={props.active == null ? styles.hidden : styles.dock}
        >
          {availablePanels.map(({ key }) =>
            key === 'git' ? null : (
              <section
                key={key}
                id={`${props.id}-${key}`}
                aria-labelledby={`${props.id}-${key}-button`}
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
          disabled={props.active == null}
          tabIndex={props.active == null ? -1 : 0}
          className={props.active == null ? styles.hidden : styles.resize}
        />
        <ResizablePanel
          id={`${props.id}-surface`}
          order={2}
          defaultSize={78}
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
  items,
  query,
  copy,
  disabled,
  onQuery,
  onSelect,
  onImport,
  onDragStart,
  presentation = 'list',
  itemIcon,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  query: string;
  copy: Copy;
  disabled?: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onImport?: () => void;
  onDragStart?: (id: string, event: React.DragEvent<HTMLButtonElement>) => void;
  presentation?: 'list' | 'cards';
  itemIcon?: ReactNode;
}>): JSX.Element {
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
      {onImport == null ? null : (
        <button type="button" className={styles.importAction} onClick={() => onImport()}>
          <Plus aria-hidden="true" />
          {copy.importSources}
        </button>
      )}
      <ul className={styles.list} data-presentation={presentation}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.item}
              aria-pressed={item.selected === true}
              title={item.description == null ? item.label : `${item.label} · ${item.description}`}
              data-element-id={item.id}
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              draggable={!disabled && onDragStart != null}
              onDragStart={onDragStart == null ? undefined : (event) => onDragStart(item.id, event)}
            >
              {itemIcon == null ? null : <span className={styles.itemIcon}>{itemIcon}</span>}
              <span className={styles.itemText}>
                <span className={styles.name}>{item.label}</span>{' '}
                {item.description == null ? null : (
                  <span className={styles.description}>{item.description}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className={styles.empty}>{query.trim() ? copy.noMatches : copy.empty}</p>
      ) : null}
    </div>
  );
}
