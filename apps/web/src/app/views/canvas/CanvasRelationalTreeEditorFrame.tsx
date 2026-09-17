/** Owned concern: explicitly expand or focus operation controls without a permanent inspector. */
import { ChevronDown, Link2, Maximize2, Minimize2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalTreeEditorFrame({
  title,
  children,
  forceExpanded = false,
}: Readonly<{
  title: string;
  children: ReactNode;
  forceExpanded?: boolean;
}>): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const visible = expanded || focused || forceExpanded;
  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      className={`${focused ? 'absolute inset-0 z-20' : visible ? 'max-h-[50%] shrink-0' : 'shrink-0'} overflow-auto border-t border-(--border-subtle) bg-(--surface-panel)`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !focused || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        setFocused(false);
      }}
    >
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-(--border-subtle) bg-(--surface-panel) px-4 py-3">
        <Link2 aria-hidden="true" className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold">{title}</h3>
        <button
          type="button"
          data-slot="canvas-relational-expand"
          aria-expanded={visible}
          disabled={forceExpanded}
          onClick={() => {
            setFocused(false);
            setExpanded(!visible);
          }}
          className="ml-auto flex items-center gap-2 rounded border border-(--border-subtle) px-3 py-1.5 text-xs hover:bg-(--surface-selected)"
        >
          {visible ? copy.collapse : copy.conditions}
          <ChevronDown aria-hidden="true" className={`size-3.5 ${visible ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          data-slot="canvas-relational-focus"
          aria-pressed={focused}
          onClick={() => setFocused((current) => !current)}
          className="flex items-center gap-2 rounded border border-(--border-subtle) px-3 py-1.5 text-xs hover:bg-(--surface-selected)"
        >
          {focused ? (
            <Minimize2 aria-hidden="true" className="size-3.5" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-3.5" />
          )}
          {focused ? copy.exitFocus : copy.focus}
        </button>
      </header>
      <div className={visible ? 'px-5 py-4' : 'hidden'}>{children}</div>
    </section>
  );
}
