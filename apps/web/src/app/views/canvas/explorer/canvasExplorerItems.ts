/**
 * Owned concern: adapt registered definitions and file publications into one Model catalogue.
 * @baseline GH-3610: sources, occurrences and operations are distinct identities.
 * @decision Exclude placed instances and retain canonical definition identities.
 * @consequence Catalogue rendering cannot clone definitions or author graph state.
 * @version 1.0.0
 */
import type { CanonicalNode } from '../../../types/canonical';
import {
  readWorkspaceDbtModelReference,
  workspaceNodeDefinitionId,
  type ConnectionRef,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';
import { canvasDbtModelDefinitionId } from '../canvasDbtModelReference';
import { resolveDbtProjectWorkspaceFilePath } from '../../code/codeViewFileSelection';
import {
  readDvtString as text,
  readDvtNodeConfig,
  resolveEffectiveDvtConnectionRef,
} from '../canvasDvtSourceAuthoring';

export type CanvasExplorerDetail = Readonly<{
  label: 'object' | 'connection' | 'file' | 'identifier' | 'database' | 'schema';
  value: string;
}>;

export type CanvasExplorerItem = Readonly<{
  id: string;
  label: string;
  description?: string;
  selected?: boolean;
  draggable?: boolean;
  disabled?: boolean;
  /** Read-only adaptation of an explicit resource discriminator, never persisted node metadata. */
  isSource?: boolean;
  details?: readonly CanvasExplorerDetail[];
  searchText?: string;
  definitionIdentity?: Readonly<{ canvasId: string; uniqueId: string }>;
}>;

export type CanvasExplorerFileModelItem = CanvasExplorerItem &
  Readonly<{
    definitionIdentity: Readonly<{ canvasId: string; uniqueId: string }>;
  }>;

function projectDetails(
  facts: Partial<Record<CanvasExplorerDetail['label'], unknown>>
): CanvasExplorerDetail[] {
  return (Object.entries(facts) as Array<[CanvasExplorerDetail['label'], unknown]>).flatMap(
    ([label, value]) => {
      const display = text(value);
      return display == null ? [] : [{ label, value: display }];
    }
  );
}

function withSearchText<Item extends CanvasExplorerItem>(
  item: Item,
  additional: readonly (string | undefined)[] = []
): Item & Readonly<{ searchText: string }> {
  return {
    ...item,
    searchText: [
      item.id,
      item.label,
      item.description,
      ...(item.details?.map((detail) => detail.value) ?? []),
      ...additional,
    ]
      .filter((value): value is string => value != null)
      .join(' '),
  };
}

export function projectCanvasExplorerModels(
  catalogue: readonly CanonicalNode[],
  sourceCatalogueCanvasId?: string
): CanvasExplorerItem[] {
  const items: CanvasExplorerItem[] = [];
  for (const node of catalogue) {
    if (!['input', 'transform'].includes(node.role) || workspaceNodeDefinitionId(node) != null)
      continue;
    const metadata = node.metadata ?? {};
    const config = readDvtNodeConfig(node);
    const resourceType = text(metadata.resourceType);
    const isSource =
      resourceType == null
        ? node.kind === 'dvt:source' || node.kind === 'dbt:source'
        : resourceType === 'source';
    let reference: ReturnType<typeof readWorkspaceDbtModelReference>;
    let connection: ConnectionRef | undefined;
    try {
      reference = readWorkspaceDbtModelReference(node);
      connection = reference?.connectionRef ?? resolveEffectiveDvtConnectionRef(node);
    } catch {
      // An invalid binding cannot hide the definition or fabricate a usable connection.
      reference = undefined;
      connection = undefined;
    }
    const uniqueId = reference?.uniqueId ?? text(metadata.dbtUniqueId);
    const canvasId =
      reference?.canvasId ??
      (metadata.authority === 'dbt-project-files' ? text(sourceCatalogueCanvasId) : undefined);
    const definitionIdentity =
      canvasId != null && uniqueId != null && resourceType !== 'seed' && resourceType !== 'snapshot'
        ? { canvasId, uniqueId }
        : undefined;
    const schema = text(metadata.schema) ?? text(config.schema);
    const connectionName =
      connection == null ? undefined : (text(metadata.connectionName) ?? connection.connectionId);
    const context = [schema, connectionName].filter(Boolean).join(' · ');
    const fileModelPath =
      !isSource && (reference != null || metadata.authority === 'dbt-project-files')
        ? text(node.path)
        : undefined;
    const details = projectDetails({
      object: metadata.tableIdentifier ?? metadata.tableName ?? config.table,
      connection: connectionName,
      file: node.path,
      identifier: uniqueId ?? node.id,
      database: metadata.database,
      schema,
    });
    items.push(
      withSearchText(
        {
          id: node.id,
          label: node.name,
          description:
            fileModelPath ?? (context || undefined) ?? text(node.path) ?? text(node.description),
          isSource,
          details,
          ...(definitionIdentity == null ? {} : { definitionIdentity }),
        },
        [...node.tags, text(node.description), connection?.connectionId]
      )
    );
  }
  return items;
}

/** Read current file Models without requiring an executable output or connection to list them. */
export function projectCanvasExplorerFileModels(
  projection: DbtProjectGraphProjection
): CanvasExplorerFileModelItem[] {
  if (projection.authorityBinding.authority.kind !== 'dbt-project-files') return [];
  const canvasId = projection.authorityBinding.canvasId;
  const projectRoot = projection.authorityBinding.authority.projectRoot;
  const connection = projection.executionTarget?.connectionRef;
  return projection.nodes
    .filter((node) => node.resourceType === 'model')
    .map((node) => {
      const path =
        node.originalFilePath == null
          ? undefined
          : resolveDbtProjectWorkspaceFilePath(projectRoot, node.originalFilePath);
      return withSearchText(
        {
          id: canvasDbtModelDefinitionId(canvasId, node.uniqueId),
          label: node.name,
          description: path ?? node.description,
          isSource: false,
          details: projectDetails({
            file: path,
            identifier: node.uniqueId,
            connection: connection?.connectionId,
          }),
          definitionIdentity: { canvasId, uniqueId: node.uniqueId },
        },
        node.tags
      );
    });
}

/** Prefer already registered definitions; names and connection labels never determine identity. */
export function mergeCanvasExplorerModels(
  registered: readonly CanvasExplorerItem[],
  discovered: readonly CanvasExplorerItem[]
): CanvasExplorerItem[] {
  const ids = new Set<string>();
  const definitions = new Set<string>();
  const result: CanvasExplorerItem[] = [];
  for (const item of [...registered, ...discovered]) {
    const identity = item.definitionIdentity;
    const key =
      identity == null ? undefined : JSON.stringify([identity.canvasId, identity.uniqueId]);
    if (ids.has(item.id) || (key != null && definitions.has(key))) continue;
    ids.add(item.id);
    if (key != null) definitions.add(key);
    result.push(item);
  }
  return result;
}
