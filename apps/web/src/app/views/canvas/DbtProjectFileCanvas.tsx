/** Owned concern: compose the file-authoritative dbt Canvas query and presentation. */
import { useReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo } from 'react';

import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../../bootstrap/usePublishedRouteBootstrap';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { CANVAS_ROUTE_ID } from './canvasDraftPresentationStore';
import { DbtProjectFileCanvasView } from './DbtProjectFileCanvasView';
import { CanvasErrorStateView } from './CanvasStateViews';
import CanvasModalHost from './CanvasModalHost';
import { useDbtProjectFileCanvasController } from './useDbtProjectFileCanvasController';
import type { CanvasShellProps } from './canvasShell.types';

export function InvalidCanvasAuthority({ message }: Readonly<{ message: string }>): JSX.Element {
  const bootstrapPresentation = useMemo(
    () => createFailedRouteBootstrapPresentation(message),
    [message]
  );
  usePublishedRouteBootstrap(CANVAS_ROUTE_ID, bootstrapPresentation);

  return <CanvasErrorStateView title="Canvas authority unavailable" message={message} />;
}

export function DbtProjectFileCanvas({
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
  const controller = useDbtProjectFileCanvasController(authorityBinding);
  const bootstrapPresentation = useMemo(() => {
    if (controller.query.isPending) {
      return createPendingRouteBootstrapPresentation('Analyzing the scoped dbt project.');
    }

    if (controller.projectionErrorMessage != null) {
      return createErrorRouteBootstrapPresentation(controller.projectionErrorMessage);
    }

    const freshness = controller.query.data?.freshness;
    if (freshness === 'invalid' || freshness === 'unavailable') {
      return createFailedRouteBootstrapPresentation(
        'The dbt project remains file-authoritative, but its current analysis is unavailable.'
      );
    }

    return createCompleteRouteBootstrapPresentation(
      freshness === 'stale-last-valid'
        ? 'The last valid file-authoritative dbt graph is ready with diagnostics.'
        : 'The file-authoritative dbt graph is ready.'
    );
  }, [
    controller.projectionErrorMessage,
    controller.query.data?.freshness,
    controller.query.isPending,
  ]);

  usePublishedRouteBootstrap(CANVAS_ROUTE_ID, bootstrapPresentation);

  return (
    <>
      <DbtProjectFileCanvasView
        controller={controller}
        screenToFlowPosition={(screenPosition) => reactFlow.screenToFlowPosition(screenPosition)}
        onDbtProjectImported={onDbtProjectImported}
        sourceImportInitialSelection={sourceImportInitialSelection}
        onSourceImportInitialSelectionConsumed={onSourceImportInitialSelectionConsumed}
      />
      <CanvasModalHost
        planPreview={{
          open: controller.execution.planModalOpen,
          plan: controller.currentPlan,
          outcome: controller.execution.latestPreviewOutcome,
          canStartRun: controller.execution.canStartRun,
          planStatusSummary: controller.execution.planStatusSummary,
          onClose: () => controller.execution.setPlanModalOpen(false),
          onStartRun: () => {
            void controller.execution.handleStartRun();
          },
        }}
      />
    </>
  );
}
