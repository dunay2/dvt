/**
 * Owned concern: require native SQL compilation before file-model plan admission.
 * @baseline PreviewPlan binds materialization to an accepted source revision.
 * @decision Compile the authorized resource set with the server-owned target.
 * @consequence Parse results, missing SQL and stale compilations cannot enable Run.
 * @version 1.0.0
 */
import type { DbtProjectGraphProjection } from '@dvt/contracts';

import type { IDbtProjectAnalyzerPort } from '../../ports/dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from '../../ports/workspaceFiles.js';

type CompilationInput = Readonly<{
  scope: WorkspaceStorageScope;
  projectRoot: string;
  contentSetSha256: string;
  dbtVersion: string;
  adapter: string;
  targetName: string;
  resources: readonly Pick<
    DbtProjectGraphProjection['nodes'][number],
    'uniqueId' | 'resourceType' | 'originalFilePath'
  >[];
}>;

type CompilationResult = Readonly<{ ok: true }> | Readonly<{ ok: false; reason: string }>;

export class DbtPreviewCompilationGate {
  public constructor(private readonly analyzer: IDbtProjectAnalyzerPort) {}

  public async execute(input: CompilationInput): Promise<CompilationResult> {
    const selectors = input.resources.map((resource) => resource.originalFilePath);
    if (selectors.length === 0 || selectors.some((path) => !path?.trim())) {
      return { ok: false, reason: 'The selected dbt resources have no compilable file identity.' };
    }
    try {
      const analysis = await this.analyzer.analyze({
        scope: input.scope,
        projectRoot: input.projectRoot,
        operation: {
          kind: 'compile',
          selectors: [...new Set(selectors.map((path) => `path:${path}`))].sort(),
          targetName: input.targetName,
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
      return { ok: true };
    } catch {
      return {
        ok: false,
        reason: 'Native dbt compilation is unavailable. Compile successfully before executing.',
      };
    }
  }
}
