/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';

import CanvasModalHost from './canvas/CanvasModalHost';
import CanvasShell from './canvas/CanvasShell';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import { resolveCanvasRouteAuthority } from './canvas/canvasRouteAuthority';
import { DbtProjectFileCanvas, InvalidCanvasAuthority } from './canvas/DbtProjectFileCanvas';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';
import { useWarehouseSourceImportPort } from '../services/AppServicesContext';

function GraphDraftCanvasContent(): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
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

  return (
    <>
      <CanvasShell
        {...shellProps}
        warehouseSourceImport={warehouseSourceImport}
        canvasContextScreenToFlowPosition={(screenPosition) =>
          reactFlow.screenToFlowPosition(screenPosition)
        }
      />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

function CanvasContent(): JSX.Element {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const authorityResolution = useMemo(
    () => resolveCanvasRouteAuthority(searchParams),
    [searchParams]
  );

  if (params.workbenchTab != null && params.workbenchTab.trim() !== '') {
    return <Navigate to="/canvas" replace />;
  }

  switch (authorityResolution.kind) {
    case 'graph-draft':
      return <GraphDraftCanvasContent />;
    case 'dbt-project-files':
      return <DbtProjectFileCanvas authorityBinding={authorityResolution.binding} />;
    case 'invalid':
      return <InvalidCanvasAuthority message={authorityResolution.message} />;
  }
}

export default function Canvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
