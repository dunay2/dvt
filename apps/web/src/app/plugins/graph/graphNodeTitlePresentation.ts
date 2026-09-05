/** Owned concern: project canonical graph node identity into human-readable card titles. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';

import type { PluginNodeKind } from '../../types/canonical';
import {
  recordValue,
  resolveGraphNodeRelationParts,
  stringValue,
} from './graphNodeCardStrategyUtils';

export type GraphNodeTitlePresentationInput = Readonly<{
  nodeName: string;
  pluginId?: string;
  kind: PluginNodeKind;
  metadata: Record<string, unknown>;
  data?: Record<string, unknown>;
}>;

export type GraphNodeTitlePresentation = Readonly<{
  title: string;
  technicalName: string | null;
}>;

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
  pluginId,
  kind,
  metadata,
  data = {},
}: GraphNodeTitlePresentationInput): GraphNodeTitlePresentation {
  const dbtMetadata = recordValue(metadata.dbt);
  const configMetadata = recordValue(metadata.config);
  const dbtData = recordValue(data.dbt);
  const configData = recordValue(data.config);
  const { database, schema, table: tableName } = resolveGraphNodeRelationParts(metadata, data);
  const physicalTableIdentifier =
    stringValue(metadata.tableIdentifier) ?? stringValue(data.tableIdentifier);
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(metadata.connectedSourceRef);
  const connectionProvider = connectedSourceRef.success
    ? connectedSourceRef.data.connectionRef.provider
    : undefined;
  const sourceName =
    stringValue(metadata.sourceName) ??
    stringValue(dbtMetadata.sourceName) ??
    stringValue(configMetadata.sourceName) ??
    stringValue(data.sourceName) ??
    stringValue(dbtData.sourceName) ??
    stringValue(configData.sourceName);
  if (kind === 'dvt:source' && physicalTableIdentifier) {
    return {
      title: physicalTableIdentifier,
      technicalName: nodeName,
    };
  }
  if (pluginId === 'dvt.warehouse-source' && kind === 'dvt:source') {
    const warehouseTableTitle = physicalTableIdentifier ?? tableName;
    if (warehouseTableTitle) {
      return {
        title: warehouseTableTitle,
        technicalName: nodeName,
      };
    }

    if (database && schema) {
      return {
        title: `${titleCaseIdentifier(connectionProvider ?? database)} · ${schema}`,
        technicalName: nodeName,
      };
    }
  }

  if (kind === 'dvt:source' && sourceName && tableName) {
    return {
      title: `${displayIdentifier(sourceName, schema)} ${titleCaseIdentifier(tableName)}`,
      technicalName: nodeName,
    };
  }

  if (kind === 'dvt:source' && database && schema) {
    return {
      title: `${titleCaseIdentifier(database)} · ${schema}`,
      technicalName: nodeName,
    };
  }

  const humanTitle = titleCaseIdentifier(nodeName);
  return {
    title: humanTitle,
    technicalName: nodeName,
  };
}
