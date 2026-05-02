import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

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
import type { Env } from '../../plugins/env.js';

import { registerAdminRoutes } from './adminRoutes.js';
import { cancelRunRoute } from './cancelRunRoute.js';
import { compilePlanRoute } from './compilePlanRoute.js';
import { getRunEventsRoute } from './getRunEventsRoute.js';
import { getRunRoute } from './getRunRoute.js';
import { importPlanRoute } from './importPlanRoute.js';
import { listRunsRoute } from './listRunsRoute.js';
import { previewPlanRoute } from './previewPlanRoute.js';
import { recoverRunRoute } from './recoverRunRoute.js';
import { PROTECTED_RUNTIME_ROUTE_SUMMARY, RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { signalRunRoute } from './signalRunRoute.js';
import { startRunRoute } from './startRunRoute.js';
import { registerWorkspaceGraphDraftRoutes } from './workspaceGraphDraftRoutes.js';

export type RegisterProtectedRuntimeRoutesOptions = {
  readonly env: Env;
  readonly observability: IObservability;
  readonly protectedModule: ProtectedRuntimeModule;
};

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

type ProtectedRuntimeRouteDependencies = ReturnType<typeof buildProtectedRuntimeRouteDependencies>;

export async function registerProtectedRuntimeRoutes(
  app: FastifyInstance,
  options: RegisterProtectedRuntimeRoutesOptions
): Promise<void> {
  const { env, observability, protectedModule } = options;
  const dependencies = buildProtectedRuntimeRouteDependencies(options);

  registerProtectedPlanRoutes(app, env, protectedModule, dependencies);
  registerProtectedWorkspaceGraphDraftRouteGroup(app, observability, protectedModule, dependencies);
  registerProtectedRunRoutes(app, env, protectedModule, dependencies);
  registerProtectedAdminRouteGroup(app, env, protectedModule, dependencies.runtimeAuth);

  app.log.info(`protected runtime routes registered: ${PROTECTED_RUNTIME_ROUTE_SUMMARY}`);
}

function buildProtectedRuntimeRouteDependencies(options: RegisterProtectedRuntimeRoutesOptions) {
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
  const listRunsUseCase = new ListRunsUseCase(protectedModule.stateStore.read);
  const getRunEventsUseCase = new GetRunEventsUseCase(protectedModule.stateStore.read);
  const compilePlanUseCase = new CompilePlanUseCase({
    planner: protectedModule.planCompilePlanner,
  });
  const previewPlanUseCase = new PreviewPlanUseCase({
    planner: protectedModule.planner,
    planStore: protectedModule.planStore,
    planValidator: protectedModule.planValidator,
    executableSubgraphResolver: new ResolveAuthorizedExecutableSubgraphService({
      planner: protectedModule.planner,
      workspaceGraphDraftStore: protectedModule.workspaceGraphDraftStore,
    }),
  });
  const importPlanUseCase = new ImportPlanUseCase({
    planResolver: protectedModule.executablePlanResolver,
  });
  const signalRunUseCase = new SignalRunUseCase(
    protectedModule.engine,
    protectedModule.stateStore.read
  );
  const cancelRunUseCase = new CancelRunUseCase(
    protectedModule.engine,
    protectedModule.stateStore.read
  );
  const recoverRunUseCase = new RecoverRunUseCase(
    protectedModule.engine,
    protectedModule.stateStore.read
  );
  const workspaceGraphDraftTelemetry = new ObservabilityWorkspaceGraphDraftTelemetry({
    observability,
  });

  return {
    cancelRunUseCase,
    compilePlanUseCase,
    getRunEventsUseCase,
    getRunStatusUseCase,
    importPlanUseCase,
    listRunsUseCase,
    previewPlanUseCase,
    recoverRunUseCase,
    runtimeAuth,
    signalRunUseCase,
    workspaceGraphDraftTelemetry,
  };
}

function registerProtectedPlanRoutes(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
    RUNTIME_ROUTE_PATH.start,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      startRunRoute(request as never, reply, protectedModule.facade, {
        adapterRegistry: protectedModule.startRunTargetAdapterRegistry,
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.plansPreview,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      previewPlanRoute(request as never, reply, {
        authenticator: protectedModule.authenticator,
        authorizer: protectedModule.authorizer,
        useCase: dependencies.previewPlanUseCase,
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.plansCompile,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      compilePlanRoute(request as never, reply, {
        authenticator: protectedModule.authenticator,
        authorizer: protectedModule.authorizer,
        useCase: dependencies.compilePlanUseCase,
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.plansImport,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      importPlanRoute(request as never, reply, {
        authenticator: protectedModule.authenticator,
        authorizer: protectedModule.authorizer,
        useCase: dependencies.importPlanUseCase,
      })
  );
}

function registerProtectedWorkspaceGraphDraftRouteGroup(
  app: FastifyInstance,
  observability: IObservability,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  registerWorkspaceGraphDraftRoutes(app, {
    capabilityService: protectedModule.workspaceGraphDraftCapabilityService,
    getUseCase: protectedModule.getWorkspaceGraphDraftUseCase,
    saveUseCase: protectedModule.saveWorkspaceGraphDraftUseCase,
    telemetry: dependencies.workspaceGraphDraftTelemetry,
    observability,
  });
}

function registerProtectedRunRoutes(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  const { runtimeAuth } = dependencies;

  app.get(
    RUNTIME_ROUTE_PATH.list,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      listRunsRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.listRunsUseCase,
      })
  );
  app.get(
    RUNTIME_ROUTE_PATH.get,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      getRunRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.getRunStatusUseCase,
      })
  );
  app.get(
    RUNTIME_ROUTE_PATH.events,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      getRunEventsRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.getRunEventsUseCase,
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.signal,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      signalRunRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.signalRunUseCase,
        compatibilityPolicy: { allowCancelSignalType: env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL },
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.cancel,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      cancelRunRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.cancelRunUseCase,
      })
  );
  app.post(
    RUNTIME_ROUTE_PATH.recover,
    {
      config: {
        rateLimit: {
          max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
          timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
    },
    async (request, reply) =>
      recoverRunRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.recoverRunUseCase,
      })
  );
}

function registerProtectedAdminRouteGroup(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  runtimeAuth: RuntimeAuth
): void {
  if (env.DVT_ADMIN_ROUTES_ENABLED) {
    registerAdminRoutes(app, protectedModule.stateStore.maintenance, runtimeAuth);
    app.log.warn('admin routes enabled: POST /admin/runs/:runId/rebuild-snapshot');
  }
}
