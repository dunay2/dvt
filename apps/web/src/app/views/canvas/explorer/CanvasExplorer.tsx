/**
 * Owned concern: explorer disclosure and shell visibility, not graph selection or authoring.
 * @baseline GH-3610: one retained panel, no graph mutation or automatic fit on toggle.
 * @decision Delegate layout to the existing resizable primitive and content to adapters.
 * @consequence Main and semantic views share interaction without sharing domain commands.
 * @version 1.0.0
 */
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useShellActivityRail } from '../../../components/shell/ShellActivityRail';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CANVAS_EXPLORER_WIDTH, useUiLayoutStore } from '../../../stores/uiLayoutStore';
import type { ImperativePanelHandle } from '../../../components/ui/resizable';
import {
  CanvasExplorerTemplate,
  type CanvasExplorerActivityRail,
  type CanvasExplorerHeading,
  type CanvasExplorerPanel,
} from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import type { CanonicalNode } from '../../../types/canonical';

export type CanvasProjectElementsInput = Readonly<{
  enabled: boolean;
  items: readonly CanvasExplorerItem[];
  canCreateInstances?: boolean;
  onSelect: (id: string, definition?: CanonicalNode) => void;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  onImport?: () => void;
  connections?: ReactNode;
}>;

export type CanvasExplorerProjectWorkspace = Readonly<{
  onActivate: () => Promise<boolean>;
  onCanvas: () => void;
  renderElements?: (input: CanvasProjectElementsInput) => ReactNode;
}>;

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
  const panelRef = useRef<ImperativePanelHandle>(null);
  const hasProjectFiles = projectFiles != null;
  // defaultSize only initializes a panel; retained Canvas/Model panels must also converge.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel != null && panel.getSize() !== widthPercent) panel.resize(widthPercent);
  }, [widthPercent]);
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const toggle = (key: CanvasExplorerPanel): void => {
    if (key === 'git') {
      if (projectFiles != null) void projectFiles.onActivate().catch(() => undefined);
      return;
    }
    projectFiles?.onCanvas();
    dispatch({ type: activityRail?.codeVisible === true ? 'expand' : 'toggle' });
  };
  const onKeyToggle = (key: CanvasExplorerPanel, event: KeyboardEvent<HTMLButtonElement>): void => {
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
      dock={{
        panelRef,
        widthPercent,
        minSize: CANVAS_EXPLORER_WIDTH.min,
        maxSize: CANVAS_EXPLORER_WIDTH.max,
        onResize: (size, previousSize) => {
          // Mount observations and hidden panels must not overwrite the saved preference.
          if (previousSize !== undefined && expanded) {
            dispatch({ type: 'resize', widthPercent: size });
          }
        },
      }}
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
      onCollapse={() => {
        projectFiles?.onCanvas();
        dispatch({ type: 'collapse' });
        document
          .getElementById(shellOwned ? 'shell-canvas-navigation' : `${id}-elements-button`)
          ?.focus();
      }}
      onClose={() => {
        projectFiles?.onCanvas();
        dispatch({ type: 'close' });
      }}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
