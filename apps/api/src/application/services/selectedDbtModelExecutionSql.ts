/** Project file-owned SQL through the existing authorized producer resolver, never a label or Jinja buffer. */
import {
  DbtSelectedModelExecutionSqlSchema,
  type DbtSelectedModelExecutionSqlSelection,
  type DbtSelectedModelExecutionSql,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { sha256HexUtf8, jcsCanonicalize } from '@dvt/crypto';
import { renderPostgresAst } from '@dvt/postgres-projection';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';
import {
  DbtModelProducerAccessDeniedError,
  type IDbtModelProducerResolver,
  type DbtModelProducer,
} from '../ports/dbtModelProducer.js';

import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';
import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import type {
  ResolveSelectedDbtModelAnalysisInput,
  ResolvedSelectedDbtModelAnalysis,
} from './selectedDbtModelAnalysisResolver.js';
import { createFileModelReadNode } from './selectedDbtModelReadNode.js';

export type SelectedDbtModelSqlDependencies = Readonly<{
  projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'projectValidatedAnalysis'>;
  producers: Pick<IDbtModelProducerResolver, 'resolve'>;
}>;
type Input = ResolveSelectedDbtModelAnalysisInput &
  Readonly<{ executionSql: DbtSelectedModelExecutionSqlSelection }>;

function assertSelectedSqlScope(input: Input, context: AuthorizedExecutionContext): void {
  const actual = {
    tenantId: context.scope.tenantId.value,
    projectId: context.scope.projectId?.value,
    environmentId: context.scope.environmentId?.value,
  };
  if (jcsCanonicalize(actual) !== jcsCanonicalize(input.scope))
    throw new DbtModelProducerAccessDeniedError();
}

async function canonicalFileModelSql(producer: DbtModelProducer): Promise<string> {
  const parsed = await parsePostgresTransformSqlStructure(
    await renderPostgresAst(producer.projection.ast)
  );
  if (parsed.status !== 'valid') throw new CanvasModelSqlUnavailableError('invalid_model');
  return parsed.canonicalSql;
}

export async function projectSelectedDbtModelExecutionSql(
  deps: SelectedDbtModelSqlDependencies,
  input: Input,
  resolved: ResolvedSelectedDbtModelAnalysis,
  context: AuthorizedExecutionContext
): Promise<DbtSelectedModelExecutionSql> {
  assertSelectedSqlScope(input, context);
  if (resolved.selectedAnalysis.status !== 'ready')
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  const expected =
    input.executionSql.expectedProjectRevision ??
    resolved.nativeAnalysis.projectRevision.contentSetSha256;
  assertProjectRevision(resolved.nativeAnalysis.projectRevision.contentSetSha256, expected);
  const projection = await deps.projectGraph.projectValidatedAnalysis(
    { scope: input.scope, canvasId: input.canvasId },
    { scope: input.scope, analysis: resolved.nativeAnalysis }
  );
  assertProjectRevision(projection.projectRevision.contentSetSha256, expected);
  const node = createFileModelReadNode(projection, input.selectedUniqueId);
  const producer = await resolveSelectedProducer(deps, { node, context, input, expected });
  const sql = await canonicalFileModelSql(producer);
  return createSelectedSqlReceipt({ node, producer, sql });
}

function assertProjectRevision(actual: string, expected: string): void {
  if (actual !== expected) throw new CanvasModelSqlUnavailableError('stale_context');
}

async function resolveSelectedProducer(
  deps: SelectedDbtModelSqlDependencies,
  selection: Readonly<{
    node: WorkspaceGraphAuthoringNode;
    context: AuthorizedExecutionContext;
    input: Input;
    expected: string;
  }>
): Promise<DbtModelProducer> {
  const { node, context, input, expected } = selection;
  const producers = await deps.producers.resolve([node], context);
  const producer = producers.get(node.id);
  if (producer == null) throw new CanvasModelSqlUnavailableError('model_unavailable');
  const facts = [
    [producer.provenance.canvasId, input.canvasId],
    [producer.provenance.uniqueId, input.selectedUniqueId],
    [producer.provenance.contentSetSha256, expected],
  ];
  if (facts.some(([actual, captured]) => actual !== captured))
    throw new CanvasModelSqlUnavailableError('stale_context');
  return producer;
}

function createSelectedSqlReceipt({
  node,
  producer,
  sql,
}: Readonly<{
  node: WorkspaceGraphAuthoringNode;
  producer: DbtModelProducer;
  sql: string;
}>): DbtSelectedModelExecutionSql {
  const receipt = DbtSelectedModelExecutionSqlSchema.safeParse({
    schemaVersion: 'dbt-selected-model-execution-sql.v1',
    reference: node.metadata?.dbtModelReference,
    projectRevisionSha256: producer.provenance.contentSetSha256,
    analysisSha256: producer.provenance.analysisSha256,
    sqlSha256: sha256HexUtf8(sql),
    sql,
  });
  if (!receipt.success) throw new CanvasModelSqlUnavailableError('input_unavailable');
  return receipt.data;
}
