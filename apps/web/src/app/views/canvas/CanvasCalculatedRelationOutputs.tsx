/**
 * Owned concern: compose output selection and calculated-field authoring for editable inspectors.
 * @baseline ADR-0064: canonical projections retain calculated SELECT semantics.
 * @decision Let the existing formula state own the output-list presentation slot.
 * @consequence JOIN and Transform show one editing view while retaining selection drafts.
 * @version 1.1.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationOutputs } from './CanvasRelationOutputs';
import { CanvasDerivedOutputSection } from './CanvasDerivedOutputSection';
import { usePendingRelationEdits } from './usePendingRelationEdits';
import { useCanvasOutputEditing } from './CanvasRelationalTreeEditorFrame';

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
  const editing = useCanvasOutputEditing();
  const outputs = (
    <CanvasRelationOutputs
      relationId={relationId}
      disabled={false}
      onChange={onChange}
      onPendingChange={setListPending}
    />
  );
  return allowCalculatedFields && editing ? (
    <CanvasDerivedOutputSection
      relationId={relationId}
      onChange={onChange}
      onPendingChange={setFormulaPending}
      onSaved={onSaved}
    >
      {outputs}
    </CanvasDerivedOutputSection>
  ) : (
    outputs
  );
}
