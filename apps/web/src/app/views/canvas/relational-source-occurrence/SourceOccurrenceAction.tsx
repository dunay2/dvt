/** Owned concern: expose an explicit, keyboard-accessible source reuse action. */
import { CopyPlus } from 'lucide-react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { sourceOccurrenceCopy } from './sourceOccurrenceCopy';
import type { SourceOccurrenceRejection } from './sourceOccurrencePolicy';

export function SourceOccurrenceAction({
  label,
  rejection,
  onAdd,
}: Readonly<{
  label: string;
  rejection: SourceOccurrenceRejection | null;
  onAdd: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  return (
    <button
      type="button"
      data-slot="source-occurrence-add"
      aria-label={`${copy.add}: ${label}`}
      aria-disabled={rejection != null}
      title={rejection == null ? copy.add : copy[rejection]}
      onClick={() => {
        if (rejection == null) onAdd();
      }}
      className="grid size-9 shrink-0 place-items-center rounded text-(--text-muted) hover:bg-(--surface-selected) focus-visible:outline-2 focus-visible:outline-(--focus-ring) aria-disabled:opacity-40"
    >
      <CopyPlus aria-hidden="true" className="size-4" />
      {rejection == null ? null : <span className="sr-only">{copy[rejection]}</span>}
    </button>
  );
}
