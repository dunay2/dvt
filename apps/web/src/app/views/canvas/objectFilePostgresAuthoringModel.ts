/** Owned concern: validate Canvas authoring metadata against the bounded object-file load contract. */
import {
  LoadObjectFileToPostgresStepTypeConfigSchema,
  OBJECT_FILE_POSTGRES_COLUMN_TYPE,
  type LoadObjectFileToPostgresStepTypeConfig,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

export const OBJECT_FILE_POSTGRES_PLUGIN_ID = 'dvt.object-file-postgres';
export const OBJECT_FILE_POSTGRES_NODE_KIND = 'dvt:object_file_load';

export type ObjectFilePostgresExecutionScope = LoadObjectFileToPostgresStepTypeConfig['scope'];
export type ObjectFilePostgresAuthoringMetadata = Omit<
  LoadObjectFileToPostgresStepTypeConfig,
  'scope'
>;

export type ObjectFilePostgresColumnDraft = Readonly<{
  sourceField: string;
  targetColumn: string;
  dataType: (typeof OBJECT_FILE_POSTGRES_COLUMN_TYPE)[number];
  nullable: boolean;
}>;

export type ObjectFilePostgresAuthoringDraft = Readonly<{
  storageUri: string;
  sha256: string;
  sizeBytes: string;
  maxBytes: string;
  format: 'csv' | 'jsonl';
  sourceCredentialRef: string;
  targetRelation: string;
  targetCredentialRef: string;
  columns: readonly ObjectFilePostgresColumnDraft[];
}>;

export const OBJECT_FILE_POSTGRES_AUTHORING_ERROR = {
  storageUri: 'object_file_storage_uri_invalid',
  sha256: 'object_file_sha256_invalid',
  sizeBytes: 'object_file_size_invalid',
  maxBytes: 'object_file_max_bytes_invalid',
  sourceCredentialRef: 'object_file_source_credential_ref_invalid',
  targetRelation: 'object_file_target_relation_invalid',
  targetCredentialRef: 'object_file_target_credential_ref_invalid',
  columns: 'object_file_column_mapping_invalid',
} as const;

export type ObjectFilePostgresAuthoringErrorCode =
  (typeof OBJECT_FILE_POSTGRES_AUTHORING_ERROR)[keyof typeof OBJECT_FILE_POSTGRES_AUTHORING_ERROR];
export type ObjectFilePostgresAuthoringErrors = Partial<
  Record<keyof typeof OBJECT_FILE_POSTGRES_AUTHORING_ERROR, ObjectFilePostgresAuthoringErrorCode>
>;

export type ObjectFilePostgresAuthoringValidation =
  | Readonly<{ ok: true; metadata: ObjectFilePostgresAuthoringMetadata }>
  | Readonly<{ ok: false; errors: ObjectFilePostgresAuthoringErrors }>;

export type ObjectFilePostgresStepProjection =
  | Readonly<{
      ok: true;
      stepTypeConfig: LoadObjectFileToPostgresStepTypeConfig;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

export function isObjectFilePostgresNode(node: Pick<CanonicalNode, 'pluginId' | 'kind'>): boolean {
  return (
    node.pluginId === OBJECT_FILE_POSTGRES_PLUGIN_ID && node.kind === OBJECT_FILE_POSTGRES_NODE_KIND
  );
}

export function projectObjectFilePostgresStepTypeConfig(args: {
  node: CanonicalNode;
  executionScope: ObjectFilePostgresExecutionScope | undefined;
}): ObjectFilePostgresStepProjection {
  if (!isObjectFilePostgresNode(args.node)) {
    return {
      ok: false,
      message: `Node ${args.node.id} is not an object-file PostgreSQL load node.`,
    };
  }
  if (args.executionScope === undefined) {
    return {
      ok: false,
      message: `Object-file load ${args.node.name} requires an authorized execution scope.`,
    };
  }

  const metadata = args.node.metadata?.objectFilePostgres;
  const parsed = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse({
    ...(isRecord(metadata) ? metadata : {}),
    scope: {
      tenantId: args.executionScope.tenantId,
      projectId: args.executionScope.projectId,
      environmentId: args.executionScope.environmentId,
    },
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `Object-file load ${args.node.name} is not fully configured.`,
    };
  }

  return {
    ok: true,
    stepTypeConfig: parsed.data,
  };
}

export function createObjectFilePostgresAuthoringDraft(
  node: CanonicalNode
): ObjectFilePostgresAuthoringDraft | null {
  if (!isObjectFilePostgresNode(node)) return null;

  const metadata = recordValue(node.metadata?.objectFilePostgres);
  const source = recordValue(metadata.source);
  const target = recordValue(metadata.target);
  const columns = Array.isArray(metadata.columns)
    ? metadata.columns.flatMap((column) => {
        const value = recordValue(column);
        const dataType = stringValue(value.dataType);
        if (!isColumnType(dataType)) return [];
        return [
          {
            sourceField: stringValue(value.sourceField),
            targetColumn: stringValue(value.targetColumn),
            dataType,
            nullable: value.nullable === true,
          },
        ];
      })
    : [];

  return {
    storageUri: stringValue(source.storageUri),
    sha256: stringValue(source.sha256),
    sizeBytes: numberText(source.sizeBytes),
    maxBytes: numberText(source.maxBytes),
    format: source.format === 'jsonl' ? 'jsonl' : 'csv',
    sourceCredentialRef: stringValue(source.credentialRef),
    targetRelation: stringValue(target.relation),
    targetCredentialRef: stringValue(target.credentialRef),
    columns:
      columns.length > 0
        ? columns
        : [{ sourceField: '', targetColumn: '', dataType: 'text', nullable: true }],
  };
}

export function validateObjectFilePostgresAuthoringDraft(
  draft: ObjectFilePostgresAuthoringDraft,
  workspaceScope: ObjectFilePostgresExecutionScope
): ObjectFilePostgresAuthoringValidation {
  const sourceCommon = {
    storageUri: draft.storageUri.trim(),
    sha256: draft.sha256.trim(),
    sizeBytes: Number(draft.sizeBytes),
    maxBytes: Number(draft.maxBytes),
    encoding: 'utf-8' as const,
    credentialRef: draft.sourceCredentialRef.trim(),
  };
  const source =
    draft.format === 'jsonl'
      ? {
          ...sourceCommon,
          format: 'jsonl' as const,
          mediaType: 'application/x-ndjson' as const,
        }
      : {
          ...sourceCommon,
          format: 'csv' as const,
          mediaType: 'text/csv' as const,
          header: true as const,
          delimiter: ',' as const,
        };
  const parsed = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse({
    scope: {
      tenantId: workspaceScope.tenantId,
      projectId: workspaceScope.projectId,
      environmentId: workspaceScope.environmentId,
    },
    source,
    target: {
      dialect: 'postgres',
      schema: 'staging',
      relation: draft.targetRelation.trim(),
      loadMode: 'replace',
      credentialRef: draft.targetCredentialRef.trim(),
    },
    columns: draft.columns.map((column) => ({
      sourceField: column.sourceField.trim(),
      targetColumn: column.targetColumn.trim(),
      dataType: column.dataType,
      nullable: column.nullable,
    })),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errors: mapAuthoringIssues(parsed.error.issues.map((issue) => issue.path)),
    };
  }

  const { scope: _scope, ...metadata } = parsed.data;
  return { ok: true, metadata };
}

export function applyObjectFilePostgresAuthoringDraft(
  node: CanonicalNode,
  draft: ObjectFilePostgresAuthoringDraft,
  workspaceScope: ObjectFilePostgresExecutionScope
): CanonicalNode {
  const validation = validateObjectFilePostgresAuthoringDraft(draft, workspaceScope);
  if (!validation.ok) return node;

  return {
    ...node,
    metadata: {
      ...node.metadata,
      objectFilePostgres: validation.metadata,
    },
  };
}

export function resolveObjectFilePostgresAuthoringMetadata(
  node: CanonicalNode
): ObjectFilePostgresAuthoringMetadata | null {
  const draft = createObjectFilePostgresAuthoringDraft(node);
  if (draft == null) return null;
  const validation = validateObjectFilePostgresAuthoringDraft(draft, {
    tenantId: resolveTenantId(draft.storageUri),
    projectId: 'artifact-projection',
    environmentId: 'artifact-projection',
  });
  return validation.ok ? validation.metadata : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberText(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function isColumnType(value: string): value is (typeof OBJECT_FILE_POSTGRES_COLUMN_TYPE)[number] {
  return OBJECT_FILE_POSTGRES_COLUMN_TYPE.some((candidate) => candidate === value);
}

function resolveTenantId(storageUri: string): string {
  return /\/tenants\/([^/]+)\//u.exec(storageUri.trim())?.[1] ?? '';
}

function mapAuthoringIssues(
  paths: readonly (readonly PropertyKey[])[]
): ObjectFilePostgresAuthoringErrors {
  const errors: ObjectFilePostgresAuthoringErrors = {};
  for (const path of paths) {
    const [group, field] = path;
    if (group === 'source') {
      if (field === 'storageUri')
        errors.storageUri = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.storageUri;
      if (field === 'sha256') errors.sha256 = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.sha256;
      if (field === 'sizeBytes') errors.sizeBytes = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.sizeBytes;
      if (field === 'maxBytes') errors.maxBytes = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.maxBytes;
      if (field === 'credentialRef') {
        errors.sourceCredentialRef = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.sourceCredentialRef;
      }
      continue;
    }
    if (group === 'target' && field === 'relation') {
      errors.targetRelation = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.targetRelation;
      continue;
    }
    if (group === 'target' && field === 'credentialRef') {
      errors.targetCredentialRef = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.targetCredentialRef;
      continue;
    }
    if (group === 'columns') {
      errors.columns = OBJECT_FILE_POSTGRES_AUTHORING_ERROR.columns;
    }
  }
  return Object.keys(errors).length > 0
    ? errors
    : { columns: OBJECT_FILE_POSTGRES_AUTHORING_ERROR.columns };
}
