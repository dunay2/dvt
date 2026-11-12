/**
 * Owned concern: project native dbt analysis identities and their dependency identifiers.
 * @decision Keep identity kinds separate from graph resource kinds.
 * @consequence Macros remain analysis identities without becoming Canvas resources.
 */
import type { DbtProjectAnalysisIdentity } from '../../application/ports/dbtProjectAnalysis.js';

import {
  record,
  stringValue,
  normalizeManifestPath,
  stringArray,
} from './dbtManifestValueReaders.js';

export const SUPPORTED_ANALYSIS_IDENTITY_TYPES = new Set([
  'model',
  'source',
  'test',
  'snapshot',
  'seed',
  'macro',
]);

export function projectIdentity(value: unknown): DbtProjectAnalysisIdentity | null {
  const resource = record(value);
  const resourceType = stringValue(resource.resource_type);
  if (resourceType === undefined || !SUPPORTED_ANALYSIS_IDENTITY_TYPES.has(resourceType)) {
    return null;
  }
  const uniqueId = stringValue(resource.unique_id);
  const name = stringValue(resource.name);
  const packageName = stringValue(resource.package_name);
  if (uniqueId === undefined || name === undefined || packageName === undefined) return null;

  const originalFilePath = stringValue(resource.original_file_path);
  const sourceName = stringValue(resource.source_name);
  const dependencies = record(resource.depends_on);
  return {
    uniqueId,
    resourceType: resourceType as DbtProjectAnalysisIdentity['resourceType'],
    name,
    packageName,
    ...(sourceName === undefined ? {} : { sourceName }),
    ...(originalFilePath === undefined
      ? {}
      : { originalFilePath: normalizeManifestPath(originalFilePath) }),
    dependencyUniqueIds: [...new Set(stringArray(dependencies.nodes))].sort(),
    macroUniqueIds: [...new Set(stringArray(dependencies.macros))].sort(),
  };
}
