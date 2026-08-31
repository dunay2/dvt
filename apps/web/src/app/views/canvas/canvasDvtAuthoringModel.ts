/** Owned concern: derive and apply route-owned DVT transformation authoring metadata. */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  ConnectedSourceRefSchema,
  ConnectionRefSchema,
  DVT_TRANSFORM_AUTHORING_MODE,
  VisualTransformRecipeV1Schema,
  type ConnectionRef,
  type VisualTransformRecipeV1,
} from '@dvt/contracts';
import type { DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitSemanticDocument,
  applyDvtVisualTransformRecipe,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitPilotDocument,
  encodeDvtSubstraitPilotDocument,
  inspectDvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import { inspectDvtSubstraitPilotAggregationDraft } from './canvasDvtSubstraitAggregation';
import { inspectDvtSubstraitPilotWindowDraft } from './canvasDvtSubstraitWindow';
import {
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  decodeDvtSubstraitUnionAllDocument,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
import { buildDvtSqlTransformMetadata } from './canvasTransformationSqlMirror';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';

export type DvtSourceAuthoringMetadata = Readonly<{
  kind: 'source';
  schema: string;
  table: string;
  alias: string;
  connectionRef?: ConnectionRef;
}>;

export type DvtSqlTransformAuthoringMetadata = Readonly<{
  kind: 'sql_transform';
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.sql;
  sql: string;
}>;

export type DvtVisualTransformAuthoringMetadata = Readonly<{
  kind: 'sql_transform';
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.visual;
  recipe: VisualTransformRecipeV1;
}>;

export type DvtSubstraitTransformAuthoringMetadata = Readonly<{
  kind: 'sql_transform';
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait;
  shape: 'pilot' | 'inner_join' | 'union_all';
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSinkAuthoringMetadata = Readonly<{
  kind: 'sink';
  schema: string;
  table: string;
  materialization: string;
  writeMode: string;
}>;

export type DvtNodeAuthoringMetadata =
  | DvtSourceAuthoringMetadata
  | DvtSqlTransformAuthoringMetadata
  | DvtVisualTransformAuthoringMetadata
  | DvtSubstraitTransformAuthoringMetadata
  | DvtSinkAuthoringMetadata;

export type DvtNodeAuthoringMetadataErrors = Partial<
  Record<
    | 'schema'
    | 'table'
    | 'alias'
    | 'connectionRef'
    | 'sql'
    | 'recipe'
    | 'materialization'
    | 'writeMode',
    CanvasInspectorNodeDraftErrorCode
  >
>;

const DEFAULT_SCHEMA_NAME = 'public';
const DEFAULT_MATERIALIZATION = 'table';
const DEFAULT_WRITE_MODE = 'replace';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);
const VALID_WRITE_MODES = new Set(['replace', 'append']);
const DVT_AUTHORING_PLUGIN_ID = 'dvt';
const DVT_WAREHOUSE_SOURCE_PLUGIN_ID = 'dvt.warehouse-source';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNodeMetadataRecord(
  node: CanonicalNode,
  key: string
): Record<string, unknown> | undefined {
  const value = node.metadata?.[key];
  return isRecord(value) ? value : undefined;
}

function normalizeIdentifier(value: string | undefined, fallback: string): string {
  const raw = value?.trim() ?? '';
  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeEnumValue(
  value: string | undefined,
  fallback: string,
  allowedValues: ReadonlySet<string>
): string {
  const normalized = normalizeIdentifier(value, fallback);
  return allowedValues.has(normalized) ? normalized : fallback;
}

function createSourceMetadata(node: CanonicalNode): DvtSourceAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');
  const importedSourceName = readString(node.metadata?.sourceName);
  const importedSchema = readString(node.metadata?.schema);
  const importedTableName = readString(node.metadata?.tableName);
  const isImportedSource = node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID;
  const table = normalizeIdentifier(
    (isImportedSource ? importedTableName : (readString(config?.table) ?? importedTableName)) ??
      readString(config?.alias) ??
      node.name,
    'source_table'
  );

  return {
    kind: 'source',
    schema:
      (isImportedSource ? importedSchema : (readString(config?.schema) ?? importedSchema)) ??
      DEFAULT_SCHEMA_NAME,
    table,
    alias: normalizeIdentifier(readString(config?.alias) ?? importedSourceName ?? table, table),
    connectionRef: resolveEffectiveDvtConnectionRef(node),
  };
}

function parseManualConnectionRef(value: unknown): ConnectionRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  const result = ConnectionRefSchema.safeParse(value);
  if (!result.success) {
    throw new Error('DVT source metadata.connectionRef must be a valid ConnectionRef.');
  }
  return result.data;
}

function parseImportedConnectionRef(value: unknown): ConnectionRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  const result = ConnectedSourceRefSchema.safeParse(value);
  if (!result.success) {
    throw new Error('DVT imported source metadata.connectedSourceRef must be valid.');
  }
  return result.data.connectionRef;
}

