/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { DbtProjectImportResult } from '@dvt/contracts';

import CanvasModalHost from './canvas/CanvasModalHost';
import CanvasShell from './canvas/CanvasShell';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import {
  buildDbtProjectFileCanvasPath,
  resolveCanvasRouteAuthority,
} from './canvas/canvasRouteAuthority';
import { DbtProjectFileCanvas, InvalidCanvasAuthority } from './canvas/DbtProjectFileCanvas';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';
import { useShellFeedback, useWarehouseSourceImportPort } from '../services/AppServicesContext';
import {
  removeCanvasRouteIntent,
  resolveCanvasRouteIntent,
  type CanvasUnavailableLegacySurfaceId,
} from './canvas/canvasLegacyRouteIntent';
import { resolveCanvasViewCopy } from './canvas/canvasCopyCatalog';
import type { CanvasShellRouteIntentRequest } from './canvas/canvasShell.types';
import { useCanvasRunControlSurface } from './canvas/useCanvasRunControlSurface';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

function GraphDraftCanvasContent({
  onDbtProjectImported,
  routeIntentRequest,
}: Readonly<{
  onDbtProjectImported: (result: DbtProjectImportResult) => void;
  routeIntentRequest?: CanvasShellRouteIntentRequest;
}>): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const warehouseSourceImport = useWarehouseSourceImportPort();
  const controller = useCanvasController();
  const runControls = useCanvasRunControlSurface(
    controller.workspaceLayoutKey,
    controller.activeRunId
  );
  const routeViewState = deriveCanvasRouteViewState(controller);
  const { presentationState } = routeViewState;

  useCanvasRoutePresentationSync(presentationState);

  const shellProps = buildCanvasShellProps({
    controller,
    routeViewState,
    runControls,
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
        onDbtProjectImported={onDbtProjectImported}
        routeIntentRequest={routeIntentRequest}
      />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

function CanvasContent(): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const feedback = useShellFeedback();
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const authorityResolution = useMemo(
    () => resolveCanvasRouteAuthority(searchParams),
    [searchParams]
  );
  const onDbtProjectImported = useCallback(
    (result: DbtProjectImportResult) => {
      void navigate(buildDbtProjectFileCanvasPath(result.authorityBinding));
    },
    [navigate]
  );
  const routeIntent = useMemo(() => resolveCanvasRouteIntent(searchParams), [searchParams]);
  const onUnavailableLegacySurface = useCallback(
    (surfaceId: CanvasUnavailableLegacySurfaceId) => {
      const message =
        surfaceId === 'diff'
          ? copy.retiredDiffSurfaceMessage
          : surfaceId === 'artifacts'
            ? copy.retiredArtifactsSurfaceMessage
            : copy.retiredUnknownSurfaceMessage;
      feedback.error(message);
    },
    [
      copy.retiredArtifactsSurfaceMessage,
      copy.retiredDiffSurfaceMessage,
      copy.retiredUnknownSurfaceMessage,
      feedback,
    ]
  );
  const onRouteIntentConsumed = useCallback(() => {
    setSearchParams(removeCanvasRouteIntent(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);
  const routeIntentRequest = useMemo<CanvasShellRouteIntentRequest | undefined>(
    () =>
      routeIntent == null
        ? undefined
        : {
            intent: routeIntent,
            onUnavailableLegacySurface,
            onConsumed: onRouteIntentConsumed,
          },
    [onRouteIntentConsumed, onUnavailableLegacySurface, routeIntent]
  );

  switch (authorityResolution.kind) {
    case 'graph-draft':
      return (
        <GraphDraftCanvasContent
          onDbtProjectImported={onDbtProjectImported}
          routeIntentRequest={routeIntentRequest}
        />
      );
    case 'dbt-project-files':
      return (
        <DbtProjectFileCanvas
          authorityBinding={authorityResolution.binding}
          onDbtProjectImported={onDbtProjectImported}
          routeIntentRequest={routeIntentRequest}
        />
      );
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
