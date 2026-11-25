/** Read a complete proposal; write through the existing graph authoring port only. */
import type { WorksheetCanvasModelProposal, WorksheetCanvasModelRequest } from '@dvt/contracts';
export type WorksheetCanvasModelFailure = 'stale' | 'denied' | 'unavailable' | 'contract';
export class WorksheetCanvasModelQueryError extends Error {
  constructor(readonly reason: WorksheetCanvasModelFailure) {
    super(`Canvas Model proposal failed: ${reason}`);
    this.name = 'WorksheetCanvasModelQueryError';
  }
}
export interface IWorksheetCanvasModelQueryPort {
  propose(
    input: WorksheetCanvasModelRequest,
    signal?: AbortSignal
  ): Promise<WorksheetCanvasModelProposal>;
}
