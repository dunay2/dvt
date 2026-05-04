/**
 * Owned concern: build protected runtime route dependencies from the runtime
 * module without registering HTTP routes.
 */
import type { IObservability } from '@dvt/observability';

import { CancelRunUseCase } from '../../application/services/cancelRunUseCase.js';
import { CompilePlanUseCase } from '../../application/services/CompilePlanUseCase.js';
import { GetRunEventsUseCase } from '../../application/services/getRunEventsUseCase.js';
import { GetRunStatusUseCase } from '../../application/services/getRunStatusUseCase.js';
import { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';
import { ListRunsUseCase } from '../../application/services/listRunsUseCase.js';
import { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';
import { RecoverRunUseCase } from '../../application/services/recoverRunUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../application/services/resolveAuthorizedExecutableSubgraph.js';
import { SignalRunUseCase } from '../../application/services/signalRunUseCase.js';
import { ObservabilityRunStatusStalenessTelemetry } from '../../infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.js';
import { ObservabilityWorkspaceGraphDraftTelemetry } from '../../infrastructure/telemetry/ObservabilityWorkspaceGraphDraftTelemetry.js';
import { SafeRunSnapshotStalenessReader } from '../../infrastructure/telemetry/SafeRunSnapshotStalenessReader.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';

export type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export type BuildProtectedRuntimeRouteDependenciesOptions = {
  readonly observability: IObservability;
  readonly protectedModule: ProtectedRuntimeModule;
};

export type ProtectedRuntimeRouteDependencies = ReturnType<
  typeof buildProtectedRuntimeRouteDependencies
>;

export function buildProtectedRuntimeRouteDependencies(
  options: BuildProtectedRuntimeRouteDependenciesOptions
) {
  const { observability, protectedModule } = options;
  const runtimeAuth = {
    authenticator: protectedModule.authenticator,
    authorizer: protectedModule.authorizer,
  };
  const getRunStatusUseCase = new GetRunStatusUseCase(
    protectedModule.engine,
    protectedModule.runEnrichmentService,
    protectedModule.stateStore.read,
    new SafeRunSnapshotStalenessReader(protectedModule.stateStore.snapshotStaleness, observability),
    new ObservabilityRunStatusStalenessTelemetry({ observability }),
    protectedModule.planStore as unknown as ConstructorParameters<typeof GetRunStatusUseCase>[5]
  );
  const previewPlanUseCase = new PreviewPlanUseCase({
    planner: protectedModule.planner,
    planStore: protectedModule.planStore,
    planValidator: protectedModule.planValidator,
    executableSubgraphResolver: new ResolveAuthorizedExecutableSubgraphService({
      planner: protectedModule.planner,
      workspaceGraphDraftStore: protectedModule.workspaceGraphDraftStore,
    }),
  });

  return {
    cancelRunUseCase: new CancelRunUseCase(protectedModule.engine, protectedModule.stateStore.read),
    compilePlanUseCase: new CompilePlanUseCase({ planner: protectedModule.planCompilePlanner }),
    getRunEventsUseCase: new GetRunEventsUseCase(protectedModule.stateStore.read),
    getRunStatusUseCase,
    importPlanUseCase: new ImportPlanUseCase({
      planResolver: protectedModule.executablePlanResolver,
    }),
    listRunsUseCase: new ListRunsUseCase(protectedModule.stateStore.read),
    previewPlanUseCase,
    recoverRunUseCase: new RecoverRunUseCase(
      protectedModule.engine,
      protectedModule.stateStore.read
    ),
    runtimeAuth,
    signalRunUseCase: new SignalRunUseCase(protectedModule.engine, protectedModule.stateStore.read),
    workspaceGraphDraftTelemetry: new ObservabilityWorkspaceGraphDraftTelemetry({ observability }),
  };
}
