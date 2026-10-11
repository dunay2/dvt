/**
 * Owned concern: explorer disclosure and shell visibility, not graph selection or authoring.
 * @baseline GH-3610: one retained panel, no graph mutation or automatic fit on toggle.
 * @decision Delegate layout to the existing resizable primitive and content to adapters.
 * @consequence Main and semantic views share interaction without sharing domain commands.
 * @version 1.0.0
 */
import { useEffect, useId, useState, type ReactNode, type RefObject } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { CanvasExplorerTemplate } from './CanvasExplorer.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

export function CanvasExplorer({
  sources,
  elements,
  children,
  rootRef,
}: Readonly<{
  sources: ReactNode;
  elements: ReactNode;
  children: ReactNode;
  rootRef?: RefObject<HTMLDivElement>;
}>): JSX.Element {
  const [active, setActive] = useState<'sources' | 'elements' | null>('sources');
  const visible = useUiLayoutStore((state) => state.canvasExplorerVisible);
  const close = useUiLayoutStore((state) => state.hideCanvasExplorer);
  // An explicit View-menu reopen must expand even a previously collapsed dock.
  useEffect(() => {
    if (visible) setActive((current) => current ?? 'sources');
  }, [visible]);
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  return (
    <CanvasExplorerTemplate
      id={id}
      active={visible ? active : null}
      visible={visible}
      copy={copy}
      rootRef={rootRef}
      sources={sources}
      elements={elements}
      onToggle={(key) => setActive((current) => (current === key ? null : key))}
      onCollapse={() => {
        setActive(null);
        document.getElementById(`${id}-${active}-button`)?.focus();
      }}
      onClose={close}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
