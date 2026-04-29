/** Owned concern: adapt Canvas tab-strip replacement policy into renderable presenter callbacks without JSX. */
import { useState } from 'react';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import {
  createReplaceCurrentCanvasDocumentCommand,
  hasRenderableCanvasTabs,
  resolveCanvasReplacementActionState,
} from './canvasPlaygroundTabStripModel';
import type { CanvasPlaygroundTabStripTemplateProps } from './CanvasPlaygroundTabStrip.templates';
import { resolveCanvasViewCopy } from './copy';

export type CanvasPlaygroundTabStripProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
  availableCanvasKinds?: readonly CanvasKindRegistration[];
  canEditEdges?: boolean;
  onCreateCanvasDocument?: (command: CanvasCreateCanvasDocumentCommand) => void;
}>;

const EMPTY_CANVAS_KIND_REGISTRATIONS: readonly CanvasKindRegistration[] = [];

export function useCanvasPlaygroundTabStripPresenter({
  tabState,
  availableCanvasKinds = EMPTY_CANVAS_KIND_REGISTRATIONS,
  canEditEdges = false,
  onCreateCanvasDocument,
}: CanvasPlaygroundTabStripProps): CanvasPlaygroundTabStripTemplateProps | null {
  const [replacementCanvasKind, setReplacementCanvasKind] = useState<CanvasKindRegistration | null>(
    null
  );
  const replacementActionState = resolveCanvasReplacementActionState({
    tabState,
    availableCanvasKinds,
    canEditEdges,
    onCreateCanvasDocument,
    copy: resolveCanvasViewCopy(),
  });
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

  return {
    tabState,
    replacementAction: replacementActionState.viewState,
    isReplacementDialogOpen: replacementCanvasKind != null,
    onRequestReplacement: requestReplacement,
    onReplacementDialogOpenChange: (open) => {
      if (!open) {
        closeReplacementDialog();
      }
    },
    onCancelReplacement: closeReplacementDialog,
    onConfirmReplacement: confirmReplacement,
  };
}
