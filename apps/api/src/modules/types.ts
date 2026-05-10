import type { IStoredPlanArtifactStore } from '@dvt/artifacts';
import type { ExecutionPlan, IPlanner, PlanRef } from '@dvt/contracts';
import type {
  EngineRunRef,
  IProviderAdapter,
  IRunEnrichmentService,
  IRunHealthService,
  IWorkflowEngine,
} from '@dvt/engine';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { IAuthenticator } from '../application/ports/auth.js';
import type { IStartRunTargetAdapterRegistry } from '../application/ports/IStartRunTargetAdapterRegistry.js';
import type { IWorkspaceContextQuery } from '../application/ports/workspaceContext.js';
import type { IWorkspaceGraphDraftStore } from '../application/ports/workspaceGraphDraft.js';
import type { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import type { AuthorizeWorkspaceGraphDraftCapabilityService } from '../application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import type { GetWorkspaceGraphDraftUseCase } from '../application/services/getWorkspaceGraphDraftUseCase.js';
import type { SaveWorkspaceGraphDraftUseCase } from '../application/services/saveWorkspaceGraphDraftUseCase.js';
import type { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';

import type { StateStoreRoleBindings } from './stateStoreRoles.js';

export interface ProtectedRuntimeModule {
  facade: StartRunAuthorizedFacade;
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  workspaceContextQuery: IWorkspaceContextQuery;
  engine: IWorkflowEngine;
  runEnrichmentService: IRunEnrichmentService;
  runHealthService: IRunHealthService;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  startRunTargetAdapterRegistry: IStartRunTargetAdapterRegistry;
  stateStore: StateStoreRoleBindings;
  planner: IPlanner;
  planCompilePlanner: IPlanner;
  planStore: IStoredPlanArtifactStore;
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
  workspaceGraphDraftCapabilityService: AuthorizeWorkspaceGraphDraftCapabilityService;
  getWorkspaceGraphDraftUseCase: GetWorkspaceGraphDraftUseCase;
  saveWorkspaceGraphDraftUseCase: SaveWorkspaceGraphDraftUseCase;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
