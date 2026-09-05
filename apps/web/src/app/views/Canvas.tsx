/**
 * Owned concern: route composition for the governed Canvas shell.
 */
import { ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { DbtProjectImportResult, DbtProjectSourceTableDeclaration } from '@dvt/contracts';

import CanvasModalHost from './canvas/CanvasModalHost';
import CanvasShell from './canvas/CanvasShell';
import { CanvasInvalidAuthorityState } from './canvas/CanvasInvalidAuthorityState';
import type { CanvasModalHostProps } from './canvas/canvasModalHost.types';
import { buildCanvasModalHostProps } from './canvas/canvasModalHostPropsBuilder';
import { deriveCanvasRouteViewState } from './canvas/canvasRouteViewState';
import { buildCanvasShellProps } from './canvas/canvasShellPropsBuilder';
import {
  buildDbtProjectFileCanvasPath,
  resolveCanvasRouteAuthority,
} from './canvas/canvasRouteAuthority';
import { useCanvasRoutePresentationSync } from './canvas/useCanvasRoutePresentationSync';
import { useCanvasController } from './canvas/useCanvasController';
import {
  useRunsService,
  useWarehouseSourceDataSampleQueryPort,
  useWarehouseSourceImportPort,
} from '../services/AppServicesContext';
import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import type { CanvasShellProps } from './canvas/canvasShell.types';
import { useCanvasRunControlSurface } from './canvas/useCanvasRunControlSurface';
import {
  resolveDbtSourceImportContinuation,
  useCanvasDbtSourceImportContinuationStore,
} from './canvas/canvasDbtSourceImportContinuationStore';
import { useDbtProjectFilesAuthoritySurface } from './canvas/useDbtProjectFilesAuthoritySurface';
import { useRunSnapshotQuery } from '../queries/runsQueries';

function CanvasRouteSurface({
  shellProps,
  modalHostProps,
}: Readonly<{
  shellProps: CanvasShellProps;
  modalHostProps: CanvasModalHostProps;
}>): JSX.Element {
  return (
    <>
      <CanvasShell {...shellProps} />
      <CanvasModalHost {...modalHostProps} />
    </>
  );
}

function GraphDraftAuthorityContent({
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

  const shellProps: CanvasShellProps = {
    ...buildCanvasShellProps({
      controller,
      routeViewState,
      runControls,
    }),
    warehouseSourceImport,
    warehouseSourceDataSampleQuery,
    runSnapshot: runSnapshotQuery.data ?? null,
    runMaterializationSampleQuery: runsService.getRunMaterializationSample,
    canvasContextScreenToFlowPosition: (screenPosition) =>
      reactFlow.screenToFlowPosition(screenPosition),
    onDbtProjectImported,
  };

  return (
    <CanvasRouteSurface
      shellProps={shellProps}
      modalHostProps={buildCanvasModalHostProps(controller)}
    />
  );
}

function DbtProjectFilesAuthorityContent({
  authorityBinding,
  onDbtProjectImported,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
}: Readonly<{
  authorityBinding: DbtProjectFilesAuthorityBinding;
  onDbtProjectImported: NonNullable<CanvasShellProps['onDbtProjectImported']>;
  sourceImportInitialSelection?: CanvasShellProps['sourceImportInitialSelection'];
  onSourceImportInitialSelectionConsumed?: CanvasShellProps['onSourceImportInitialSelectionConsumed'];
}>): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const surface = useDbtProjectFilesAuthoritySurface({
    authorityBinding,
    onDbtProjectImported,
    screenToFlowPosition: (screenPosition) => reactFlow.screenToFlowPosition(screenPosition),
    sourceImportInitialSelection,
    onSourceImportInitialSelectionConsumed,
  });

  return <CanvasRouteSurface {...surface} />;
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
        <GraphDraftAuthorityContent
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
        <DbtProjectFilesAuthorityContent
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
      return <CanvasInvalidAuthorityState message={authorityResolution.message} />;
  }
}

export default function Canvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}
