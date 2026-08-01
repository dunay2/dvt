import { createHash } from 'node:crypto';

import {
  DbtSelectedModelAnalysisSchema,
  type DbtSelectedModelAnalysis,
  type DbtSelectedModelIdentity,
} from '@dvt/contracts';

import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisIdentity,
  DbtProjectSemanticRegion,
} from '../ports/dbtProjectAnalysis.js';

const SUPPORTED_REGION_KINDS = ['ref', 'source'] as const;

type RawCapabilitySet = Readonly<{
  adapterType?: string;
  analyzerVersion: string;
  dbtVersion?: string;
  supportedRegionKinds: readonly ('ref' | 'source')[];
  capabilitySetSha256: string;
}>;

type RawDiagnostic = Readonly<{
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  subject: Readonly<{
    kind: 'project' | 'file' | 'resource' | 'region' | 'adapter';
    uniqueId?: string;
    path?: string;
    regionId?: string;
  }>;
  evidence?: Readonly<{
    path: string;
    range?: Readonly<{ startByte: number; endByte: number }>;
  }>;
}>;

type RawRegion =
  | Readonly<{
      regionId: string;
      path: string;
      kind: 'ref' | 'source' | 'jinja';
      range: Readonly<{ startByte: number; endByte: number }>;
      sourceSha256: string;
      classification: 'supported';
      targetUniqueId: string;
    }>
  | Readonly<{
      regionId: string;
      path: string;
      kind: 'ref' | 'source' | 'jinja';
      range: Readonly<{ startByte: number; endByte: number }>;
      sourceSha256: string;
      classification: 'code_only';
      reasonCode: string;
    }>;

type OutputDependency = DbtSelectedModelAnalysis['dependencies'][number];

export function projectSelectedDbtModelAnalysis(
  input: Readonly<{
    authorityBinding: DbtSelectedModelAnalysis['authorityBinding'];
    analysis: DbtProjectAnalysis;
    selectedUniqueId: string;
  }>
): DbtSelectedModelAnalysis {
  const capabilitySet = buildCapabilitySet(input.analysis);
  if (input.analysis.status !== 'valid') {
    return parseOutput({
      ...input,
      status: input.analysis.status === 'unavailable' ? 'unavailable' : 'refused',
      capabilitySet,
      identities: [],
      dependencies: [],
      regions: [],
      diagnostics: input.analysis.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        subject: { kind: 'project' as const },
      })),
    });
  }

  const selected = input.analysis.semanticEvidence.identities.find(
    (identity) => identity.uniqueId === input.selectedUniqueId && identity.resourceType === 'model'
  );
  if (selected === undefined) {
    return parseOutput({
      ...input,
      status: 'refused',
      capabilitySet,
      identities: [],
      dependencies: [],
      regions: [],
      diagnostics: [
        {
          code: 'dbt_selected_model_not_found',
          severity: 'error',
          message: 'The selected dbt model is not present in the authoritative analysis.',
          subject: { kind: 'resource', uniqueId: input.selectedUniqueId },
        },
      ],
    });
  }

  if (input.analysis.adapterType === undefined) {
    return parseOutput({
      ...input,
      status: 'refused',
      capabilitySet,
      identities: [],
      dependencies: [],
      regions: [],
      diagnostics: [
        {
          code: 'dbt_analysis_adapter_unknown',
          severity: 'error',
          message: 'The authoritative dbt analysis does not identify its adapter.',
          subject: { kind: 'adapter' },
        },
      ],
    });
  }

  const relationById = resolveRelations(selected, input.analysis.semanticEvidence.identities);
  const identities = input.analysis.semanticEvidence.identities
    .filter((identity) => relationById.has(identity.uniqueId))
    .map((identity) => projectIdentity(identity, relationById.get(identity.uniqueId)!))
    .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  const identityIds = new Set(identities.map((identity) => identity.uniqueId));
  const selectedRegions = input.analysis.semanticEvidence.regions
    .filter((region) => region.ownerUniqueIds.includes(selected.uniqueId))
    .filter(
      (region) => region.classification === 'code_only' || identityIds.has(region.targetUniqueId)
    )
    .sort(compareRegions);
  const regionIds = new Set(selectedRegions.map((region) => region.regionId));
  const regions = selectedRegions.map(({ ownerUniqueIds: _ownerUniqueIds, ...region }) => region);

  return parseOutput({
    ...input,
    status: 'ready',
    capabilitySet,
    identities,
    dependencies: projectDependencies({
      analysis: input.analysis,
      selectedRegions,
      identityIds,
      relationById,
    }),
    regions,
    diagnostics: input.analysis.semanticEvidence.diagnostics.filter((diagnostic) =>
      regionIds.has(diagnostic.subject.regionId)
    ),
  });
}

