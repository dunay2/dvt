/** Owned concern: adapt Canvas tab-strip creation policy into renderable presenter callbacks without JSX. */
import { useState } from 'react';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import {
  createNewCanvasDocumentCommand,
  hasRenderableCanvasTabs,
  resolveCanvasReplacementActionState,
} from './canvasPlaygroundTabStripModel';
import type { CanvasPlaygroundTabStripTemplateProps } from './CanvasPlaygroundTabStrip.templates';
import { resolveCanvasViewCopy } from './copy';

export type CanvasPlaygroundTabStripProps = Readonly<{
  tabState: CanvasPlaygroundTabState;
  availableCanvasKinds?: readonly CanvasKindRegistration[];
  canEditEdges?: boolean;
  variant?: 'standalone' | 'inline';
  onCreateCanvasDocument?: (command: CanvasCreateCanvasDocumentCommand) => void;
}>;

const EMPTY_CANVAS_KIND_REGISTRATIONS: readonly CanvasKindRegistration[] = [];

export function useCanvasPlaygroundTabStripPresenter({
  tabState,
  availableCanvasKinds = EMPTY_CANVAS_KIND_REGISTRATIONS,
  canEditEdges = false,
  variant,
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
  const resolveDefaultReplacementCanvasKind = () =>
    replacementActionState.activeCanvasKind ?? availableCanvasKinds[0] ?? null;
  const closeReplacementDialog = () => setReplacementCanvasKind(null);
  const requestReplacement = () => {
    const defaultReplacementKind = resolveDefaultReplacementCanvasKind();
    if (replacementActionState.viewState.canReplaceCanvas && defaultReplacementKind != null) {
      setReplacementCanvasKind(defaultReplacementKind);
    }
  };
  const confirmReplacement = () => {
    if (replacementCanvasKind != null) {
      onCreateCanvasDocument?.(createNewCanvasDocumentCommand(replacementCanvasKind));
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
    selectedReplacementKind: replacementCanvasKind?.kind ?? null,
    variant,
    onRequestReplacement: requestReplacement,
    onReplacementDialogOpenChange: (open) => {
      if (!open) {
        closeReplacementDialog();
      }
    },
    onReplacementTemplateKindChange: (kind) => {
      const nextCanvasKind =
        availableCanvasKinds.find((registration) => registration.kind === kind) ?? null;
      if (nextCanvasKind != null) {
        setReplacementCanvasKind(nextCanvasKind);
      }
    },
    onCancelReplacement: closeReplacementDialog,
    onConfirmReplacement: confirmReplacement,
  };
}
