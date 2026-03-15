import type { IRunStateStore } from '@dvt/contracts';
import type { EngineRunRef, IProviderAdapter } from '@dvt/engine';

import type { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';

export interface ProtectedRuntimeModule {
  facade: StartRunAuthorizedFacade;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  stateStore: IRunStateStore;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}
