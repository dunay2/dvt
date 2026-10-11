/**
 * Owned concern: compose output selection and calculated-field authoring for editable inspectors.
 * @baseline ADR-0064: canonical projections retain calculated SELECT semantics.
 * @decision Reuse the existing list, formula editor and pending-edit guard in JOIN and Transform.
 * @consequence Both inspectors share presentation without adding a command or formula model.
 * @version 1.0.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { CanvasDerivedOutputSection } from './CanvasDerivedOutputSection';
import { usePendingRelationEdits } from './usePendingRelationEdits';

export function CanvasCalculatedRelationOutputs({
  relationId,
  onChange,
  onPendingChange,
  onSaved,
  allowCalculatedFields = true,
}: Readonly<{
  relationId: string;
  onChange: (document: SubstraitDocument) => void | boolean;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: (relationId: string) => void;
  allowCalculatedFields?: boolean;
}>): JSX.Element {
  const [setListPending, setFormulaPending] = usePendingRelationEdits(onPendingChange);
  return (
    <>
      <CanvasRelationOutputs
        relationId={relationId}
        disabled={false}
        onChange={onChange}
        onPendingChange={setListPending}
      />
      {allowCalculatedFields ? (
        <CanvasDerivedOutputSection
          relationId={relationId}
          onChange={onChange}
          onPendingChange={setFormulaPending}
          onSaved={onSaved}
        />
      ) : null}
    </>
  );
}
