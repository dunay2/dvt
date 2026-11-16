/**
 * Owned concern: admit a derived SQL presentation using current authorized native evidence.
 * Reason: inspection must not change shared projection, publication bytes or execution semantics.
 * Corner cases: denied/incomplete evidence and whole-candidate barriers retain the original.
 */
import type {
  ConnectionRef,
  TransformSqlPresentation,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import {
  renderPostgresAst,
  simplifyPostgresSqlAst,
  type PostgresAstNode,
} from '@dvt/postgres-projection';

import { AUTHORIZATION_ACTION } from '../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import type { IPostgresSqlPresentationEvidenceReader } from '../ports/postgresSqlPresentationEvidence.js';
import {
  WarehouseConnectionNotFoundError,
  type IWarehouseConnectionCatalog,
} from '../ports/warehouseSourceImport.js';

import { admitPostgresSqlPresentationViews } from './admitPostgresSqlPresentationViews.js';
import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import { collectPostgresSqlPresentationRelations } from './collectPostgresSqlPresentationRelations.js';
import type { ValidatePostgresTransformSqlUseCase } from './validatePostgresTransformSqlUseCase.js';

export class ProjectCanvasSqlPresentation {
  constructor(
    private readonly deps: Readonly<{
      authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
      catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
      reader: IPostgresSqlPresentationEvidenceReader;
      validator: Pick<ValidatePostgresTransformSqlUseCase, 'execute'>;
    }>
  ) {}

  async execute(
    input: Readonly<{
      scope: WorkspaceGraphDraftScope;
      connectionRef: ConnectionRef;
      ast: PostgresAstNode;
      sql: string;
    }>,
    context: AuthorizedExecutionContext
  ): Promise<TransformSqlPresentation> {
    const permission = await this.deps.authorizer.authorize(
      context.principal,
      { ...context.scope, action: AUTHORIZATION_ACTION.workspaceSourceImportView },
      context.requestId
    );
    if (
      !permission.ok ||
      permission.context.scope.tenantId.value !== input.scope.tenantId ||
      permission.context.scope.projectId?.value !== input.scope.projectId ||
      permission.context.scope.environmentId?.value !== input.scope.environmentId
    )
      return retained('metadata_permission_denied');
    const relations = collectPostgresSqlPresentationRelations(input.ast);
    if (relations === null) return retained('relation_resolution_unavailable');
    if (input.connectionRef.provider !== 'postgres') return retained('metadata_unavailable');
    let connection;
    try {
      connection = await this.deps.catalog.getConnection(
        input.scope,
        input.connectionRef.connectionId
      );
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError)
        return retained('metadata_unavailable');
      throw error;
    }
    if (
      connection.id !== input.connectionRef.connectionId ||
      connection.type !== 'postgres' ||
      !connection.credentialRef
    )
      return retained('metadata_unavailable');
    const evidence = await this.deps.reader.read({
      credentialRef: connection.credentialRef,
      database: connection.database,
      relations,
    });
    if (evidence === null) return retained('metadata_unavailable');
    if (!(await admitPostgresSqlPresentationViews(evidence))) return retained('unsupported_shape');
    let result;
    try {
      result = simplifyPostgresSqlAst(input.ast, evidence);
    } catch (error) {
      if (error instanceof RangeError) return retained('resolution_limit');
      throw error;
    }
    if (result.retained !== undefined) return retained(result.retained.code, result.retained.path);
    const validation = await this.deps.validator.execute({
      scope: input.scope,
      connectionRef: input.connectionRef,
      sql: input.sql,
    });
    if (validation.status !== 'valid') return retained('native_validation_failed');
    return result.steps.length === 0
      ? { status: 'unchanged', sql: input.sql, steps: [] }
      : { status: 'rewritten', sql: await renderPostgresAst(result.ast), steps: [...result.steps] };
  }
}

function retained(code: string, path = '$'): TransformSqlPresentation {
  return { status: 'retained', diagnostic: { code, path } };
}
