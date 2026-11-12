/**
 * Owned concern: resolve Preview selection from the single authority named by
 * the request, then return server-verified planner input.
 * @baseline PreviewPlan binds selection to the authorized graph and project revision.
 * @decision Re-resolve the named authority and canonicalize technical IDs without locale.
 * @consequence Reordered equivalent graphs match; different identities still reject.
 * @version 1.0.0
 */
import type {
  ExecutionSelection,
  GenericGraphSourceV1,
  PlanPreviewProvenance,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import type { DbtPreviewCompilationGate } from './dbt/DbtPreviewCompilationGate.js';
import { reject } from './dbt/dbtPreviewSelectionPolicy.js';
import { resolveDbtProjectPreviewSelection } from './dbt/resolveDbtProjectPreviewSelection.js';
import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import type { ResolveAuthorizedDvtPreviewSelectionService } from './resolveAuthorizedDvtPreviewSelection.js';
import type {
  ExecutableSubgraphSelectionRejection,
  ResolveAuthorizedExecutableSubgraphService,
} from './resolveAuthorizedExecutableSubgraph.js';

type PreviewSelectionRejection = {
  readonly ok: false;
  readonly rejection: ExecutableSubgraphSelectionRejection;
};

type PreviewSelectionResolution =
  | {
      readonly ok: true;
      readonly value: {
        readonly graphSource: GenericGraphSourceV1;
        readonly nodeIds: readonly string[];
        readonly decisionScopeNodeIds: readonly string[];
        readonly requestedRootNodeIds: readonly string[];
      };
    }
  | PreviewSelectionRejection;

type PreviewSelectionInput = {
  readonly selection: ExecutionSelection;
  readonly graphSource?: GenericGraphSourceV1;
  readonly provenance?: PlanPreviewProvenance;
};

type ExternalPreviewSelectionInput = PreviewSelectionInput & {
  readonly graphSource: GenericGraphSourceV1;
};

export class ResolveAuthorizedPreviewSelectionService {
  public constructor(
    private readonly deps: {
      readonly graphDraftResolver: Pick<ResolveAuthorizedExecutableSubgraphService, 'execute'>;
      readonly dvtPreviewSelectionResolver?: Pick<
        ResolveAuthorizedDvtPreviewSelectionService,
        'execute'
      >;
      readonly projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
      readonly dbtCompilation: Pick<DbtPreviewCompilationGate, 'execute'>;
    }
  ) {}

  public async execute(
    input: PreviewSelectionInput,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewSelectionResolution> {
    if (input.provenance?.kind === 'dvt-protected-workspace-graph') {
      const resolver = this.deps.dvtPreviewSelectionResolver;
      if (resolver === undefined) {
        return reject(
          'dvt_preview_artifact_store_unavailable',
          'DVT Preview requires a configured content-addressed artifact store.'
        );
      }
      return resolver.execute(
        { selection: input.selection, provenance: input.provenance },
        context
      );
    }
    if (input.graphSource === undefined) {
      return reject(
        'preview_graph_source_required',
        'Preview requests outside protected DVT authority require graphSource.'
      );
    }

    const externalInput: ExternalPreviewSelectionInput = {
      ...input,
      graphSource: input.graphSource,
    };
    if (input.provenance?.kind === 'dbt-project-files') {
      return resolveDbtProjectPreviewSelection(externalInput, input.provenance, context, this.deps);
    }

    const graphDraftResult = await this.deps.graphDraftResolver.execute(externalInput, context);
    return graphDraftResult.ok
      ? {
          ok: true,
          value: {
            graphSource: externalInput.graphSource,
            nodeIds: graphDraftResult.value.nodeIds,
            decisionScopeNodeIds: graphDraftResult.value.decisionScopeNodeIds,
            requestedRootNodeIds: [...input.selection.nodeIds],
          },
        }
      : graphDraftResult;
  }
}
