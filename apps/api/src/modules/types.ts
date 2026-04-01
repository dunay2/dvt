import type { EngineRunRef, IProviderAdapter, IWorkflowEngine } from '@dvt/engine';

import type { IStartRunTargetAdapterRegistry } from '../application/ports/IStartRunTargetAdapterRegistry.js';
import type { IAuthenticator } from '../application/ports/auth.js';
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
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
