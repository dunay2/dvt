/** Owned concern: explicit hand mode and arrangement, separate from viewport framing. */
import { Hand, LayoutGrid } from 'lucide-react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useRelationalLayout } from './RelationalLayoutSession';

export function RelationalNavigationControls({
  panMode,
  onTogglePan,
}: Readonly<{
  panMode: boolean;
  onTogglePan: () => void;
}>) {
  const { arrange } = useRelationalLayout();
  const language = useApplicationLanguageStore((state) => state.language);
  const labels =
    language === 'es'
      ? { pan: 'Mover lienzo', arrange: 'Reorganizar tarjetas' }
      : { pan: 'Pan canvas', arrange: 'Arrange cards' };
  return (
    <>
      <button
        type="button"
        data-slot="canvas-relational-tree-pan"
        aria-label={labels.pan}
        title={labels.pan}
        aria-pressed={panMode}
        onClick={onTogglePan}
        className="rounded p-1 hover:bg-(--surface-subtle) aria-pressed:bg-(--surface-selected) aria-pressed:text-(--status-info)"
      >
        <Hand className="size-4" />
      </button>
      <button
        type="button"
        data-slot="canvas-relational-tree-arrange"
        aria-label={labels.arrange}
        title={labels.arrange}
        onClick={arrange}
        className="rounded p-1 hover:bg-(--surface-subtle)"
      >
        <LayoutGrid className="size-4" />
      </button>
    </>
  );
}
