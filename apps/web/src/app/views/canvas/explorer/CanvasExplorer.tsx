/**
 * Owned concern: ephemeral explorer disclosure, not graph selection or authoring.
 * @baseline GH-3610: one retained panel, no graph mutation or automatic fit on toggle.
 * @decision Delegate layout to the existing resizable primitive and content to adapters.
 * @consequence Main and semantic views share interaction without sharing domain commands.
 * @version 1.0.0
 */
import { useId, useState, type ReactNode, type RefObject } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
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
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  return (
    <CanvasExplorerTemplate
      id={id}
      active={active}
      copy={copy}
      rootRef={rootRef}
      sources={sources}
      elements={elements}
      onToggle={(key) => setActive((current) => (current === key ? null : key))}
    >
      {children}
    </CanvasExplorerTemplate>
  );
}
