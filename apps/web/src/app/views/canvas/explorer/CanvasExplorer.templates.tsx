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

type Copy = ReturnType<typeof resolveCanvasExplorerCopy>;
type Panel = 'sources' | 'elements';
const panels = [
  { key: 'sources', Icon: Database },
  { key: 'elements', Icon: Workflow },
] as const;

export function CanvasExplorerTemplate(
  props: Readonly<{
    id: string;
    active: Panel | null;
    visible: boolean;
    copy: Copy;
    rootRef?: RefObject<HTMLDivElement>;
    sources: ReactNode;
    elements: ReactNode;
    children: ReactNode;
    workspaceTask?: ReactNode;
    onToggle: (key: Panel) => void;
    onKeyToggle: (key: Panel, event: KeyboardEvent<HTMLButtonElement>) => void;
    onCollapse: () => void;
    onClose: () => void;
  }>
): JSX.Element {
  return (
    <div ref={props.rootRef} className={styles.layout} data-slot="canvas-explorer">
      <nav className={styles.rail} aria-label={props.copy.navigation} hidden={!props.visible}>
        {panels.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            id={`${props.id}-${key}-button`}
            className={styles.activity}
            data-slot={`canvas-explorer-${key}-toggle`}
            aria-label={props.copy[key]}
            title={props.copy[key]}
            aria-expanded={props.active === key}
            aria-controls={`${props.id}-${key}`}
            onClick={() => props.onToggle(key)}
            onKeyDown={(event) => props.onKeyToggle(key, event)}
          >
            <Icon aria-hidden="true" />
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
          {panels.map(({ key }) => (
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
          ))}
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
            {...(props.workspaceTask == null ? {} : { inert: '' })}
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
}: Readonly<{
  items: readonly Readonly<{
    id: string;
    label: string;
    description?: string;
    selected?: boolean;
  }>[];
  query: string;
  copy: Copy;
  disabled?: boolean;
  onQuery: (value: string) => void;
  onSelect: (id: string) => void;
  onImport?: () => void;
  onDragStart?: (id: string, event: React.DragEvent<HTMLButtonElement>) => void;
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
      <ul className={styles.list}>
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
              <span className={styles.name}>{item.label}</span>{' '}
              {item.description == null ? null : (
                <span className={styles.description}>{item.description}</span>
              )}
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
