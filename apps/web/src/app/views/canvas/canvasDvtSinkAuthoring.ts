/** Owns DVT sink configuration, validation, and persistence. */
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
  return {
    ...(metadata.schema.trim() ? {} : { schema: 'dvt_schema_required' as const }),
    ...(metadata.table.trim() ? {} : { table: 'dvt_table_required' as const }),
    ...(VALID_MATERIALIZATIONS.has(normalizeDvtIdentifier(metadata.materialization, ''))
      ? {}
      : { materialization: 'dvt_materialization_invalid' as const }),
    ...(VALID_WRITE_MODES.has(normalizeDvtIdentifier(metadata.writeMode, ''))
      ? {}
      : { writeMode: 'dvt_write_mode_invalid' as const }),
  };
}

export function applyDvtSinkAuthoringMetadata(
  node: CanonicalNode,
  metadata: DvtSinkAuthoringMetadata
): CanonicalNode {
  return withDvtConfig(node, {
    ...readDvtNodeConfig(node),
    schema: metadata.schema.trim() || DEFAULT_SCHEMA_NAME,
    table: normalizeDvtIdentifier(metadata.table, 'sink_table'),
    materialization: normalizeEnum(
      metadata.materialization,
      DEFAULT_MATERIALIZATION,
      VALID_MATERIALIZATIONS
    ),
    writeMode: normalizeEnum(metadata.writeMode, DEFAULT_WRITE_MODE, VALID_WRITE_MODES),
  });
}
