/**
 * Owned concern: bind each admitted dbt step to a literal selector for its compiled resource.
 * @baseline ADR-0060: dbt project files own execution semantics.
 * @decision Use native manifest FQN, package, filename and resource type to distinguish siblings.
 * @consequence Direct CLI selection preserves versions and names shared by packages or declarations in one file.
 */
import {
  DBT_STEP_SELECTOR_CUSTOM_KEY,
  DbtStepSelectorSchema,
  type DbtStepSelector,
  type GenericGraphSourceV1,
} from '@dvt/contracts';

import type { DbtProjectAnalysisResource } from '../../ports/dbtProjectAnalysis.js';

type Resource = DbtProjectAnalysisResource;

function fileKey(resource: Resource, file: string): string {
  // Native dbt filename and package globs can be case-insensitive on the worker OS.
  return JSON.stringify([
    resource.resourceType,
    resource.packageName.toLowerCase(),
    file.toLowerCase(),
  ]);
}

function indexDbtFiles(resources: readonly Resource[]): Map<string, Resource[]> {
  const index = new Map<string, Resource[]>();
  for (const resource of resources) {
    const file = resource.originalFilePath?.split('/').at(-1);
    if (!file) continue;
    // Native file: selectors match the basename or the basename without its final extension.
    for (const name of new Set([file, file.replace(/\.[^.]+$/u, '')])) {
      const key = fileKey(resource, name);
      const group = index.get(key);
      if (group) group.push(resource);
      else index.set(key, [resource]);
    }
  }
  return index;
}

function overlapsQualifiedName(other: Resource, qualifiedName: string): boolean {
  if (!other.fqn?.length) return true;
  // Native fqn: matches the full or package-less prefix, or a leaf even when it contains dots.
  if (other.fqn.at(-1) === qualifiedName) return true;
  if (
    other.resourceType === 'model' &&
    (other.fqn.at(-2) === qualifiedName ||
      other.fqn.slice(-2).join('_') === qualifiedName.split('.').slice(-2).join('_'))
  )
    return true;
  return [other.fqn, other.fqn.slice(1)].some((parts) => {
    const candidate = parts.join('.');
    return candidate === qualifiedName || candidate.startsWith(qualifiedName + '.');
  });
}

export function compiledDbtStepSelectors(
  resources: readonly DbtProjectAnalysisResource[],
  selectedIds: ReadonlySet<string>
): ReadonlyMap<string, DbtStepSelector> | undefined {
  const files = indexDbtFiles(resources);
  const selectors = new Map<string, DbtStepSelector>();
  for (const resource of resources) {
    if (!selectedIds.has(resource.uniqueId)) continue;
    const { uniqueId, resourceType, packageName, fqn } = resource;
    const file = resource.originalFilePath?.split('/').at(-1);
    if (!file || !fqn?.length || fqn[0] !== packageName) return undefined;
    // A comma intersects selections, whitespace forms a union, and graph/glob operators expand them.
    if (![file, ...fqn].every((value) => value.length > 0 && !/[\s,*?@+[\]]/u.test(value))) {
      return undefined;
    }
    const qualifiedName = fqn.join('.');
    const siblings = files.get(fileKey(resource, file))!;
    if (
      siblings.some(
        (node) => node.uniqueId !== uniqueId && overlapsQualifiedName(node, qualifiedName)
      )
    ) {
      return undefined;
    }
    const selector = `package:${packageName},resource_type:${resourceType},file:${file},fqn:${qualifiedName}`;
    const parsed = DbtStepSelectorSchema.safeParse({ version: 'v1', uniqueId, selector });
    if (!parsed.success) return undefined;
    selectors.set(uniqueId, parsed.data);
  }
  return selectors.size === selectedIds.size ? selectors : undefined;
}

export function bindCompiledDbtStepSelectors(
  graph: GenericGraphSourceV1,
  selectors: ReadonlyMap<string, DbtStepSelector>
): GenericGraphSourceV1 {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      stepTypeConfig: { custom: { [DBT_STEP_SELECTOR_CUSTOM_KEY]: selectors.get(node.nodeId)! } },
    })),
  };
}
