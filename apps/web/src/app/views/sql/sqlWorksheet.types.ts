/** Presentation contracts shared by the independent worksheet and explicit conversion. */
import type { ConnectionRef, WorkspaceDbtModelReference } from '@dvt/contracts';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { WarehouseConnection } from '../../ports/workspace';
import type { CanvasAuthoringDraftRecord } from '../canvas/canvasDraftReadModel';

export type SqlWorksheetConnection = WarehouseConnection;
export type SqlWorksheetDraftRecord = CanvasAuthoringDraftRecord;

export const SQL_WORKSHEET_REFERENCE_MIME = 'application/x-dvt-sql-reference';
export type SqlWorksheetDragReference = Readonly<{
  scopeKey: string;
  kind: 'table' | 'node';
  id: string;
}>;

/** Provenance is a UI observation; conversion must revalidate current authority. */
export type SqlWorksheetInsertion =
  | Readonly<{
      kind: 'dbt-model';
      connectionRef: ConnectionRef;
      nodeId: string;
      reference: WorkspaceDbtModelReference;
      projectRevisionSha256: string;
      analysisSha256: string;
      alias: string;
      fragment: string;
      binding: Readonly<{ kind: 'compiled'; sqlSha256: string }>;
    }>
  | Readonly<{
      kind: 'table';
      connectionRef: ConnectionRef;
      schema: string;
      name: string;
      fragment: string;
    }>
  | Readonly<{
      kind: 'model';
      connectionRef: ConnectionRef;
      canvasId: string;
      nodeId: string;
      semanticPlanSha256: string;
      alias: string;
      fragment: string;
    }>;

export type SqlWorksheetConversionProps = Readonly<{
  sql: string;
  connection: SqlWorksheetConnection | null;
  record: SqlWorksheetDraftRecord | null;
  scope: WorkspaceScope;
  insertions: readonly SqlWorksheetInsertion[];
}>;
