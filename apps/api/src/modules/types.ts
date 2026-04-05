import type {
  ExecutionPlan,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanRef,
} from '@dvt/contracts';
import type { EngineRunRef, IProviderAdapter, IWorkflowEngine } from '@dvt/engine';

import type { IAuthenticator } from '../application/ports/auth.js';
import type { IStartRunTargetAdapterRegistry } from '../application/ports/IStartRunTargetAdapterRegistry.js';
import type { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import type { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';

import type { StateStoreRoleBindings } from './stateStoreRoles.js';

export interface ProtectedRuntimeModule {
  facade: StartRunAuthorizedFacade;
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  engine: IWorkflowEngine;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  startRunTargetAdapterRegistry: IStartRunTargetAdapterRegistry;
  stateStore: StateStoreRoleBindings;
  planner: IPlanner;
  planStore: IPlanValidationLifecycleStore;
  executablePlanResolver: { fetch(planRef: PlanRef): Promise<ExecutionPlan> };
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
