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
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { CanvasExplorerTemplate, type CanvasExplorerPanel } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasExplorer({
  sources,
  elements,
  projectFiles,
  children,
  rootRef,
  workspaceTask,
}: Readonly<{
  sources: ReactNode;
  elements: ReactNode;
  projectFiles?: ReactNode;
  children: ReactNode;
  rootRef?: RefObject<HTMLDivElement>;
  workspaceTask?: ReactNode;
}>): JSX.Element {
  const [active, setActive] = useState<CanvasExplorerPanel | null>('sources');
  const [gitOpened, setGitOpened] = useState(false);
  const hasProjectFiles = projectFiles != null;
  const activePanel = active === 'git' && !hasProjectFiles ? null : active;
  const visible = useUiLayoutStore((state) => state.canvasExplorerVisible);
  const close = useUiLayoutStore((state) => state.hideCanvasExplorer);
  // An explicit View-menu reopen must expand even a previously collapsed dock.
  useEffect(() => {
    if (visible)
      setActive((current) =>
        current === 'git' && !hasProjectFiles ? 'sources' : (current ?? 'sources')
      );
  }, [visible, hasProjectFiles]);
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const toggle = (key: CanvasExplorerPanel): void => {
    if (key === 'git') setGitOpened(true);
    setActive((current) => (current === key ? null : key));
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
      active={visible ? activePanel : null}
      visible={visible}
      copy={copy}
      rootRef={rootRef}
      workspaceTask={workspaceTask}
      sources={sources}
      elements={elements}
      git={projectFiles}
      gitOpened={gitOpened}
      onToggle={toggle}
      onKeyToggle={onKeyToggle}
      onCollapse={() => {
        setActive(null);
        document.getElementById(`${id}-${activePanel}-button`)?.focus();
      }}
      onClose={close}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
