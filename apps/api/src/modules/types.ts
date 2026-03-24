import type {
  EngineRunRef,
  IProviderAdapter,
  IRunStateStoreMaintenance,
  IRunStateStoreRead,
  IRunStateStoreWrite,
  IWorkflowEngine,
} from '@dvt/engine';

import type { IAuthenticator } from '../application/ports/auth.js';
import type { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import type { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';

export interface ProtectedRuntimeModule {
  facade: StartRunAuthorizedFacade;
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  engine: IWorkflowEngine;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  stateStoreMaintenance: IRunStateStoreMaintenance;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
