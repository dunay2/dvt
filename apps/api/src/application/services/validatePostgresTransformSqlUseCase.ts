/** Owned concern: validate current transform SQL through one governed PostgreSQL readiness rail. */
import {
  POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE,
  type IPostgresTransformSqlSemanticValidator,
  type PostgresTransformSqlValidationResult,
  type ValidatePostgresTransformSqlInput,
} from '../ports/postgresTransformSqlValidation.js';
import {
  type IWarehouseConnectionCatalog,
  WarehouseConnectionNotFoundError,
} from '../ports/warehouseSourceImport.js';

import { validatePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';

export class ValidatePostgresTransformSqlUseCase {
  public constructor(
    private readonly deps: {
      catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
      semanticValidator: IPostgresTransformSqlSemanticValidator;
    }
  ) {}

  public async execute(
    input: ValidatePostgresTransformSqlInput
  ): Promise<PostgresTransformSqlValidationResult> {
    const structural = await validatePostgresTransformSqlStructure(input.sql);
    if (structural.status !== 'valid') {
      return structural;
    }

    if (input.connectionRef.provider !== 'postgres') {
      return connectionUnavailable('The selected connection is not PostgreSQL.');
    }

    let connection;
    try {
      connection = await this.deps.catalog.getConnection(
        input.scope,
        input.connectionRef.connectionId
      );
    } catch (error) {
      if (error instanceof WarehouseConnectionNotFoundError) {
        return connectionUnavailable('The governed PostgreSQL connection was not found.');
      }
      throw error;
    }

    if (connection.type !== 'postgres' || connection.credentialRef === undefined) {
      return connectionUnavailable('The governed PostgreSQL credential binding is unavailable.');
    }

    return this.deps.semanticValidator.validate({
      credentialRef: connection.credentialRef,
      sql: input.sql,
    });
  }
}

function connectionUnavailable(message: string): PostgresTransformSqlValidationResult {
  return {
    status: 'unavailable',
    diagnostics: [
      {
        code: POSTGRES_TRANSFORM_SQL_DIAGNOSTIC_CODE.connectionUnavailable,
        source: 'connection',
        message,
      },
    ],
  };
}
