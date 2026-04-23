/** Owned concern: render draft-transport failure states before Canvas workbench states. */
import { CanvasBlockedStateView, CanvasErrorStateView } from './CanvasStateViews';
import type { CanvasDraftTransportErrorState } from './canvasDraftTransportErrorState';

export function renderCanvasDraftTransportSurface(
  draftTransportError: CanvasDraftTransportErrorState | null
) {
  if (draftTransportError?.kind === 'forbidden') {
    return (
      <CanvasBlockedStateView
        title={draftTransportError.title}
        message={draftTransportError.message}
      />
    );
  }

  if (draftTransportError != null) {
    return (
      <CanvasErrorStateView
        title={draftTransportError.title}
        message={draftTransportError.message}
      />
    );
  }

  return null;
}
