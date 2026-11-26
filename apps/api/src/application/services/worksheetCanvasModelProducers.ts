/** Verify native and file-owned Model publications through their existing authorities. */
import type {
  WorksheetCanvasModelObservation,
  WorksheetCanvasModelRequest,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { renderPostgresAst } from '@dvt/postgres-projection';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';
import type { DbtModelProducer } from '../ports/dbtModelProducer.js';

import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';
import { appendWorksheetFileModel } from './worksheetCanvasModelDraft.js';
import {
  assertWorksheetConnection,
  worksheetScope,
  type WorksheetInputDependencies,
  type WorksheetInputResolution as ModelResolution,
} from './worksheetCanvasModelInputs.js';

export type VerifiedWorksheetModel = Readonly<{
  nodeId: string;
  alias: string;
  sql: string;
  sqlName: string;
  fileRevision?: Readonly<{ contentSetSha256: string; analysisSha256: string }>;
}>;
type NativeObservation = Extract<WorksheetCanvasModelObservation, { kind: 'native-model' }>;
type FileObservation = Extract<WorksheetCanvasModelObservation, { kind: 'dbt-model' }>;

async function canonicalFileModelSql(
  producer: DbtModelProducer,
  expectedSha256: string
): Promise<string> {
  const parsed = await parsePostgresTransformSqlStructure(
    await renderPostgresAst(producer.projection.ast)
  );
  if (parsed.status !== 'valid') throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (sha256HexUtf8(parsed.canonicalSql) !== expectedSha256)
    throw new CanvasModelSqlUnavailableError('stale_context');
  return parsed.canonicalSql;
}

async function verifyNativeModel(
  observed: NativeObservation,
  draft: WorkspaceGraphAuthoringDraft,
  { deps, input, context }: ModelResolution
): Promise<VerifiedWorksheetModel> {
  if (observed.canvasId !== input.canvasId)
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  const node = draft.nodes.find((node) => node.id === observed.nodeId);
  if (node?.role !== 'transform') throw new CanvasModelSqlUnavailableError('model_unavailable');
  const actual = await deps.projection.execute(
    {
      canvasId: observed.canvasId,
      transformNodeId: observed.nodeId,
      semanticPlanSha256: observed.semanticPlanSha256,
    },
    context
  );
  const identity = {
    revision: actual.draftRevision,
    semantic: actual.closure.semanticDocument.semanticPlan.sha256,
    scope: actual.scope,
  };
  const expected = {
    revision: input.expectedRevision,
    semantic: observed.semanticPlanSha256,
    scope: worksheetScope(context),
  };
  if (jcsCanonicalize(identity) !== jcsCanonicalize(expected))
    throw new CanvasModelSqlUnavailableError('stale_context');
  assertWorksheetConnection(actual.closure.connectionRef, input.connectionRef);
  return { nodeId: node.id, alias: observed.alias, sql: actual.projection.sql, sqlName: node.name };
}

async function verifyFileModel(
  observed: FileObservation,
  addition: ReturnType<typeof appendWorksheetFileModel>,
  { deps, input, context }: ModelResolution
): Promise<VerifiedWorksheetModel> {
  const producer = (await deps.modelProducers.resolve([addition.node], context)).get(
    addition.node.id
  );
  if (!producer) throw new CanvasModelSqlUnavailableError('input_unavailable');
  const fileRevision = {
    contentSetSha256: observed.projectRevisionSha256,
    analysisSha256: observed.analysisSha256,
  };
  const actual = {
    contentSetSha256: producer.provenance.contentSetSha256,
    analysisSha256: producer.provenance.analysisSha256,
  };
  if (jcsCanonicalize(actual) !== jcsCanonicalize(fileRevision))
    throw new CanvasModelSqlUnavailableError('stale_context');
  assertWorksheetConnection(producer.connection, input.connectionRef);
  const sql = await canonicalFileModelSql(producer, observed.binding.sqlSha256);
  return {
    nodeId: addition.node.id,
    alias: observed.alias,
    sql,
    sqlName: addition.node.name,
    fileRevision,
  };
}

export async function verifyWorksheetModels(
  deps: WorksheetInputDependencies,
  input: WorksheetCanvasModelRequest,
  draft: WorkspaceGraphAuthoringDraft,
  context: AuthorizedExecutionContext
) {
  const models: VerifiedWorksheetModel[] = [],
    resolution = { deps, input, context };
  let candidate = draft;
  for (const observed of input.models) {
    if (observed.kind === 'native-model') {
      models.push(await verifyNativeModel(observed, candidate, resolution));
      continue;
    }
    const addition = appendWorksheetFileModel(candidate, observed.reference);
    candidate = addition.draft;
    models.push(await verifyFileModel(observed, addition, resolution));
  }
  return { models, draft: candidate };
}
