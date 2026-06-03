import { canvasDraftSessionBaseline } from './canvasDraftSessionBaseline';
import { canvasDraftSessionMachine } from './canvasDraftSessionMachine';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';

export type {
  CanvasDraftBaseline,
  CanvasDraftEdge,
  CanvasDraftSession,
  CanvasDraftSyncState,
  CanvasDraftWorkingSet,
} from './canvasDraftSession.types';

// CanvasDraftSession is the public component API for draft aggregate concerns.
export const canvasDraftSession = {
  baseline: canvasDraftSessionBaseline,
  machine: canvasDraftSessionMachine,
  workingSet: canvasDraftSessionWorkingSet,
} as const;
