/** Owned concern: project canonical graph node identity into human-readable card titles. */
import type { PluginNodeKind } from '../../types/canonical';

export type GraphNodeTitlePresentationInput = Readonly<{
  nodeName: string;
  kind: PluginNodeKind;
  metadata: Record<string, unknown>;
}>;

export type GraphNodeTitlePresentation = Readonly<{
  title: string;
  technicalName: string | null;
}>;

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function titleCaseIdentifier(value: string): string {
  return value
    .split(/[_\s.-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

export function buildGraphNodeTitlePresentation({
  nodeName,
  kind,
  metadata,
}: GraphNodeTitlePresentationInput): GraphNodeTitlePresentation {
  const database = stringValue(metadata.database);
  const schema = stringValue(metadata.schema);

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
