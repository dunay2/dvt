/** Owned concern: dock the selected operation controls and preview in one right properties panel. */
import { X } from 'lucide-react';
import {
  resolveCanvasRelationalOperationPresentation,
  type CanvasPresentationOperation,
} from './canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useContext, type ReactNode } from 'react';
import {
  CanvasOperationDataPreview,
  CanvasOperationPreviewContext,
} from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalTreeEditorFrame({
  operation,
  children,
  hidden = false,
  onClose,
  relationId,
}: Readonly<{
  operation: CanvasPresentationOperation;
  children: ReactNode;
  hidden?: boolean;
  onClose: () => void;
  relationId?: string | null;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const presentation = resolveCanvasRelationalOperationPresentation(operation);
  const title = resolveCanvasViewCopy(language)[presentation.labelKey];
  const Icon = presentation.icon;
  const preview = useContext(CanvasOperationPreviewContext);
  const showPreview = preview != null && relationId != null;
  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      aria-label={title}
      hidden={hidden}
      className={`canvas-operation-properties ${hidden ? 'hidden' : 'flex'} min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-(--border-subtle) bg-(--surface-panel)`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3">
        <Icon className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold">{title}</h3>
        <button
          type="button"
          data-slot="canvas-relational-collapse"
          aria-label={copy.collapse}
          title={copy.collapse}
          onClick={onClose}
          className="ml-auto grid size-7 place-items-center rounded hover:bg-(--surface-selected)"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>
      <div
        className={`canvas-operation-panels min-h-0 flex-1 overflow-auto p-3 ${showPreview ? 'with-preview' : ''}`}
      >
        <div className="canvas-operation-controls min-h-0 min-w-0">{children}</div>
        {showPreview ? <CanvasOperationDataPreview relationId={relationId} label={title} /> : null}
      </div>
    </section>
  );
}
