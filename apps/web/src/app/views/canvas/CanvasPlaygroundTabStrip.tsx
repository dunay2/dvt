/** Owned concern: coordinate host-owned Canvas tabs and replacement action state. */
import { useMemo, useState } from 'react';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { CanvasPlaygroundTabStripTemplate } from './CanvasPlaygroundTabStrip.templates';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import {
  createReplaceCurrentCanvasDocumentCommand,
  hasRenderableCanvasTabs,
  resolveCanvasReplacementActionState,
} from './canvasPlaygroundTabStripModel';
import { canvasViewCopy } from './copy';

type CanvasPlaygroundTabStripProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
  availableCanvasKinds?: readonly CanvasKindRegistration[];
  canEditEdges?: boolean;
  onCreateCanvasDocument?: (command: CanvasCreateCanvasDocumentCommand) => void;
}>;

const EMPTY_CANVAS_KIND_REGISTRATIONS: readonly CanvasKindRegistration[] = [];

export function CanvasPlaygroundTabStrip({
  tabState,
  availableCanvasKinds = EMPTY_CANVAS_KIND_REGISTRATIONS,
  canEditEdges = false,
  onCreateCanvasDocument,
}: CanvasPlaygroundTabStripProps): JSX.Element | null {
  const [replacementCanvasKind, setReplacementCanvasKind] = useState<CanvasKindRegistration | null>(
    null
  );
  const replacementActionState = useMemo(
    () =>
      resolveCanvasReplacementActionState({
        tabState,
        availableCanvasKinds,
        canEditEdges,
        onCreateCanvasDocument,
        copy: canvasViewCopy,
      }),
    [availableCanvasKinds, canEditEdges, onCreateCanvasDocument, tabState]
  );
  const closeReplacementDialog = () => setReplacementCanvasKind(null);
  const requestReplacement = () => {
    if (replacementActionState.activeCanvasKind != null) {
      setReplacementCanvasKind(replacementActionState.activeCanvasKind);
    }
  };
  const confirmReplacement = () => {
    if (replacementCanvasKind != null) {
      onCreateCanvasDocument?.(createReplaceCurrentCanvasDocumentCommand(replacementCanvasKind));
    }

    closeReplacementDialog();
  };

  if (!hasRenderableCanvasTabs(tabState)) {
    return null;
  }

  return (
    <CanvasPlaygroundTabStripTemplate
      tabState={tabState}
      replacementAction={replacementActionState.viewState}
      isReplacementDialogOpen={replacementCanvasKind != null}
      onRequestReplacement={requestReplacement}
      onReplacementDialogOpenChange={(open) => {
        if (!open) {
          closeReplacementDialog();
        }
      }}
      onCancelReplacement={closeReplacementDialog}
      onConfirmReplacement={confirmReplacement}
    />
  );
}
