/**
 * Owned concern: explorer disclosure and shell visibility, not graph selection or authoring.
 * Reason: the layout projection is the one owner of retained dock disclosure and width.
 * Corner invariant: moving template contracts cannot remount the graph or the catalogue.
 * @baseline GH-3610: one retained panel, no graph mutation or automatic fit on toggle.
 * @decision Delegate layout to the existing resizable primitive and content to adapters.
 * @consequence Main and semantic views share interaction without sharing domain commands.
 * @version 1.0.0
 */
import { useId, type KeyboardEvent, type JSX, type ReactNode, type RefObject } from 'react';
import { useShellActivityRail } from '../../../components/shell/ShellActivityRail';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { CanvasExplorerTemplate } from './CanvasExplorer.templates';
import type {
  CanvasExplorerActivityRail,
  CanvasExplorerHeading,
  CanvasExplorerNavigationAction,
  CanvasExplorerProjectWorkspace,
} from './CanvasExplorer.types';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import { useCanvasExplorerResize } from './useCanvasExplorerResize';

export function CanvasExplorer({
  elements,
  heading,
  projectFiles,
  children,
  rootRef,
  workspaceTask,
  activityRail,
}: Readonly<{
  elements: ReactNode | ((enabled: boolean) => ReactNode);
  heading?: CanvasExplorerHeading;
  projectFiles?: CanvasExplorerProjectWorkspace;
  children: ReactNode;
  rootRef?: RefObject<HTMLDivElement>;
  workspaceTask?: ReactNode;
  activityRail?: CanvasExplorerActivityRail;
}>): JSX.Element {
  const shellOwned = useShellActivityRail();
  const { mode, widthPercent } = useUiLayoutStore((state) => state.canvasExplorer);
  const dispatch = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const expanded = mode === 'expanded';
  const visible = mode !== 'closed';
  const hasProjectFiles = projectFiles != null;
  const id = useId();
  const collapse = (): void => {
    projectFiles?.onCanvas();
    dispatch({ type: 'collapse' });
    document
      .getElementById(shellOwned ? 'shell-canvas-navigation' : `${id}-elements-button`)
      ?.focus();
  };
  const dock = useCanvasExplorerResize({
    groupId: `${id}-panels`,
    expanded,
    widthPercent,
    onWidthChange: (size) => dispatch({ type: 'resize', widthPercent: size }),
    onCollapse: collapse,
  });
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const toggle = (key: CanvasExplorerNavigationAction): void => {
    if (key === 'git') {
      if (projectFiles != null) void projectFiles.onActivate().catch(() => undefined);
      return;
    }
    projectFiles?.onCanvas();
    dispatch({ type: activityRail?.codeVisible === true ? 'expand' : 'toggle' });
  };
  const onKeyToggle = (
    key: CanvasExplorerNavigationAction,
    event: KeyboardEvent<HTMLButtonElement>
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) toggle(key);
  };
  return (
    <CanvasExplorerTemplate
      id={id}
      heading={heading}
      active={visible && expanded ? 'elements' : null}
      visible={visible}
      dock={dock}
      copy={copy}
      rootRef={rootRef}
      workspaceTask={workspaceTask}
      activityRail={activityRail}
      shellOwned={shellOwned}
      elements={
        typeof elements === 'function'
          ? elements(visible && expanded && activityRail?.codeVisible !== true)
          : elements
      }
      hasProjectFiles={hasProjectFiles}
      onToggle={toggle}
      onKeyToggle={onKeyToggle}
      onCollapse={collapse}
      onClose={() => {
        projectFiles?.onCanvas();
        dispatch({ type: 'close' });
      }}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
