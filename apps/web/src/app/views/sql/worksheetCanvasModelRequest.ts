/** Capture retained worksheet observations as a strict revision-bound proposal request. */
import {
  WorksheetCanvasModelObservationSchema,
  WorksheetCanvasModelRequestSchema,
  type ValidWorksheetCanvasModelProposal,
  type WorksheetCanvasModelRequest,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';

export type WorksheetCanvasSnapshot = Readonly<{
  identity: string;
  request: WorksheetCanvasModelRequest;
  scope: SqlWorksheetConversionProps['scope'];
}>;
export type PreparedWorksheetCanvasProposal = Readonly<{
  identity: string;
  snapshot: WorksheetCanvasSnapshot;
  proposal: ValidWorksheetCanvasModelProposal;
}>;

function retainedModelObservations(props: SqlWorksheetConversionProps) {
  return props.insertions.flatMap((insertion) => {
    if (!props.sql.includes(insertion.fragment)) return [];
    if (insertion.kind === 'table') return [];
    if (insertion.kind === 'model')
      return WorksheetCanvasModelObservationSchema.parse({
        kind: 'native-model',
        canvasId: insertion.canvasId,
        nodeId: insertion.nodeId,
        semanticPlanSha256: insertion.semanticPlanSha256,
        alias: insertion.alias,
      });
    const fields = new Set([
      'kind',
      'reference',
      'projectRevisionSha256',
      'analysisSha256',
      'alias',
      'binding',
    ]);
    const observed = Object.fromEntries(
      Object.entries(insertion).filter(([key]) => fields.has(key))
    );
    return [WorksheetCanvasModelObservationSchema.parse(observed)];
  });
}

export function worksheetCanvasProposalSnapshot(
  props: SqlWorksheetConversionProps,
  name: string,
  modelId: string
): WorksheetCanvasSnapshot | null {
  if (!props.record) return null;
  if (props.connection?.type !== 'postgres') return null;
  if (!props.sql.trim()) return null;
  const canvasId = props.record.draft.activeCanvasId ?? props.record.draft.canvas.id;
  if (!canvasId) return null;
  const parsed = WorksheetCanvasModelRequestSchema.safeParse({
    schemaVersion: 'worksheet-canvas-model-request.v1',
    canvasId,
    expectedRevision: props.record.revision,
    modelId,
    name,
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: props.connection.id,
      provider: props.connection.type,
    },
    sql: props.sql,
    models: retainedModelObservations(props),
  });
  if (!parsed.success) return null;
  return {
    request: parsed.data,
    scope: props.scope,
    identity: jcsCanonicalize({ request: parsed.data, scope: props.scope }),
  };
}
