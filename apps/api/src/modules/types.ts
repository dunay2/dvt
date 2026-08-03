import type {
  IPlanStoreReader,
  IStoredPlanArtifactStore,
  IStoredPlanRefReader,
} from '@dvt/artifacts';
import type { ExecutionPlan, IPlanner, PlanRef } from '@dvt/contracts';
import type {
  EngineRunRef,
  IPlanIntegrityValidator,
  IProviderAdapter,
  IRunEnrichmentService,
  IRunHealthService,
  IStartRunIntentQueryStore,
  IWorkflowEngine,
} from '@dvt/engine';
import type { IRunExecutionContextBindingPolicy } from '@dvt/engine';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { IAuthenticator } from '../application/ports/auth.js';
import type { ICanvasAuthoringAuthorityStore } from '../application/ports/canvasAuthoringAuthority.js';
import type { IStartRunTargetAdapterRegistry } from '../application/ports/IStartRunTargetAdapterRegistry.js';
import type { IRunControlCommandCoordinator } from '../application/ports/runControlCommandCoordinator.js';
import type { IRunExecutionContextInheritanceWriter } from '../application/ports/runExecutionContextInheritanceWriter.js';
import type { IRunExecutionContextReferenceReader } from '../application/ports/runExecutionContextReferenceReader.js';
import type { IWorkspaceContextQuery } from '../application/ports/workspaceContext.js';
import type { IWorkspaceGraphDraftStore } from '../application/ports/workspaceGraphDraft.js';
import type { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import type { AuthorizeWorkspaceGraphDraftCapabilityService } from '../application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import type { CanvasAuthoringAuthorityPolicy } from '../application/services/canvasAuthoringAuthorityPolicy.js';
import type { CreateProjectUseCase } from '../application/services/createProjectUseCase.js';
import type { GetWorkspaceGraphDraftUseCase } from '../application/services/getWorkspaceGraphDraftUseCase.js';
import type { ListProjectsUseCase } from '../application/services/listProjectsUseCase.js';
import type { ListWorkspacePluginsUseCase } from '../application/services/listWorkspacePluginsUseCase.js';
import type { SaveWorkspaceGraphDraftUseCase } from '../application/services/saveWorkspaceGraphDraftUseCase.js';
import type { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';

import type { DbtProjectImportRuntime } from './dbtProjectImport/buildDbtProjectImportRuntime.js';
import type { StateStoreRoleBindings } from './stateStoreRoles.js';

export interface ProtectedRuntimeModule {
  facade: StartRunAuthorizedFacade;
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  workspaceContextQuery: IWorkspaceContextQuery;
  listProjectsUseCase: ListProjectsUseCase;
  createProjectUseCase: CreateProjectUseCase;
  listWorkspacePluginsUseCase: ListWorkspacePluginsUseCase;
  engine: IWorkflowEngine;
  planIntegrityValidator: IPlanIntegrityValidator;
  runEnrichmentService: IRunEnrichmentService;
  runHealthService: IRunHealthService;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  startRunTargetAdapterRegistry: IStartRunTargetAdapterRegistry;
  stateStore: StateStoreRoleBindings;
  startRunIntentStore: IStartRunIntentQueryStore;
  planner: IPlanner;
  planCompilePlanner: IPlanner;
  planStore: IStoredPlanArtifactStore & IStoredPlanRefReader & IPlanStoreReader;
  runExecutionContextReferenceReader: IRunExecutionContextReferenceReader;
  runExecutionContextInheritanceWriter: IRunExecutionContextInheritanceWriter;
  runControlCommandCoordinator: IRunControlCommandCoordinator;
  runExecutionContextBindingPolicy: IRunExecutionContextBindingPolicy;
  planValidator: IPlanExecutabilityValidator;
  executablePlanResolver: {
    fetch(input: {
      tenantId: string;
      projectId: string;
      environmentId: string;
      planRef: PlanRef;
    }): Promise<ExecutionPlan>;
  };
  workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
  canvasAuthoringAuthorityStore: ICanvasAuthoringAuthorityStore;
  canvasAuthoringAuthorityPolicy: CanvasAuthoringAuthorityPolicy;
  dbtProjectImport: DbtProjectImportRuntime;
  workspaceFilesRoot: string;
  workspaceGraphDraftCapabilityService: AuthorizeWorkspaceGraphDraftCapabilityService;
  getWorkspaceGraphDraftUseCase: GetWorkspaceGraphDraftUseCase;
  saveWorkspaceGraphDraftUseCase: SaveWorkspaceGraphDraftUseCase;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
