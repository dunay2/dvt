/** Propose one complete canonical Model from SQL against the current authorized context. */
import {
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  encodeDvtSubstraitPlanV1,
  MODEL_SQL_MAX_LENGTH,
  ModelSqlCompilationResponseSchema,
  type ModelSqlCompilationRequest,
  type ModelSqlDiagnostic,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { compileModelSqlSource, ModelSqlSourceError } from '@dvt/postgres-projection';
import { deriveSubstraitSchemas, isSchemaTypeNullable } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlUnavailableError,
  type ICanvasModelSqlContextQuery,
} from '../ports/canvasModelSql.js';

import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';

export class CompileCanvasModelSqlQuery {
  public constructor(private readonly contextQuery: ICanvasModelSqlContextQuery) {}

  public async execute(input: ModelSqlCompilationRequest, context: AuthorizedExecutionContext) {
    return (await this.prepare(input, context)).response;
  }

  public async prepare(input: ModelSqlCompilationRequest, context: AuthorizedExecutionContext) {
    const prepared = await this.contextQuery.prepare(input, context);
    if (
      prepared.response.draftRevision !== input.draftRevision ||
      prepared.response.contextSha256 !== input.contextSha256
    )
      throw new CanvasModelSqlUnavailableError('stale_context');
    const identity = {
      schemaVersion: 'canvas-model-sql-compilation.v1' as const,
      canvasId: input.canvasId,
      transformNodeId: input.transformNodeId,
      draftRevision: input.draftRevision,
      contextSha256: input.contextSha256,
      sqlSha256: sha256HexUtf8(input.sql),
    };
    const invalid = (diagnostics: ModelSqlDiagnostic[]) => ({
      prepared,
      response: ModelSqlCompilationResponseSchema.parse({
        ...identity,
        status: 'invalid',
        diagnostics,
      }),
    });
    const parsed = await parsePostgresTransformSqlStructure(input.sql);
    if (parsed.status === 'invalid')
      return invalid(
        parsed.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          code: diagnostic.source === 'parser' ? 'syntax_error' : 'unsupported_sql',
          source: diagnostic.source === 'parser' ? 'parser' : 'semantic',
        }))
      );
    if (parsed.canonicalSql.length > MODEL_SQL_MAX_LENGTH)
      return invalid([
        {
          code: 'unsupported_sql',
          source: 'semantic',
          message: 'Normalized SQL exceeds the source buffer limit.',
        },
      ]);
    try {
      const proposal = compileModelSqlSource(parsed.ast, prepared.source);
      const { index, schemas } = deriveSubstraitSchemas(proposal.document);
      const schema = schemas.get(index.rootId)!;
      const fields = index.relations.get(index.rootId)!.fields;
      return {
        prepared,
        response: ModelSqlCompilationResponseSchema.parse({
          ...identity,
          status: 'valid',
          normalizedSql: parsed.canonicalSql,
          semanticDocument: {
            schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
            profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
            semanticPlan: encodeDvtSubstraitPlanV1(proposal.document.plan),
            sidecar: proposal.document.sidecar,
          },
          columns: schema.map((field, ordinal) => ({
            id: fields[ordinal]!.fieldId,
            name: fields[ordinal]!.displayName,
            dataType: field.type.kind.case ?? null,
            nullable: isSchemaTypeNullable(field.type),
          })),
          inputAdditions: proposal.inputAdditions,
          diagnostics: [],
        }),
      };
    } catch (error) {
      if (!(error instanceof ModelSqlSourceError)) throw error;
      const offset =
        error.byteOffset == null
          ? undefined
          : Buffer.from(input.sql).subarray(0, error.byteOffset).toString('utf8').length;
      return invalid([
        {
          code: error.code,
          source: 'binding',
          message: error.message,
          ...(offset == null
            ? {}
            : { startOffset: offset, endOffset: Math.min(offset + 1, input.sql.length) }),
        },
      ]);
    }
  }
}