export function resolveEffectiveDvtConnectionRef(node: CanonicalNode): ConnectionRef | undefined {
  const manualConnectionRef = parseManualConnectionRef(node.metadata?.connectionRef);
  const importedConnectionRef = parseImportedConnectionRef(node.metadata?.connectedSourceRef);

  if (manualConnectionRef && importedConnectionRef) {
    throw new Error('DVT source nodes must persist exactly one connection authority.');
  }

  const connectionRef = importedConnectionRef ?? manualConnectionRef;
  if (connectionRef && connectionRef.provider !== 'postgres') {
    throw new Error('DVT SQL-first sources require a PostgreSQL ConnectionRef.');
  }
  return connectionRef;
}

export function resolveInheritedDvtConnectionRef(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): ConnectionRef | undefined {
  const nodesById = new Map(args.nodes.map((candidate) => [candidate.id, candidate]));
  const sourceIdByTargetId = new Map(args.edges.map((edge) => [edge.targetId, edge.sourceId]));
  const visited = new Set<string>();
  let current: CanonicalNode | undefined = args.node;

  while (current) {
    if (visited.has(current.id)) {
      throw new Error('DVT connection inheritance cannot traverse a cyclic graph.');
    }
    visited.add(current.id);

    if (current.kind === 'dvt:source') {
      return resolveEffectiveDvtConnectionRef(current);
    }

    const sourceId = sourceIdByTargetId.get(current.id);
    current = sourceId ? nodesById.get(sourceId) : undefined;
  }

  return undefined;
}

function createSqlTransformMetadata(
  node: CanonicalNode
):
  | DvtSqlTransformAuthoringMetadata
  | DvtVisualTransformAuthoringMetadata
  | DvtSubstraitTransformAuthoringMetadata {
  const authority = readDvtTransformAuthoringAuthority(node);

  if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
    return { kind: 'sql_transform', mode: authority.mode, recipe: authority.recipe };
  }
  if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    const pilotDraft = decodeDvtSubstraitPilotDocument(authority.semanticDocument);
    if (inspectDvtSubstraitPilotDraft(pilotDraft).ok) {
      return {
        kind: 'sql_transform',
        mode: authority.mode,
        shape: 'pilot',
        plan: pilotDraft.plan,
        sidecar: pilotDraft.sidecar,
      };
    }
    if (inspectDvtSubstraitPilotAggregationDraft(pilotDraft).ok) {
      return {
        kind: 'sql_transform',
        mode: authority.mode,
        shape: 'pilot',
        plan: pilotDraft.plan,
        sidecar: pilotDraft.sidecar,
      };
    }
    if (inspectDvtSubstraitPilotWindowDraft(pilotDraft).ok) {
      return {
        kind: 'sql_transform',
        mode: authority.mode,
        shape: 'pilot',
        plan: pilotDraft.plan,
        sidecar: pilotDraft.sidecar,
      };
    }
    const joinDraft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    if (inspectDvtSubstraitInnerJoinDraft(joinDraft).ok) {
      return {
        kind: 'sql_transform',
        mode: authority.mode,
        shape: 'inner_join',
        plan: joinDraft.plan,
        sidecar: joinDraft.sidecar,
      };
    }
    const unionAllDraft = decodeDvtSubstraitUnionAllDocument(authority.semanticDocument);
    return {
      kind: 'sql_transform',
      mode: authority.mode,
      shape: 'union_all',
      plan: unionAllDraft.plan,
      sidecar: unionAllDraft.sidecar,
    };
  }
  return { kind: 'sql_transform', mode: authority.mode, sql: authority.sql };
}

