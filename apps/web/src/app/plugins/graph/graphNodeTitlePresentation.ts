/** Owned concern: project canonical graph node identity into human-readable card titles. */
import type { PluginNodeKind } from '../../types/canonical';

export type GraphNodeTitlePresentationInput = Readonly<{
  nodeName: string;
  kind: PluginNodeKind;
  metadata: Record<string, unknown>;
  data?: Record<string, unknown>;
}>;

export type GraphNodeTitlePresentation = Readonly<{
  title: string;
  technicalName: string | null;
}>;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function titleCaseIdentifier(value: string): string {
  return value
    .split(/[_\s.-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function displayIdentifier(value: string, uppercaseHint?: string | null): string {
  const hint =
    uppercaseHint &&
    /^[A-Z0-9]{2,}$/u.test(uppercaseHint) &&
    uppercaseHint.toLocaleLowerCase() === value.toLocaleLowerCase()
      ? uppercaseHint
      : null;
  return hint ?? titleCaseIdentifier(value);
}

export function buildGraphNodeTitlePresentation({
  nodeName,
  kind,
  metadata,
  data = {},
}: GraphNodeTitlePresentationInput): GraphNodeTitlePresentation {
  const dbtMetadata = recordValue(metadata.dbt);
  const configMetadata = recordValue(metadata.config);
  const dbtData = recordValue(data.dbt);
  const configData = recordValue(data.config);
  const database =
    stringValue(metadata.database) ??
    stringValue(configMetadata.database) ??
    stringValue(dbtMetadata.database) ??
    stringValue(dbtMetadata.databaseName) ??
    stringValue(data.database) ??
    stringValue(configData.database) ??
    stringValue(dbtData.database) ??
    stringValue(dbtData.databaseName);
  const schema =
    stringValue(metadata.schema) ??
    stringValue(configMetadata.schema) ??
    stringValue(dbtMetadata.schema) ??
    stringValue(dbtMetadata.schemaName) ??
    stringValue(data.schema) ??
    stringValue(configData.schema) ??
    stringValue(dbtData.schema) ??
    stringValue(dbtData.schemaName);
  const sourceName =
    stringValue(metadata.sourceName) ??
    stringValue(dbtMetadata.sourceName) ??
    stringValue(configMetadata.sourceName) ??
    stringValue(data.sourceName) ??
    stringValue(dbtData.sourceName) ??
    stringValue(configData.sourceName);
  const tableName =
    stringValue(metadata.tableName) ??
    stringValue(metadata.table) ??
    stringValue(dbtMetadata.tableName) ??
    stringValue(dbtMetadata.table) ??
    stringValue(configMetadata.tableName) ??
    stringValue(configMetadata.table) ??
    stringValue(data.tableName) ??
    stringValue(data.table) ??
    stringValue(dbtData.tableName) ??
    stringValue(dbtData.table) ??
    stringValue(configData.tableName) ??
    stringValue(configData.table);

  if ((kind === 'dbt:source' || kind === 'dvt:source') && sourceName && tableName) {
    return {
      title: `${displayIdentifier(sourceName, schema)} ${titleCaseIdentifier(tableName)}`,
      technicalName: nodeName,
    };
  }

  if ((kind === 'dbt:source' || kind === 'dvt:source') && database && schema) {
    return {
      title: `${titleCaseIdentifier(database)} · ${schema}`,
      technicalName: nodeName,
    };
  }

  const humanTitle = titleCaseIdentifier(nodeName);
  const suffix =
    kind.endsWith(':model') && !humanTitle.toLowerCase().endsWith(' model') ? ' Model' : '';
  return {
    title: `${humanTitle}${suffix}`,
    technicalName: nodeName,
  };
}
