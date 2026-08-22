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
  useRunsService,
  useWarehouseSourceDataSampleQueryPort,
  useWarehouseSourceImportPort,
} from '../services/AppServicesContext';
import type { CanvasShellProps } from './canvas/canvasShell.types';
import { useCanvasRunControlSurface } from './canvas/useCanvasRunControlSurface';
import {
  resolveDbtSourceImportContinuation,
  useCanvasDbtSourceImportContinuationStore,
} from './canvas/canvasDbtSourceImportContinuationStore';
import { useRunSnapshotQuery } from '../queries/runsQueries';

function GraphDraftCanvasContent({
  onDbtProjectImported,
  referencedRunId,
}: Readonly<{
  onDbtProjectImported: NonNullable<CanvasShellProps['onDbtProjectImported']>;
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
      />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

function CanvasContent(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const referencedRunId = searchParams.get('runId')?.trim() || undefined;

  switch (authorityResolution.kind) {
    case 'graph-draft':
      return (
        <GraphDraftCanvasContent
          onDbtProjectImported={onDbtProjectImported}
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
