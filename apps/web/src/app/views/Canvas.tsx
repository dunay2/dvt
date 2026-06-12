/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider } from '@xyflow/react';
import { Navigate, useParams } from 'react-router';

import CanvasModalHost from './canvas/CanvasModalHost';
import CanvasShell from './canvas/CanvasShell';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';
import { useWarehouseSourceImportPort } from '../services/AppServicesContext';

function CanvasContent(): JSX.Element {
  const params = useParams();
  const warehouseSourceImport = useWarehouseSourceImportPort();
  const controller = useCanvasController();
  const routeViewState = deriveCanvasRouteViewState(controller);
  const { presentationState } = routeViewState;

  useCanvasRoutePresentationSync(presentationState);

  const shellProps = buildCanvasShellProps({
    controller,
    routeViewState,
  });
  const modalHostProps = buildCanvasModalHostProps(controller);

  if (params.workbenchTab != null && params.workbenchTab.trim() !== '') {
    return <Navigate to="/canvas" replace />;
  }

  return (
    <>
      <CanvasShell {...shellProps} warehouseSourceImport={warehouseSourceImport} />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

export default function Canvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
