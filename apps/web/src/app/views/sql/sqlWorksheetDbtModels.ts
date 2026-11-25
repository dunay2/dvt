/** Materialize file-owned Models through the existing authorized selected-analysis query. */
import {
  readWorkspaceDbtModelReference,
  DbtSelectedModelExecutionSqlSelectionSchema,
  type DbtSelectedModelExecutionSql,
  type DbtSelectedModelAnalysis,
  type WorkspaceDbtModelReference,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import type { CanonicalNode } from '../../types/canonical';
import type { SqlWorksheetConnection, SqlWorksheetInsertion } from './sqlWorksheet.types';
import { quoteSqlWorksheetIdentifier } from './sqlWorksheetInsertions';

type DbtInsertion = Extract<SqlWorksheetInsertion, { kind: 'dbt-model' }>;
type FileModelSqlTarget = Readonly<{
  reference: WorkspaceDbtModelReference;
  connection: SqlWorksheetConnection;
  catalogueRevision: string | undefined;
}>;

function assertDbtSqlReceipt(
  receipt: DbtSelectedModelExecutionSql,
  target: FileModelSqlTarget & { revision: string }
): void {
  const facts = [
    [receipt.reference.canvasId, target.reference.canvasId],
    [receipt.reference.uniqueId, target.reference.uniqueId],
    [receipt.reference.connectionRef.connectionId, target.connection.id],
    [receipt.reference.connectionRef.provider, target.connection.type],
    [receipt.projectRevisionSha256, target.revision],
    [receipt.sqlSha256, sha256HexUtf8(receipt.sql)],
  ];
  if (facts.some(([actual, expected]) => actual !== expected))
    throw new Error('The file Model SQL observation changed.');
}

function readFileModelSqlTarget(
  node: CanonicalNode,
  connection: SqlWorksheetConnection,
  catalogueRevision: string | undefined
): FileModelSqlTarget {
  const reference = readWorkspaceDbtModelReference(node);
  if (reference == null) throw new Error('A real file Model reference is required.');
  if (
    reference.connectionRef.connectionId !== connection.id ||
    reference.connectionRef.provider !== connection.type
  )
    throw new Error('The file Model uses another connection.');
  return { reference, connection, catalogueRevision };
}

function readFileModelSqlReceipt(
  analysis: DbtSelectedModelAnalysis,
  target: FileModelSqlTarget
): DbtSelectedModelExecutionSql {
  if (analysis.status !== 'ready') throw new Error('The file Model analysis is unavailable.');
  if (analysis.authorityBinding.authority.kind !== 'dbt-project-files')
    throw new Error('The file authority is unavailable.');
  const receipt = analysis.executionSql;
  if (receipt == null) throw new Error('The file Model SQL publication is unavailable.');
  assertDbtSqlReceipt(receipt, {
    ...target,
    revision: target.catalogueRevision ?? analysis.projectRevision.contentSetSha256,
  });
  return receipt;
}

export async function materializeSqlWorksheetDbtModel(
  node: CanonicalNode,
  connection: SqlWorksheetConnection,
  query: IDbtSelectedModelAnalysisQueryPort,
  catalogueRevision?: string
): Promise<DbtInsertion> {
  const target = readFileModelSqlTarget(node, connection, catalogueRevision);
  const selection = DbtSelectedModelExecutionSqlSelectionSchema.parse(
    catalogueRevision == null ? {} : { expectedProjectRevision: catalogueRevision }
  );
  const analysis = await query.analyzeSelectedModel(
    { canvasId: target.reference.canvasId },
    target.reference.uniqueId,
    selection
  );
  const receipt = readFileModelSqlReceipt(analysis, target);
  const alias = `model_${sha256HexUtf8(JSON.stringify(['dbt', target.reference.canvasId, target.reference.uniqueId])).slice(0, 16)}`;
  const sql = receipt.sql.trim().replace(/;$/u, '');
  return {
    kind: 'dbt-model',
    nodeId: node.id,
    reference: receipt.reference,
    connectionRef: receipt.reference.connectionRef,
    projectRevisionSha256: receipt.projectRevisionSha256,
    analysisSha256: receipt.analysisSha256,
    alias,
    fragment: `(\n${sql}\n) AS ${quoteSqlWorksheetIdentifier(alias)}`,
    binding: { kind: 'compiled', sqlSha256: receipt.sqlSha256 },
  };
}
