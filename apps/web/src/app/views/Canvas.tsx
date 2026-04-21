/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider } from '@xyflow/react';

import CanvasShell from './canvas/CanvasShell';
import CanvasModalHost from './canvas/CanvasModalHost';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';

function CanvasContent() {
  const controller = useCanvasController();
  const routeViewState = deriveCanvasRouteViewState(controller);
  const { presentationState } = routeViewState;

  useCanvasRoutePresentationSync(presentationState);

  const shellProps = buildCanvasShellProps({
    controller,
    routeViewState,
  });
  const modalHostProps = buildCanvasModalHostProps(controller);

  return (
    <>
      <CanvasShell {...shellProps} />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
