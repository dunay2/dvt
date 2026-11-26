/** File-authoritative publication of a worksheet query as a dbt model. */
import type { WorksheetDbtModelRequest, WorksheetDbtModelResult } from '@dvt/contracts';
import type { WorkspaceScope } from './sessionContext';

export interface IWorksheetDbtModelCommand {
  create(
    scope: WorkspaceScope,
    request: WorksheetDbtModelRequest
  ): Promise<WorksheetDbtModelResult>;
}
