/** Complete read-only worksheet proposal; persistence remains SaveWorkspaceGraphDraft. */
import type { WorksheetCanvasModelProposal, WorksheetCanvasModelRequest } from '@dvt/contracts';

import type { AuthorizedExecutionContext } from './authContract.js';

export interface IWorksheetCanvasModelQuery {
  execute(
    input: WorksheetCanvasModelRequest,
    context: AuthorizedExecutionContext
  ): Promise<WorksheetCanvasModelProposal>;
}
