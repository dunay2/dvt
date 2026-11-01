/** Owned concern: expose explicit card arrangement without another pointer mode. */
import { LayoutGrid } from 'lucide-react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { useRelationalLayout } from './RelationalLayoutSession';

export function RelationalNavigationControls() {
  const { arrange } = useRelationalLayout();
  const language = useApplicationLanguageStore((state) => state.language);
  const label = language === 'es' ? 'Reorganizar tarjetas' : 'Arrange cards';
  return (
    <button
      type="button"
      data-slot="canvas-relational-tree-arrange"
      aria-label={label}
      title={label}
      onClick={arrange}
      className="rounded p-1 hover:bg-(--surface-subtle)"
    >
      <LayoutGrid className="size-4" />
    </button>
  );
}
