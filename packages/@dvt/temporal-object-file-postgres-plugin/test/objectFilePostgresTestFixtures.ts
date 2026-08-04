import type { LoadObjectFileToPostgresStepTypeConfig, ResolvedRunContext } from '@dvt/contracts';

export const SOURCE_BYTES = Buffer.from('order_id,amount,active\n1,10.25,true\n2,20.50,false\n');
export const SOURCE_SHA256 = '7fd3136edaeb0e504a47fabdc89de8ddc1e6dbd0c406cf919435a2998bf5928d';

export const STEP_CONFIG: LoadObjectFileToPostgresStepTypeConfig = {
  scope: {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
  },
  source: {
    storageUri: `s3://fixtures/tenants/tenant-a/${SOURCE_SHA256}`,
    sha256: SOURCE_SHA256,
    sizeBytes: SOURCE_BYTES.byteLength,
    maxBytes: 1_000_000,
    format: 'csv',
    mediaType: 'text/csv',
    encoding: 'utf-8',
    header: true,
    delimiter: ',',
    credentialRef: 'object-store:het1-fixture',
  },
  target: {
    dialect: 'postgres',
    schema: 'staging',
    relation: 'orders_import',
    loadMode: 'replace',
    credentialRef: 'postgres:het1-staging',
  },
  columns: [
    { sourceField: 'order_id', targetColumn: 'order_id', dataType: 'bigint', nullable: false },
    { sourceField: 'amount', targetColumn: 'amount', dataType: 'numeric', nullable: false },
    { sourceField: 'active', targetColumn: 'active', dataType: 'boolean', nullable: false },
  ],
};

export const RUN_CONTEXT: ResolvedRunContext = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  runId: 'run-a',
  targetAdapter: 'temporal',
  logicalAttemptId: 1,
};
