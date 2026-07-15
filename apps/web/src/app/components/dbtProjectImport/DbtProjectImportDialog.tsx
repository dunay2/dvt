/** Owned concern: compose the dbt project import gateway, controller, and presentation. */
import type { DbtProjectImportResult } from '@dvt/contracts';

import { useDbtProjectImportPort } from '../../services/AppServicesContext';
import { DbtProjectImportDialogView } from './DbtProjectImportDialogView';
import { useDbtProjectImportController } from './useDbtProjectImportController';

type DbtProjectImportDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onImported: (result: DbtProjectImportResult) => void;
}>;

export function DbtProjectImportDialog({
  open,
  onClose,
  onImported,
}: DbtProjectImportDialogProps): JSX.Element {
  const port = useDbtProjectImportPort();
  const controller = useDbtProjectImportController({ open, port, onImported });

  return (
    <DbtProjectImportDialogView
      open={open}
      model={controller.model}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !controller.model.status.busy) {
          onClose();
        }
      }}
      onProjectRootChange={controller.setProjectRoot}
      onCanvasIdChange={controller.setCanvasId}
      onValidate={() => void controller.validateProject()}
      onImport={() => void controller.importProject()}
    />
  );
}
