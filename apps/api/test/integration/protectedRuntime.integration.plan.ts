/** Canonical queued-workflow fixture; these route tests do not execute activities. */
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  type GenericGraphNodeV1,
} from '@dvt/contracts';

import { ENVIRONMENT_ID, PROJECT_ID, TENANT_ID } from './protectedRuntime.integration.shared.js';

export function buildProtectedRuntimeStep(nodeId: string): GenericGraphNodeV1 {
  const sha256 = 'a'.repeat(64);
  return {
    nodeId,
    stepKind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
    dependsOn: [],
    stepTypeConfig: LoadObjectFileToPostgresStepTypeConfigSchema.parse({
      scope: { tenantId: TENANT_ID, projectId: PROJECT_ID, environmentId: ENVIRONMENT_ID },
      source: {
        storageUri: `s3://protected-runtime-proof/tenants/${TENANT_ID}/${sha256}`,
        credentialRef: 'object-store:protected-runtime-proof',
        encoding: 'utf-8',
        format: 'jsonl',
        mediaType: 'application/x-ndjson',
        sha256,
        sizeBytes: 2,
        maxBytes: 100,
      },
      target: {
        dialect: 'postgres',
        schema: 'staging',
        relation: 'protected_runtime_proof',
        loadMode: 'replace',
        credentialRef: 'postgres:protected-runtime-proof',
      },
      columns: [{ sourceField: 'id', targetColumn: 'id', dataType: 'text', nullable: false }],
    }),
  };
}
