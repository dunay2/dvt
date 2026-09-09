/** Owns DVT sink configuration, validation, and persistence. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import type {
  DvtNodeAuthoringMetadataErrors,
  DvtSinkAuthoringMetadata,
} from './canvasDvtAuthoringTypes';
import {
  normalizeDvtIdentifier,
  readDvtNodeConfig,
  readDvtString,
  withDvtConfig,
} from './canvasDvtSourceAuthoring';

const DEFAULT_SCHEMA_NAME = 'public';
const DEFAULT_MATERIALIZATION = 'table';
const DEFAULT_WRITE_MODE = 'replace';
const VALID_MATERIALIZATIONS = new Set(['table', 'view']);
const VALID_WRITE_MODES = new Set(['replace', 'append']);

function normalizeEnum(
  value: string | undefined,
  fallback: string,
  allowed: ReadonlySet<string>
): string {
  const normalized = normalizeDvtIdentifier(value, fallback);
  return allowed.has(normalized) ? normalized : fallback;
}

export function createDvtSinkAuthoringMetadata(node: CanonicalNode): DvtSinkAuthoringMetadata {
  const config = readDvtNodeConfig(node);
  return {
    kind: 'sink',
    schema: readDvtString(config.schema) ?? DEFAULT_SCHEMA_NAME,
    table: normalizeDvtIdentifier(readDvtString(config.table) ?? node.name, 'sink_table'),
    materialization: normalizeEnum(
      readDvtString(config.materialization) ?? readDvtString(config.materialized),
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnum(
      readDvtString(config.writeMode),
      DEFAULT_WRITE_MODE,
      VALID_WRITE_MODES
    ),
  };
}

export function validateDvtSinkAuthoringMetadata(
  metadata: DvtSinkAuthoringMetadata
): DvtNodeAuthoringMetadataErrors {
  const schema = metadata.schema;
  const table = metadata.table;
  return {
    ...(schema.trim()
      ? schema !== schema.trim()
        ? { schema: 'dvt_identifier_whitespace' as const }
        : PostgresIdentifierV1Schema.safeParse(schema).success
          ? {}
          : { schema: 'dvt_identifier_too_long' as const }
      : { schema: 'dvt_schema_required' as const }),
    ...(table.trim()
      ? table !== table.trim()
        ? { table: 'dvt_identifier_whitespace' as const }
        : PostgresIdentifierV1Schema.safeParse(table).success
          ? {}
          : { table: 'dvt_identifier_too_long' as const }
      : { table: 'dvt_table_required' as const }),
    ...(VALID_MATERIALIZATIONS.has(metadata.materialization.trim())
      ? {}
      : { materialization: 'dvt_materialization_invalid' as const }),
    ...(VALID_WRITE_MODES.has(metadata.writeMode.trim())
      ? {}
      : { writeMode: 'dvt_write_mode_invalid' as const }),
  };
}

export function applyDvtSinkAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtSinkAuthoringMetadata
): CanonicalNode {
  const schema = metadata.schema;
  const table = metadata.table;
  const materialization = metadata.materialization.trim();
  const writeMode = metadata.writeMode.trim();
  if (
    schema !== schema.trim() ||
    !PostgresIdentifierV1Schema.safeParse(schema).success ||
    table !== table.trim() ||
    !PostgresIdentifierV1Schema.safeParse(table).success ||
    !VALID_MATERIALIZATIONS.has(materialization) ||
    !VALID_WRITE_MODES.has(writeMode)
  ) {
    return node;
  }
  return withDvtConfig(node, {
    ...readDvtNodeConfig(node),
    schema,
    table,
    materialization,
    writeMode,
  });
}
