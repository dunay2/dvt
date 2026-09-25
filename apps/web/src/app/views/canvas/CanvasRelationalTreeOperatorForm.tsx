/** Owned concern: compose the local operator controller and inline/modal presentation. */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { useOperatorForm } from './relational-operator-form/useOperatorForm';
import { OperatorFormView } from './relational-operator-form/OperatorFormView';

export function CanvasRelationalTreeOperatorForm({
  tool,
  draft,
  title,
  onClose,
  onChange,
  inline = false,
  targetRelationId,
  onPendingChange,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  draft: DvtSubstraitProjectionDraft;
  title: string;
  onClose: () => void;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  inline?: boolean;
  targetRelationId?: string;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element {
  const model = useOperatorForm({
    tool,
    draft,
    onClose,
    onChange,
    targetRelationId,
    onPendingChange,
  });
  const form = <OperatorFormView tool={tool} form={model} inline={inline} />;
  if (inline) return form;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) model.cancel();
      }}
    >
      <DialogContent className="max-w-lg" data-slot="canvas-relational-operator-form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{model.copy.description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
