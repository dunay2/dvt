import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  isObjectFilePostgresNode,
  projectObjectFilePostgresStepTypeConfig,
} from './objectFilePostgresAuthoringModel';

const scope = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'dev',
} as const;

const objectFileNode: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders',
  pluginId: 'dvt.object-file-postgres',
  kind: 'dvt:object_file_load',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    objectFilePostgres: {
      source: {
        storageUri: `s3://dvt-fixtures/tenants/tenant/${'a'.repeat(64)}`,
        sha256: 'a'.repeat(64),
        sizeBytes: 62,
        maxBytes: 1_000,
        encoding: 'utf-8',
        format: 'csv',
        mediaType: 'text/csv',
        header: true,
        delimiter: ',',
        credentialRef: 'object-store:het1-fixture',
      },
      target: {
        dialect: 'postgres',
        schema: 'staging',
        relation: 'orders',
        loadMode: 'replace',
        credentialRef: 'postgres:het1-target',
      },
      columns: [
        {
          sourceField: 'order_id',
          targetColumn: 'order_id',
          dataType: 'bigint',
          nullable: false,
        },
      ],
    },
  },
};

describe('object-file PostgreSQL authoring model', () => {
  it('projects authored metadata with the authorized session scope', () => {
    const result = projectObjectFilePostgresStepTypeConfig({
      node: objectFileNode,
      executionScope: scope,
    });

    expect(result).toEqual({
      ok: true,
      stepTypeConfig: expect.objectContaining({
        scope,
        target: expect.objectContaining({ relation: 'orders' }),
      }),
    });
  });

  it('fails closed without an authorized scope or complete canonical metadata', () => {
    expect(
      projectObjectFilePostgresStepTypeConfig({
        node: objectFileNode,
        executionScope: undefined,
      })
    ).toEqual(
      expect.objectContaining({
        ok: false,
      })
    );

    expect(
      projectObjectFilePostgresStepTypeConfig({
        node: { ...objectFileNode, metadata: {} },
        executionScope: scope,
      })
    ).toEqual(
      expect.objectContaining({
        ok: false,
      })
    );
  });

  it('does not claim nodes owned by another plugin or kind', () => {
    expect(isObjectFilePostgresNode(objectFileNode)).toBe(true);
    expect(isObjectFilePostgresNode({ ...objectFileNode, pluginId: 'dbt' })).toBe(false);
    expect(isObjectFilePostgresNode({ ...objectFileNode, kind: 'dvt:source' })).toBe(false);
  });
});
