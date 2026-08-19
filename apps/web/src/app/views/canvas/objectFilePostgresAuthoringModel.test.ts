import { LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyObjectFilePostgresAuthoringDraft,
  createObjectFilePostgresAuthoringDraft,
  isObjectFilePostgresNode,
  projectObjectFilePostgresStepTypeConfig,
  validateObjectFilePostgresAuthoringDraft,
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

  it('projects only canonical ownership fields from the wider workspace session scope', () => {
    const workspaceScope = {
      ...scope,
      targetAdapter: 'temporal',
    } as const;

    const result = projectObjectFilePostgresStepTypeConfig({
      node: objectFileNode,
      executionScope: workspaceScope,
    });

    expect(result).toEqual({
      ok: true,
      stepTypeConfig: expect.objectContaining({ scope }),
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

  it('round-trips the editable draft without persisting execution scope', () => {
    const draft = createObjectFilePostgresAuthoringDraft(objectFileNode);
    expect(draft).not.toBeNull();
    if (draft == null) return;

    expect(validateObjectFilePostgresAuthoringDraft(draft)).toEqual({
      ok: true,
      metadata: expect.objectContaining({
        source: expect.objectContaining({ sha256: 'a'.repeat(64) }),
        target: expect.objectContaining({ relation: 'orders' }),
      }),
    });
    expect(
      (
        applyObjectFilePostgresAuthoringDraft(objectFileNode, draft).metadata
          ?.objectFilePostgres as Record<string, unknown>
      ).scope
    ).toBeUndefined();
  });

  it('maps incomplete editable values to stable field errors', () => {
    const draft = createObjectFilePostgresAuthoringDraft({
      ...objectFileNode,
      metadata: {},
    });
    expect(draft).not.toBeNull();
    if (draft == null) return;

    expect(validateObjectFilePostgresAuthoringDraft(draft)).toEqual({
      ok: false,
      errors: expect.objectContaining({
        storageUri: 'object_file_storage_uri_invalid',
        sha256: 'object_file_sha256_invalid',
        sizeBytes: 'object_file_size_invalid',
        sourceCredentialRef: 'object_file_source_credential_ref_invalid',
        targetRelation: 'object_file_target_relation_invalid',
        targetCredentialRef: 'object_file_target_credential_ref_invalid',
        columns: 'object_file_column_mapping_invalid',
      }),
    });
  });

  it('keeps size ceiling and size-to-maximum failures on their owning fields', () => {
    const draft = createObjectFilePostgresAuthoringDraft(objectFileNode);
    expect(draft).not.toBeNull();
    if (draft == null) return;

    expect(
      validateObjectFilePostgresAuthoringDraft({
        ...draft,
        sizeBytes: String(LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES + 1),
      })
    ).toMatchObject({ ok: false, errors: { sizeBytes: 'object_file_size_invalid' } });
    expect(
      validateObjectFilePostgresAuthoringDraft({
        ...draft,
        maxBytes: String(LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES + 1),
      })
    ).toMatchObject({ ok: false, errors: { maxBytes: 'object_file_max_bytes_invalid' } });
    expect(
      validateObjectFilePostgresAuthoringDraft({
        ...draft,
        sizeBytes: '1001',
        maxBytes: '1000',
      })
    ).toMatchObject({ ok: false, errors: { sizeBytes: 'object_file_size_invalid' } });
    expect(
      validateObjectFilePostgresAuthoringDraft({
        ...draft,
        sizeBytes: '1.5',
      })
    ).toMatchObject({ ok: false, errors: { sizeBytes: 'object_file_size_invalid' } });
    expect(
      validateObjectFilePostgresAuthoringDraft({
        ...draft,
        maxBytes: '1.5',
      })
    ).toMatchObject({ ok: false, errors: { maxBytes: 'object_file_max_bytes_invalid' } });
  });
});
