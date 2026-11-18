/** Project confirmed catalog identities into insertable SQL references for the active dialect. */
import { DvtTransformResultTargetV1Schema, type DbtProjectGraphProjection } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import {
  readDvtNodeConfig,
  readDvtString,
  resolveEffectiveDvtConnectionRef,
} from '../canvas/canvasDvtSourceAuthoring';
import { canvasDbtModelDefinitionId } from '../canvas/canvasDbtModelReference';
import {
  mergeCanvasExplorerModels,
  projectCanvasExplorerFileModels,
  projectCanvasExplorerModels,
} from '../canvas/explorer/canvasExplorerItems';

type References = Partial<Record<'dbt' | 'postgresql' | 'snowflake', string>>;
export type TemplateProjectModel = {
  id: string;
  label: string;
  isSource: boolean;
  context?: string;
  references: References;
};

function quotedRelation(schema: string, relation: string): string {
  return [schema, relation].map((part) => '"' + part.replaceAll('"', '""') + '"').join('.');
}

function configuredRelation(node: CanonicalNode, isSource: boolean): string | undefined {
  const config = readDvtNodeConfig(node);
  if (!isSource) {
    const target = DvtTransformResultTargetV1Schema.safeParse(config.resultTarget);
    return config.materialized !== 'ephemeral' && target.success
      ? quotedRelation(target.data.schema, target.data.relation)
      : undefined;
  }
  try {
    if (resolveEffectiveDvtConnectionRef(node)?.provider !== 'postgres') return undefined;
  } catch {
    return undefined;
  }
  const schema = readDvtString(node.metadata?.schema) ?? readDvtString(config.schema);
  const table =
    readDvtString(node.metadata?.tableIdentifier) ??
    readDvtString(node.metadata?.tableName) ??
    readDvtString(config.table);
  return schema && table ? quotedRelation(schema, table) : undefined;
}

export function projectTemplateModels(
  nodes: readonly CanonicalNode[],
  projection?: DbtProjectGraphProjection,
  canvasId?: string
): TemplateProjectModel[] {
  const registered = projectCanvasExplorerModels(nodes, canvasId);
  const graphId = projection?.authorityBinding.canvasId;
  const resources = projection?.nodes ?? [];
  const discovered = projection ? projectCanvasExplorerFileModels(projection) : [];
  const sources = resources.filter((n) => n.resourceType === 'source');
  const catalog = mergeCanvasExplorerModels(registered, [
    ...discovered,
    ...sources.map((n) => ({
      id: canvasDbtModelDefinitionId(graphId!, n.uniqueId),
      label: n.name,
      isSource: true,
      definitionIdentity: { canvasId: graphId!, uniqueId: n.uniqueId },
    })),
  ]);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byIdentity = new Map(resources.map((n) => [n.uniqueId, n]));
  return catalog.map((item) => {
    const references: References = {};
    const node = byId.get(item.id);
    const sql = node && configuredRelation(node, !!item.isSource);
    if (sql) references.postgresql = sql;
    const identity = item.definitionIdentity;
    const dbt = identity && identity.canvasId === graphId && byIdentity.get(identity.uniqueId);
    if (
      dbt &&
      dbt.resourceType === 'model' &&
      dbt.uniqueId === `model.${dbt.packageName}.${dbt.name}`
    ) {
      references.dbt = `{{ ref(${JSON.stringify(dbt.packageName)}, ${JSON.stringify(dbt.name)}) }}`;
    }
    if (
      dbt &&
      dbt.resourceType === 'source' &&
      dbt.sourceName &&
      sources.filter((n) => n.sourceName === dbt.sourceName && n.name === dbt.name).length === 1
    ) {
      references.dbt = `{{ source(${JSON.stringify(dbt.sourceName)}, ${JSON.stringify(dbt.name)}) }}`;
    }
    return {
      id: item.id,
      label: item.label,
      isSource: !!item.isSource,
      context: item.description,
      references,
    };
  });
}
