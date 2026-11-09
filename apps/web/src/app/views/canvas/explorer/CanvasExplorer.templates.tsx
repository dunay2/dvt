/**
 * Owned concern: present retained Explorer docking and its standalone navigation actions.
 * Reason: the one Elements body has a stable slot independent of the Elements/Git actions.
 * Corner invariant: toggling navigation or an inline task cannot replace graph or catalogue DOM.
 */
import { PanelsTopLeft, Workflow, GitBranch, ChevronLeft, X } from 'lucide-react';
import type { JSX } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../../../components/ui/resizable';
import type {
  CanvasExplorerNavigationAction,
  CanvasExplorerTemplateProps,
} from './CanvasExplorer.types';
import styles from './CanvasExplorer.module.css';

const navigationActions = [
  { key: 'elements', icon: <Workflow aria-hidden="true" /> },
  { key: 'git', icon: <GitBranch aria-hidden="true" /> },
] as const;

export function CanvasExplorerTemplate(props: CanvasExplorerTemplateProps): JSX.Element {
  const availableActions = navigationActions.filter(
    ({ key }) => key !== 'git' || props.hasProjectFiles
  );
  const railVisible = props.visible;
  const isPanelExpanded = props.active === 'elements';
  const isNavigationExpanded = (action: CanvasExplorerNavigationAction): boolean | undefined =>
    action === 'git'
      ? props.activityRail?.codeVisible
      : props.activityRail?.codeVisible !== true && isPanelExpanded;
  const activityRail = (
    <nav
      className={styles.rail}
      aria-label={props.copy.navigation}
      hidden={!railVisible}
      aria-hidden={!railVisible}
      {...(railVisible ? {} : { inert: '' })}
    >
      {availableActions.map(({ key, icon }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              id={`${props.id}-${key}-button`}
              className={styles.activity}
              data-slot={`canvas-explorer-${key}-toggle`}
              aria-label={props.copy[key]}
              aria-expanded={isNavigationExpanded(key)}
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
          <section
            id={`${props.id}-elements`}
            aria-label={props.copy.elements}
            data-slot="canvas-explorer-panel"
            hidden={!isPanelExpanded}
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
                  title={props.heading?.label ?? props.copy.elements}
                >
                  {props.heading?.label ?? props.copy.elements}
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
            {props.elements}
          </section>
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