function parseOutput(
  input: Readonly<{
    status: DbtSelectedModelAnalysis['status'];
    authorityBinding: DbtSelectedModelAnalysis['authorityBinding'];
    analysis: DbtProjectAnalysis;
    capabilitySet: RawCapabilitySet;
    selectedUniqueId: string;
    identities: readonly DbtSelectedModelIdentity[];
    dependencies: readonly OutputDependency[];
    regions: readonly RawRegion[];
    diagnostics: readonly RawDiagnostic[];
  }>
): DbtSelectedModelAnalysis {
  const deterministicContent = {
    status: input.status,
    contentSetSha256: input.analysis.projectRevision.contentSetSha256,
    analysisSha256: input.analysis.analysisSha256,
    selectedUniqueId: input.selectedUniqueId,
    capabilitySetSha256: input.capabilitySet.capabilitySetSha256,
    files: input.analysis.semanticEvidence.files,
    identities: input.identities,
    dependencies: input.dependencies,
    regions: input.regions,
    diagnostics: input.diagnostics,
  };
  return DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: input.status,
    authorityBinding: input.authorityBinding,
    projectRevision: input.analysis.projectRevision,
    analysisSha256: input.analysis.analysisSha256,
    selectedAnalysisSha256: hashStable(deterministicContent),
    capabilitySet: input.capabilitySet,
    selectedUniqueId: input.selectedUniqueId,
    files: input.analysis.semanticEvidence.files,
    identities: input.identities,
    dependencies: input.dependencies,
    regions: input.regions,
    diagnostics: input.diagnostics,
  });
}

function buildCapabilitySet(analysis: DbtProjectAnalysis): RawCapabilitySet {
  const values = {
    ...(analysis.adapterType === undefined ? {} : { adapterType: analysis.adapterType }),
    analyzerVersion: analysis.projectRevision.analyzerVersion,
    ...(analysis.projectRevision.dbtVersion === undefined
      ? {}
      : { dbtVersion: analysis.projectRevision.dbtVersion }),
    supportedRegionKinds: [...SUPPORTED_REGION_KINDS],
  };
  return { ...values, capabilitySetSha256: hashStable(values) };
}

function resolveRelations(
  selected: DbtProjectAnalysisIdentity,
  identities: readonly DbtProjectAnalysisIdentity[]
): ReadonlyMap<string, DbtSelectedModelIdentity['relationToSelection']> {
  const relations = new Map<string, DbtSelectedModelIdentity['relationToSelection']>([
    [selected.uniqueId, 'selected'],
  ]);
  selected.dependencyUniqueIds.forEach((uniqueId) => relations.set(uniqueId, 'upstream'));
  for (const identity of identities) {
    if (!identity.dependencyUniqueIds.includes(selected.uniqueId)) continue;
    relations.set(identity.uniqueId, identity.resourceType === 'test' ? 'test' : 'downstream');
  }
  for (const identity of identities.filter((candidate) => relations.has(candidate.uniqueId))) {
    identity.macroUniqueIds.forEach((uniqueId) => {
      if (!relations.has(uniqueId)) relations.set(uniqueId, 'macro');
    });
  }
  return relations;
}

function projectIdentity(
  identity: DbtProjectAnalysisIdentity,
  relationToSelection: DbtSelectedModelIdentity['relationToSelection']
): DbtSelectedModelIdentity {
  return {
    uniqueId: identity.uniqueId,
    resourceType: identity.resourceType,
    name: identity.name,
    packageName: identity.packageName,
    ...(identity.originalFilePath === undefined
      ? {}
      : { originalFilePath: identity.originalFilePath }),
    relationToSelection,
  };
}

function projectDependencies(
  input: Readonly<{
    analysis: DbtProjectAnalysis;
    selectedRegions: readonly DbtProjectSemanticRegion[];
    identityIds: ReadonlySet<string>;
    relationById: ReadonlyMap<string, DbtSelectedModelIdentity['relationToSelection']>;
  }>
): readonly OutputDependency[] {
  const dependencies: OutputDependency[] = [];
  for (const dependency of input.analysis.dependencies) {
    const relation = dependency.relation;
    if (relation !== 'dependency' && relation !== 'test_target') continue;
    if (
      !input.identityIds.has(dependency.sourceUniqueId) ||
      !input.identityIds.has(dependency.targetUniqueId)
    ) {
      continue;
    }
    const matchingRegions = input.selectedRegions.filter(
      (region) =>
        region.classification === 'supported' &&
        region.ownerUniqueIds.includes(dependency.targetUniqueId) &&
        region.targetUniqueId === dependency.sourceUniqueId
    );
    if (matchingRegions.length === 0) {
      dependencies.push({
        sourceUniqueId: dependency.sourceUniqueId,
        targetUniqueId: dependency.targetUniqueId,
        relation,
      });
      continue;
    }
    matchingRegions.forEach((region) =>
      dependencies.push({
        sourceUniqueId: dependency.sourceUniqueId,
        targetUniqueId: dependency.targetUniqueId,
        relation,
        regionId: region.regionId,
      })
    );
  }
  for (const identity of input.analysis.semanticEvidence.identities) {
    if (!input.relationById.has(identity.uniqueId)) continue;
    for (const macroUniqueId of identity.macroUniqueIds) {
      if (!input.identityIds.has(macroUniqueId)) continue;
      dependencies.push({
        sourceUniqueId: macroUniqueId,
        targetUniqueId: identity.uniqueId,
        relation: 'macro',
      });
    }
  }
  return dependencies.sort((left, right) =>
    dependencyKey(left).localeCompare(dependencyKey(right))
  );
}

function dependencyKey(dependency: OutputDependency): string {
  return `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}:${dependency.regionId ?? ''}`;
}

function compareRegions(left: DbtProjectSemanticRegion, right: DbtProjectSemanticRegion): number {
  return (
    left.path.localeCompare(right.path) ||
    left.range.startByte - right.range.startByte ||
    left.range.endByte - right.range.endByte ||
    left.kind.localeCompare(right.kind)
  );
}

function hashStable(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortJsonValue(value)), 'utf8')
    .digest('hex');
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)])
    );
  }
  return value;
}
