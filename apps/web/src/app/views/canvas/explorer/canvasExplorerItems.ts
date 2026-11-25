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
import { resolveCanvasPhysicalCompositionInput } from '../canvasPhysicalCompositionInput';
import { readDvtTransformAuthoringAuthority } from '../canvasDvtTransformAuthoringAuthority';
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
  /** File-format fact from the accepted path, independent of Source and execution readiness. */
  definitionFormat?: 'sql';
  publicationState?: 'draft';
  details?: readonly CanvasExplorerDetail[];
  searchText?: string;
  definitionIdentity?: Readonly<{ canvasId: string; uniqueId: string }>;
}>;

export type CanvasExplorerFileModelItem = CanvasExplorerItem &
  Readonly<{
    definitionIdentity: Readonly<{ canvasId: string; uniqueId: string }>;
  }>;

function definitionFormatForPath(path: string | undefined): CanvasExplorerItem['definitionFormat'] {
  return text(path)?.toLowerCase().endsWith('.sql') === true ? 'sql' : undefined;
}

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

/** Share publication facts; Canvas activation and SQL insertion retain their own policies. */
export function hasPublishedCanvasExplorerDefinition(node: CanonicalNode): boolean {
  try {
    if (readWorkspaceDbtModelReference(node) != null) return true;
    if (node.role === 'input')
      return (
        resolveCanvasPhysicalCompositionInput(node, { sourceId: node.id, targetId: node.id }) !=
        null
      );
    return readDvtTransformAuthoringAuthority(node) != null;
  } catch {
    return false;
  }
}

type DefinitionBinding = Readonly<{
  reference: ReturnType<typeof readWorkspaceDbtModelReference>;
  connection: ConnectionRef | undefined;
  name: string | undefined;
}>;

function readDefinitionBinding(node: CanonicalNode): DefinitionBinding {
  try {
    const reference = readWorkspaceDbtModelReference(node);
    const connection = reference?.connectionRef ?? resolveEffectiveDvtConnectionRef(node);
    const name =
      connection == null
        ? undefined
        : (text(node.metadata?.connectionName) ?? connection.connectionId);
    return { reference, connection, name };
  } catch {
    // An invalid binding cannot hide the definition or fabricate a usable connection.
    return { reference: undefined, connection: undefined, name: undefined };
  }
}

function fileDefinitionIdentity(
  canvasId: string | undefined,
  uniqueId: string | undefined,
  resourceType: unknown
): CanvasExplorerItem['definitionIdentity'] {
  if (canvasId == null) return undefined;
  if (uniqueId == null) return undefined;
  if (['seed', 'snapshot'].includes(String(resourceType))) return undefined;
  return { canvasId, uniqueId };
}

function readDefinitionIdentity(
  node: CanonicalNode,
  binding: DefinitionBinding,
  sourceCanvas?: string
): Readonly<{ uniqueId: string | undefined; identity: CanvasExplorerItem['definitionIdentity'] }> {
  const metadata = node.metadata ?? {};
  const uniqueId = binding.reference?.uniqueId ?? text(metadata.dbtUniqueId);
  const canvasId =
    binding.reference?.canvasId ??
    (metadata.authority === 'dbt-project-files' ? text(sourceCanvas) : undefined);
  return {
    uniqueId,
    identity: fileDefinitionIdentity(canvasId, uniqueId, text(metadata.resourceType)),
  };
}

function sourceDefinition(node: CanonicalNode): boolean {
  const resourceType = text(node.metadata?.resourceType);
  if (resourceType != null) return resourceType === 'source';
  return ['dvt:source', 'dbt:source'].includes(node.kind);
}

function definitionLocation(
  node: CanonicalNode,
  binding: DefinitionBinding,
  isSource: boolean
): Readonly<{ schema: string | undefined; description: string | undefined }> {
  const metadata = node.metadata ?? {};
  const schema = text(metadata.schema) ?? text(readDvtNodeConfig(node).schema);
  const context = [schema, binding.name].filter(Boolean).join(' · ');
  const candidates: (string | undefined)[] = [];
  const fileOwned = binding.reference != null || metadata.authority === 'dbt-project-files';
  if (!isSource && fileOwned) candidates.push(text(node.path));
  candidates.push(context || undefined, text(node.path), text(node.description));
  return { schema, description: candidates.find((value) => value != null) };
}

function definitionDetails(
  node: CanonicalNode,
  binding: DefinitionBinding,
  uniqueId: string | undefined,
  schema: string | undefined
): CanvasExplorerDetail[] {
  const metadata = node.metadata ?? {};
  return projectDetails({
    object: metadata.tableIdentifier ?? metadata.tableName ?? readDvtNodeConfig(node).table,
    connection: binding.name,
    file: node.path,
    identifier: uniqueId ?? node.id,
    database: metadata.database,
    schema,
  });
}

function draftPublication(
  node: CanonicalNode,
  binding: DefinitionBinding
): Pick<CanvasExplorerItem, 'publicationState'> {
  if (node.kind !== 'dvt:transform') return {};
  if (binding.reference != null) return {};
  return hasPublishedCanvasExplorerDefinition(node) ? {} : { publicationState: 'draft' };
}

function projectRegisteredDefinition(
  node: CanonicalNode,
  sourceCanvas?: string
): CanvasExplorerItem {
  const binding = readDefinitionBinding(node);
  const identity = readDefinitionIdentity(node, binding, sourceCanvas);
  const isSource = sourceDefinition(node);
  const location = definitionLocation(node, binding, isSource);
  return withSearchText(
    {
      id: node.id,
      label: node.name,
      ...draftPublication(node, binding),
      description: location.description,
      isSource,
      definitionFormat: definitionFormatForPath(node.path),
      details: definitionDetails(node, binding, identity.uniqueId, location.schema),
      ...(identity.identity == null ? {} : { definitionIdentity: identity.identity }),
    },
    [...node.tags, text(node.description), binding.connection?.connectionId]
  );
}

export function projectCanvasExplorerModels(
  catalogue: readonly CanonicalNode[],
  sourceCatalogueCanvasId?: string
): CanvasExplorerItem[] {
  return catalogue
    .filter(
      (node) =>
        ['input', 'transform'].includes(node.role) && workspaceNodeDefinitionId(node) == null
    )
    .map((node) => projectRegisteredDefinition(node, sourceCatalogueCanvasId));
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
          definitionFormat: definitionFormatForPath(path),
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
    if (ids.has(item.id)) continue;
    if (key != null && definitions.has(key)) continue;
    ids.add(item.id);
    if (key != null) definitions.add(key);
    result.push(item);
  }
  return result;
}
