import { describe, expect, it, vi } from 'vitest';

import type {
  IPostgresTransformSqlSemanticValidator,
  ValidatePostgresTransformSqlInput,
} from '../../../src/application/ports/postgresTransformSqlValidation.js';
import type { IWarehouseConnectionCatalog } from '../../../src/application/ports/warehouseSourceImport.js';
import { ValidatePostgresTransformSqlUseCase } from '../../../src/application/services/validatePostgresTransformSqlUseCase.js';

const scope = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' };
const connectionRef = {
  schemaVersion: 'connection-ref.v1' as const,
  provider: 'postgres' as const,
  connectionId: 'warehouse-a',
};

function input(sql: string): ValidatePostgresTransformSqlInput {
  return { scope, connectionRef, sql };
}

function buildHarness(): {
  catalog: IWarehouseConnectionCatalog;
  semanticValidator: IPostgresTransformSqlSemanticValidator;
  useCase: ValidatePostgresTransformSqlUseCase;
} {
  const catalog = {
    getConnection: vi.fn().mockResolvedValue({
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres',
      database: 'dvt',
      credentialRef: 'postgres:warehouse-a',
      sourceObjects: [],
    }),
  } as unknown as IWarehouseConnectionCatalog;
  const semanticValidator = {
    validate: vi.fn().mockResolvedValue({ status: 'valid' }),
  } satisfies IPostgresTransformSqlSemanticValidator;
  return {
    catalog,
    semanticValidator,
    useCase: new ValidatePostgresTransformSqlUseCase({ catalog, semanticValidator }),
  };
}

describe('ValidatePostgresTransformSqlUseCase', () => {
  it('stops at structural policy failures before resolving credentials', async () => {
    const harness = buildHarness();

    await expect(harness.useCase.execute(input('select 1; select 2'))).resolves.toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'multiple_statements' }],
    });
    expect(harness.catalog.getConnection).not.toHaveBeenCalled();
    expect(harness.semanticValidator.validate).not.toHaveBeenCalled();
  });

  it('validates one SELECT through the governed connection credential reference', async () => {
    const harness = buildHarness();

    await expect(harness.useCase.execute(input('select * from public.source_1'))).resolves.toEqual({
      status: 'valid',
    });
    expect(harness.catalog.getConnection).toHaveBeenCalledWith(scope, 'warehouse-a');
    expect(harness.semanticValidator.validate).toHaveBeenCalledWith({
      credentialRef: 'postgres:warehouse-a',
      sql: ['SELECT *', 'FROM public.source_1'].join('\n'),
    });
  });

  it('reports unavailable when the governed connection has no credential binding', async () => {
    const harness = buildHarness();
    vi.mocked(harness.catalog.getConnection).mockResolvedValue({
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres',
      database: 'dvt',
      sourceObjects: [],
    });

    await expect(harness.useCase.execute(input('select 1'))).resolves.toMatchObject({
      status: 'unavailable',
      diagnostics: [{ code: 'connection_unavailable', source: 'connection' }],
    });
    expect(harness.semanticValidator.validate).not.toHaveBeenCalled();
  });
});
