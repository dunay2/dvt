/** Owned concern: explicitly expand or focus operation controls without a permanent inspector. */
import { X } from 'lucide-react';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import { useContext, type ReactNode } from 'react';
import {
  CanvasOperationDataPreview,
  CanvasOperationPreviewContext,
} from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasRelationalTreeEditorFrame({
  title,
  children,
  hidden = false,
  onClose,
  relationId,
}: Readonly<{
  title: string;
  children: ReactNode;
  hidden?: boolean;
  onClose: () => void;
  relationId?: string | null;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const preview = useContext(CanvasOperationPreviewContext);
  const showPreview = preview != null && relationId != null;
  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      hidden={hidden}
      className={`${hidden ? 'hidden' : 'flex'} h-[45%] min-h-56 max-h-[32rem] shrink-0 flex-col overflow-hidden border-t border-(--border-subtle) bg-(--surface-panel)`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-(--border-subtle) bg-(--surface-panel) px-3">
        <CanvasRelationalJoinIcon className="size-4 text-(--status-info)" />
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
