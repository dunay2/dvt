/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { DbtProjectImportResult, DbtProjectSourceTableDeclaration } from '@dvt/contracts';

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
import {
  useShellFeedback,
  useRunsService,
  useWarehouseSourceDataSampleQueryPort,
  useWarehouseSourceImportPort,
} from '../services/AppServicesContext';
import {
  removeCanvasRouteIntent,
  resolveCanvasRouteIntent,
  type CanvasUnavailableLegacySurfaceId,
} from './canvas/canvasLegacyRouteIntent';
import { resolveCanvasViewCopy } from './canvas/canvasCopyCatalog';
import type { CanvasShellProps, CanvasShellRouteIntentRequest } from './canvas/canvasShell.types';
import { useCanvasRunControlSurface } from './canvas/useCanvasRunControlSurface';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import {
  resolveDbtSourceImportContinuation,
  useCanvasDbtSourceImportContinuationStore,
} from './canvas/canvasDbtSourceImportContinuationStore';
import { useRunSnapshotQuery } from '../queries/runsQueries';

function GraphDraftCanvasContent({
  onDbtProjectImported,
  routeIntentRequest,
  referencedRunId,
}: Readonly<{
  onDbtProjectImported: NonNullable<CanvasShellProps['onDbtProjectImported']>;
  routeIntentRequest?: CanvasShellRouteIntentRequest;
  referencedRunId?: string;
}>): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const warehouseSourceImport = useWarehouseSourceImportPort();
  const warehouseSourceDataSampleQuery = useWarehouseSourceDataSampleQueryPort();
  const runsService = useRunsService();
  const controller = useCanvasController();
  const effectiveRunId = referencedRunId ?? controller.activeRunId ?? undefined;
  const runSnapshotQuery = useRunSnapshotQuery(controller.workspaceLayoutKey, effectiveRunId);
  const runControls = useCanvasRunControlSurface(
    controller.workspaceLayoutKey,
    effectiveRunId ?? null
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
        warehouseSourceDataSampleQuery={warehouseSourceDataSampleQuery}
        runSnapshot={runSnapshotQuery.data ?? null}
        runMaterializationSampleQuery={runsService.getRunMaterializationSample}
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
  const pendingSourceImport = useCanvasDbtSourceImportContinuationStore((state) => state.pending);
  const enqueueSourceImport = useCanvasDbtSourceImportContinuationStore((state) => state.enqueue);
  const consumeSourceImport = useCanvasDbtSourceImportContinuationStore((state) => state.consume);
  const authorityResolution = useMemo(
    () => resolveCanvasRouteAuthority(searchParams),
    [searchParams]
  );
  const onDbtProjectImported = useCallback(
    (
      result: DbtProjectImportResult,
      sourceTableDeclarations: readonly DbtProjectSourceTableDeclaration[]
    ) => {
      if (result.authorityBinding.authority.kind === 'dbt-project-files') {
        enqueueSourceImport(
          {
            ...result.authorityBinding,
            authority: result.authorityBinding.authority,
          },
          sourceTableDeclarations
        );
      }
      void navigate(buildDbtProjectFileCanvasPath(result.authorityBinding));
    },
    [enqueueSourceImport, navigate]
  );
  const routeIntent = useMemo(() => resolveCanvasRouteIntent(searchParams), [searchParams]);
  const referencedRunId = searchParams.get('runId')?.trim() || undefined;
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
          referencedRunId={referencedRunId}
        />
      );
    case 'dbt-project-files': {
      const sourceImportInitialSelection = resolveDbtSourceImportContinuation(
        pendingSourceImport,
        authorityResolution.binding
      );
      return (
        <DbtProjectFileCanvas
          authorityBinding={authorityResolution.binding}
          onDbtProjectImported={onDbtProjectImported}
          sourceImportInitialSelection={sourceImportInitialSelection}
          onSourceImportInitialSelectionConsumed={() =>
            consumeSourceImport(authorityResolution.binding)
          }
          routeIntentRequest={routeIntentRequest}
        />
      );
    }
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