function createSinkMetadata(node: CanonicalNode): DvtSinkAuthoringMetadata {
  const config = readNodeMetadataRecord(node, 'config');

  return {
    kind: 'sink',
    schema: readString(config?.schema) ?? DEFAULT_SCHEMA_NAME,
    table: normalizeIdentifier(readString(config?.table) ?? node.name, 'sink_table'),
    materialization: normalizeEnumValue(
      readString(config?.materialization) ?? readString(config?.materialized),
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnumValue(
      readString(config?.writeMode),
      DEFAULT_WRITE_MODE,
      VALID_WRITE_MODES
    ),
  };
}

export function createDvtNodeAuthoringMetadata(
  node: CanonicalNode
): DvtNodeAuthoringMetadata | undefined {
  switch (node.kind) {
    case 'dvt:source':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID ||
        node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID
        ? createSourceMetadata(node)
        : undefined;
    case 'dvt:sql_transform':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID
        ? createSqlTransformMetadata(node)
        : undefined;
    case 'dvt:sink':
      return node.pluginId === DVT_AUTHORING_PLUGIN_ID ? createSinkMetadata(node) : undefined;
    default:
      return undefined;
  }
}

export function validateDvtNodeAuthoringMetadata(
  metadata: DvtNodeAuthoringMetadata
): DvtNodeAuthoringMetadataErrors {
  const errors: DvtNodeAuthoringMetadataErrors = {};

  if (metadata.kind === 'source' || metadata.kind === 'sink') {
    if (metadata.schema.trim().length === 0) {
      errors.schema = 'dvt_schema_required';
    }
    if (metadata.table.trim().length === 0) {
      errors.table = 'dvt_table_required';
    }
  }

  if (metadata.kind === 'source' && metadata.alias.trim().length === 0) {
    errors.alias = 'dvt_alias_required';
  }
  if (metadata.kind === 'source' && metadata.connectionRef === undefined) {
    errors.connectionRef = 'dvt_connection_required';
  }
  if (
    metadata.kind === 'sql_transform' &&
    metadata.mode === DVT_TRANSFORM_AUTHORING_MODE.visual &&
    !VisualTransformRecipeV1Schema.safeParse(metadata.recipe).success
  ) {
    errors.recipe = 'dvt_visual_recipe_invalid';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_MATERIALIZATIONS.has(normalizeIdentifier(metadata.materialization, ''))
  ) {
    errors.materialization = 'dvt_materialization_invalid';
  }

  if (
    metadata.kind === 'sink' &&
    !VALID_WRITE_MODES.has(normalizeIdentifier(metadata.writeMode, ''))
  ) {
    errors.writeMode = 'dvt_write_mode_invalid';
  }

  return errors;
}

function readExistingConfig(node: CanonicalNode): Record<string, unknown> {
  return readNodeMetadataRecord(node, 'config') ?? {};
}

function withConfig(
  node: CanonicalNode,
  config: Record<string, unknown>,
  extraMetadata?: Record<string, unknown>
): CanonicalNode {
  return {
    ...node,
    metadata: {
      ...node.metadata,
      ...extraMetadata,
      config,
    },
  };
}

export function applyDvtNodeAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtNodeAuthoringMetadata
): CanonicalNode {
  const existingConfig = readExistingConfig(node);

  if (metadata.kind === 'source') {
    const table = normalizeIdentifier(metadata.table, 'source_table');
    if (node.pluginId === DVT_WAREHOUSE_SOURCE_PLUGIN_ID) {
      const mutableConfig = Object.fromEntries(
        Object.entries(existingConfig).filter(([key]) => key !== 'schema' && key !== 'table')
      );
      const importedTable = normalizeIdentifier(
        readString(node.metadata?.tableName) ?? node.name,
        'source_table'
      );
      return withConfig(node, {
        ...mutableConfig,
        alias: normalizeIdentifier(metadata.alias, importedTable),
      });
    }
    return withConfig(
      node,
      {
        ...existingConfig,
        schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
        table,
        alias: normalizeIdentifier(metadata.alias, table),
      },
      node.pluginId === DVT_AUTHORING_PLUGIN_ID
        ? { connectionRef: metadata.connectionRef }
        : undefined
    );
  }

  if (metadata.kind === 'sql_transform') {
    if (metadata.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      return applyDvtVisualTransformRecipe(node, metadata.recipe);
    }
    if (metadata.mode === DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      return applyDvtSubstraitSemanticDocument(
        node,
        metadata.shape === 'inner_join'
          ? encodeDvtSubstraitInnerJoinDocument({
              plan: metadata.plan,
              sidecar: metadata.sidecar,
            })
          : metadata.shape === 'union_all'
            ? encodeDvtSubstraitUnionAllDocument({
                plan: metadata.plan,
                sidecar: metadata.sidecar,
              })
            : encodeDvtSubstraitPilotDocument({ plan: metadata.plan, sidecar: metadata.sidecar })
      );
    }
    const transformMetadata = buildDvtSqlTransformMetadata(node, metadata.sql);
    return {
      ...node,
      metadata: transformMetadata,
    };
  }

  return withConfig(node, {
    ...existingConfig,
    schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
    table: normalizeIdentifier(metadata.table, 'sink_table'),
    materialization: normalizeEnumValue(
      metadata.materialization,
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnumValue(metadata.writeMode, DEFAULT_WRITE_MODE, VALID_WRITE_MODES),
  });
}
