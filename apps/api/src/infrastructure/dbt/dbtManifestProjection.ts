/**
 * Owned concern: assemble the native manifest graph and its projection diagnostics.
 * @decision Delegate identity and resource decoding inside the existing analyzer adapter.
 * @consequence Unsupported resources retain diagnostics; malformed supported resources still fail closed.
 */
import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisDependency,
  DbtProjectAnalysisIdentity,
  DbtProjectAnalysisResource,
} from '../../application/ports/dbtProjectAnalysis.js';

import {
  projectIdentity,
  SUPPORTED_ANALYSIS_IDENTITY_TYPES,
} from './dbtManifestIdentityProjection.js';
import { projectResource, SUPPORTED_RESOURCE_TYPES } from './dbtManifestResourceProjection.js';
import {
  record,
  stringValue,
  isRecord,
  collectionValues,
  stringArray,
} from './dbtManifestValueReaders.js';

export type ManifestProjection = Readonly<{
  dbtVersion?: string;
  adapterType?: string;
  projectName: string;
  resources: readonly DbtProjectAnalysisResource[];
  identities: readonly DbtProjectAnalysisIdentity[];
  dependencies: readonly DbtProjectAnalysisDependency[];
  diagnostics: DbtProjectAnalysis['diagnostics'];
}>;

export function projectDbtManifest(value: unknown): ManifestProjection {
  const manifest = record(value);
  const metadata = record(manifest.metadata);
  const projectName = stringValue(metadata.project_name);
  if (
    stringValue(metadata.dbt_version) === undefined ||
    projectName === undefined ||
    !isRecord(manifest.nodes) ||
    !isRecord(manifest.sources)
  ) {
    throw new Error('dbt parse did not produce a supported manifest shape.');
  }
  const candidates = [
    ...collectionValues(manifest.nodes),
    ...collectionValues(manifest.sources),
    ...collectionValues(manifest.exposures),
    ...collectionValues(manifest.metrics),
  ];
  const identityCandidates = [
    ...collectionValues(manifest.nodes),
    ...collectionValues(manifest.sources),
    ...collectionValues(manifest.macros),
  ];
  const diagnostics: DbtProjectAnalysis['diagnostics'][number][] = [];
  const resources: DbtProjectAnalysisResource[] = [];
  for (const candidate of candidates) {
    const resource = projectResource(candidate, projectName);
    if (resource !== null) {
      resources.push(resource);
      continue;
    }

    const rawResource = record(candidate);
    const resourceType = stringValue(rawResource.resource_type);
    const uniqueId = stringValue(rawResource.unique_id);
    if (
      resourceType !== undefined &&
      uniqueId !== undefined &&
      !SUPPORTED_RESOURCE_TYPES.has(resourceType)
    ) {
      diagnostics.push({
        code: 'dbt_resource_not_projected',
        severity: 'warning',
        message: `${uniqueId} uses unsupported dbt resource type ${resourceType} and is not represented on the Canvas.`,
      });
      continue;
    }

    throw new Error('dbt parse produced a malformed graph resource.');
  }
  resources.sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  const identities = identityCandidates
    .map((candidate) => {
      const identity = projectIdentity(candidate);
      const resourceType = stringValue(record(candidate).resource_type);
      if (identity === null && SUPPORTED_ANALYSIS_IDENTITY_TYPES.has(resourceType ?? '')) {
        throw new Error('dbt parse produced a malformed analysis identity.');
      }
      return identity;
    })
    .filter((identity): identity is DbtProjectAnalysisIdentity => identity !== null)
    .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  const resourceIds = new Set(resources.map((resource) => resource.uniqueId));
  const resourceById = new Map(resources.map((resource) => [resource.uniqueId, resource]));
  const dependencies: DbtProjectAnalysisDependency[] = [];

  for (const candidate of candidates) {
    const resource = resourceById.get(stringValue(record(candidate).unique_id) ?? '');
    if (!resource) continue;
    for (const dependencyId of stringArray(record(record(candidate).depends_on).nodes)) {
      if (!resourceIds.has(dependencyId)) {
        diagnostics.push({
          code: 'dbt_dependency_not_projected',
          severity: 'warning',
          message: `${resource.uniqueId} depends on unsupported resource ${dependencyId}.`,
        });
        continue;
      }
      dependencies.push({
        sourceUniqueId: dependencyId,
        targetUniqueId: resource.uniqueId,
        relation: dependencyRelation(resource.resourceType),
      });
    }
  }

  const dbtVersion = stringValue(metadata.dbt_version);
  const adapterType = stringValue(metadata.adapter_type);
  return {
    projectName,
    ...(dbtVersion === undefined ? {} : { dbtVersion }),
    ...(adapterType === undefined ? {} : { adapterType }),
    resources,
    identities,
    dependencies: deduplicateDependencies(dependencies),
    diagnostics: diagnostics.sort((left, right) => left.message.localeCompare(right.message)),
  };
}

function dependencyRelation(
  targetType: DbtProjectAnalysisResource['resourceType']
): DbtProjectAnalysisDependency['relation'] {
  if (targetType === 'test') return 'test_target';
  if (targetType === 'exposure') return 'exposure';
  if (targetType === 'metric') return 'metric';
  return 'dependency';
}

function deduplicateDependencies(
  dependencies: readonly DbtProjectAnalysisDependency[]
): readonly DbtProjectAnalysisDependency[] {
  const unique = new Map<string, DbtProjectAnalysisDependency>();
  for (const dependency of dependencies) {
    const key = `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}`;
    unique.set(key, dependency);
  }
  return [...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, dependency]) => dependency);
}
