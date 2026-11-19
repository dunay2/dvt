/**
 * Owned concern: require native SQL compilation before file-model plan admission.
 * @baseline PreviewPlan binds materialization to an accepted source revision.
 * @decision Compile the authorized resource set with the server-owned target.
 * @consequence Parse results, missing SQL and stale compilations cannot enable Run.
 * @version 1.0.0
 */
import type { DbtProjectGraphProjection, DbtStepSelector } from '@dvt/contracts';

import type {
  DbtProjectAnalysisDependency,
  IDbtProjectAnalyzerPort,
} from '../../ports/dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from '../../ports/workspaceFiles.js';

import { compiledDbtStepSelectors } from './dbtCompiledStepSelectors.js';

type CompilationInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
  contentSetSha256: string;
  dbtVersion: string;
  adapter: string;
  targetName: string;
  resources: readonly Pick<
    DbtProjectGraphProjection['nodes'][number],
    'uniqueId' | 'resourceType' | 'originalFilePath' | 'materialized'
  >[];
}> &
  (
    | { dbtVariablesJson: string; expectedDependencies: readonly DbtProjectAnalysisDependency[] }
    | { dbtVariablesJson?: never; expectedDependencies?: never }
  );

type CompilationResult =
  | Readonly<{ ok: true; selectors: ReadonlyMap<string, DbtStepSelector> }>
  | Readonly<{ ok: false; reason: string }>;

export class DbtPreviewCompilationGate {
  public constructor(private readonly analyzer: IDbtProjectAnalyzerPort) {}

  public async execute(input: CompilationInput): Promise<CompilationResult> {
    const paths = input.resources.map((resource) => resource.originalFilePath);
    if (paths.length === 0 || paths.some((path) => !path?.trim())) {
      return { ok: false, reason: 'The selected dbt resources have no compilable file identity.' };
    }
    try {
      const analysis = await this.analyzer.analyze({
        scope: input.scope,
        projectRoot: input.projectRoot,
        operation: {
          kind: 'compile',
          selectors: [...new Set(paths.map((path) => `path:${path}`))].sort(),
          targetName: input.targetName,
          ...(input.dbtVariablesJson === undefined
            ? {}
            : { dbtVariablesJson: input.dbtVariablesJson }),
        },
      });
      if (
        analysis.status !== 'valid' ||
        analysis.adapterType !== input.adapter ||
        analysis.projectRevision.projectRoot !== input.projectRoot ||
        analysis.projectRevision.contentSetSha256 !== input.contentSetSha256 ||
        analysis.projectRevision.dbtVersion !== input.dbtVersion
      ) {
        return {
          ok: false,
          reason: 'Native dbt compilation did not accept the current project revision and target.',
        };
      }
      const compiled = new Map(analysis.resources.map((resource) => [resource.uniqueId, resource]));
      if (
        input.resources.some((resource) => {
          const result = compiled.get(resource.uniqueId);
          return result?.resourceType !== resource.resourceType || !result.compiledSql?.trim();
        })
      ) {
        return {
          ok: false,
          reason: 'Native dbt compilation produced no SQL for a selected resource.',
        };
      }
      const selected = new Set(input.resources.map(({ uniqueId }) => uniqueId));
      if (input.dbtVariablesJson !== undefined) {
        const resourceChanged = input.resources.some((resource) => {
          const result = compiled.get(resource.uniqueId)!;
          return (
            result.originalFilePath !== resource.originalFilePath ||
            result.materialized !== resource.materialized
          );
        });
        if (
          resourceChanged ||
          !sameSelectedDependencies(selected, analysis.dependencies, input.expectedDependencies)
        ) {
          return {
            ok: false,
            reason:
              'The compiled dbt variables changed the selected model structure or dependencies. Review the model before running.',
          };
        }
      }
      const selectors = compiledDbtStepSelectors(analysis.resources, selected);
      return selectors
        ? { ok: true, selectors }
        : { ok: false, reason: 'A compiled dbt resource has no unambiguous execution selector.' };
    } catch {
      return {
        ok: false,
        reason: 'Native dbt compilation is unavailable. Compile successfully before executing.',
      };
    }
  }
}

function sameSelectedDependencies(
  selected: ReadonlySet<string>,
  actual: readonly DbtProjectAnalysisDependency[],
  expected: readonly DbtProjectAnalysisDependency[]
): boolean {
  const incoming = (edges: readonly DbtProjectAnalysisDependency[]): string[] =>
    edges
      .filter((edge) => selected.has(edge.targetUniqueId))
      .map(({ sourceUniqueId, targetUniqueId, relation }) =>
        JSON.stringify([sourceUniqueId, targetUniqueId, relation])
      );
  const authorized = new Set(incoming(expected));
  const compiled = new Set(incoming(actual));
  return compiled.size === authorized.size && [...compiled].every((edge) => authorized.has(edge));
}
