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
  IDbtProjectAnalyzerPort,
} from '../ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';

const SUPPORTED_REGION_KINDS = ['ref', 'source'] as const;

export type AnalyzeSelectedDbtModelInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  selectedUniqueId: string;
}>;

export interface IAnalyzeSelectedDbtModelQuery {
  execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis>;
}

export class AnalyzeSelectedDbtModelQuery implements IAnalyzeSelectedDbtModelQuery {
  public constructor(
    private readonly deps: Readonly<{
      analyzer: IDbtProjectAnalyzerPort;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
    }>
  ) {}

  public async execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis> {
    const authorityBinding = await this.deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: input.canvasId,
    });
    if (authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new DbtProjectFileAuthorityRequiredError();
    }

    const analysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: authorityBinding.authority.projectRoot,
    });
    const capabilitySet = buildCapabilitySet(analysis);

    if (analysis.status !== 'valid') {
      return buildAnalysisContract({
        status: analysis.status === 'unavailable' ? 'unavailable' : 'refused',
        authorityBinding,
        analysis,
        capabilitySet,
        selectedUniqueId: input.selectedUniqueId,
        identities: [],
        dependencies: [],
        regions: [],
        diagnostics: analysis.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          subject: { kind: 'project' as const },
        })),
      });
    }

    const selected = analysis.semanticEvidence.identities.find(
      (identity) =>
        identity.uniqueId === input.selectedUniqueId && identity.resourceType === 'model'
    );
    if (selected === undefined) {
      return buildAnalysisContract({
        status: 'refused',
        authorityBinding,
        analysis,
        capabilitySet,
        selectedUniqueId: input.selectedUniqueId,
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

    if (analysis.adapterType === undefined) {
      return buildAnalysisContract({
        status: 'refused',
        authorityBinding,
        analysis,
        capabilitySet,
        selectedUniqueId: input.selectedUniqueId,
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

    const relationById = resolveRelevantIdentityRelations(
      selected,
      analysis.semanticEvidence.identities
    );
    const identities = analysis.semanticEvidence.identities
      .filter((identity) => relationById.has(identity.uniqueId))
      .map((identity) => projectIdentity(identity, relationById.get(identity.uniqueId)!))
      .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
    const identityIds = new Set(identities.map((identity) => identity.uniqueId));
    const selectedRegions = analysis.semanticEvidence.regions
      .filter((region) => region.ownerUniqueIds.includes(selected.uniqueId))
      .filter(
        (region) => region.classification === 'code_only' || identityIds.has(region.targetUniqueId)
      )
      .sort(compareRegions);
    const regionIds = new Set(selectedRegions.map((region) => region.regionId));
    const regions = selectedRegions.map(({ ownerUniqueIds: _ownerUniqueIds, ...region }) => region);
    const dependencies = projectRelevantDependencies({
      analysis,
      selectedRegions,
      identityIds,
      relationById,
    });
    const diagnostics = analysis.semanticEvidence.diagnostics.filter(
      (diagnostic) =>
        diagnostic.subject.regionId !== undefined && regionIds.has(diagnostic.subject.regionId)
    );

    return buildAnalysisContract({
      status: 'ready',
      authorityBinding,
      analysis,
      capabilitySet,
      selectedUniqueId: input.selectedUniqueId,
      identities,
      dependencies,
      regions,
      diagnostics,
    });
  }
}

type RawCapabilitySet = Readonly<{
  adapterType?: string;
  analyzerVersion: string;
  dbtVersion?: string;
  supportedRegionKinds: readonly ('ref' | 'source')[];
  capabilitySetSha256: string;
}>;
type RawOutputDiagnostic = Readonly<{
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
type RawOutputRegion =
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

function buildAnalysisContract(
  input: Readonly<{
    status: DbtSelectedModelAnalysis['status'];
    authorityBinding: DbtSelectedModelAnalysis['authorityBinding'];
    analysis: DbtProjectAnalysis;
    capabilitySet: RawCapabilitySet;
    selectedUniqueId: string;
    identities: readonly DbtSelectedModelIdentity[];
    dependencies: readonly OutputDependency[];
    regions: readonly RawOutputRegion[];
    diagnostics: readonly RawOutputDiagnostic[];
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

function resolveRelevantIdentityRelations(
  selected: DbtProjectAnalysisIdentity,
  identities: readonly DbtProjectAnalysisIdentity[]
): ReadonlyMap<string, DbtSelectedModelIdentity['relationToSelection']> {
  const relationById = new Map<string, DbtSelectedModelIdentity['relationToSelection']>([
    [selected.uniqueId, 'selected'],
  ]);
  selected.dependencyUniqueIds.forEach((uniqueId) => relationById.set(uniqueId, 'upstream'));
  for (const identity of identities) {
    if (!identity.dependencyUniqueIds.includes(selected.uniqueId)) continue;
    relationById.set(identity.uniqueId, identity.resourceType === 'test' ? 'test' : 'downstream');
  }
  const contextualIdentities = identities.filter((identity) => relationById.has(identity.uniqueId));
  for (const identity of contextualIdentities) {
    identity.macroUniqueIds.forEach((uniqueId) => {
      if (!relationById.has(uniqueId)) relationById.set(uniqueId, 'macro');
    });
  }
  return relationById;
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

function projectRelevantDependencies(
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
    if (relation !== 'dependency' && relation !== 'test_target') {
      continue;
    }
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
