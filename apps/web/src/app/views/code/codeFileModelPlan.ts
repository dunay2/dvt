/** Owned concern: derive Code compilation and admission from the selected dbt file's actual execution closure. */
import {
  mergeRunParameterDefinitions,
  type DbtProjectGraphProjection,
  type RunParameterOverride,
} from '@dvt/contracts';
import type { IPlansPort } from '../../ports/plans';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { FileContent, IWorkspaceFilesQueryPort } from '../../ports/workspace';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { CanvasPreviewAttempt } from '../canvas/canvasExecutionActions.types';
import { evaluateCanvasExecutionGraph } from '../canvas/canvasExecutionGraph';
import { deriveCanvasExecutionState } from '../canvas/canvasExecutionState';
import { executeCanvasPlanAction } from '../canvas/canvasPlanAction';
import { projectCanvasPreviewOutcome } from '../canvas/canvasPreviewOutcomeProjection';
import type { CanvasRunAdmission } from '../canvas/canvasRuntimePolicy';
import { buildDbtProjectFileExecutionStrategy } from '../canvas/dbtProjectFileExecutionStrategy';
import { projectDbtProjectGraphToCanonicalCanvas } from '../canvas/dbtProjectFileProjection';
import { isCurrentCodeModelRevision } from './codeModelRevision';
import { resolveCodeViewCopy } from './codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';

export async function verifyCodeFilePlanRevision(args: {
  file: FileContent;
  scope: WorkspaceScope;
  authorityBinding: DbtProjectGraphProjection['authorityBinding'];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  sessionContext: SessionContextPort;
  isCurrent: () => boolean;
}) {
  try {
    const file = await args.workspaceFilesQuery.getFileContent(args.file.path);
    if (
      !args.isCurrent() ||
      !isCurrentCodeModelRevision(args, {
        file,
        scope: args.sessionContext.getWorkspaceScopeSnapshot(),
      })
    )
      throw new WorkspaceFileRevisionConflictError(args.file.path);
  } catch (error) {
    const copy = resolveCodeViewCopy(getApplicationLanguage());
    throw new Error(
      resolveCodeWorkbenchErrorPresentation({ scope: 'file-preview', error, copy }).message,
      { cause: error }
    );
  }
}

export function prepareCodeFileModel(project: DbtProjectGraphProjection, modelId: string) {
  const registered = buildDbtProjectFileExecutionStrategy(project);
  const execution = registered.kind === 'dbt_project_file_preview' ? registered : null;
  const { nodes: canonicalNodes, edges: canonicalEdges } =
    projectDbtProjectGraphToCanonicalCanvas(project);
  const selectionIntent = createCanvasExecutionSelectionIntent([modelId], 'explicit');
  const workspaceNodeIds = canonicalNodes.map((node) => node.id);
  const context = {
    graphDraftCanvasId: null,
    canonicalNodes,
    canonicalEdges,
    workspaceNodeIds,
    selectionIntent,
  };
  const graph = evaluateCanvasExecutionGraph({ ...context, registeredStrategy: execution });
  const selected = new Set(graph.selectedNodeIds);
  const resources = project.nodes.filter((node) => selected.has(node.uniqueId));
  let parameters;
  try {
    parameters = resources.some((node) => node.runParameterError !== undefined)
      ? null
      : mergeRunParameterDefinitions(resources.map((node) => node.runParameters ?? []));
  } catch {
    parameters = null;
  }
  return { context, execution, graph, parameters };
}

export function observeCodeFilePlan(
  model: ReturnType<typeof prepareCodeFileModel>,
  runAdmission: CanvasRunAdmission,
  attempt: CanvasPreviewAttempt | null
) {
  return deriveCanvasExecutionState({
    graph: model.graph,
    runAdmission,
    currentPlan: attempt ? projectCanvasPreviewOutcome(attempt.outcome).currentPlan : null,
    lastPlannedDraftSignature: attempt?.draftSignature ?? null,
    latestPreviewOutcome: attempt?.outcome ?? null,
  }).planRunReadiness;
}

export function compileCodeFilePlan(args: {
  model: ReturnType<typeof prepareCodeFileModel>;
  sessionContext: SessionContextPort;
  plansService: IPlansPort;
  canPlan: boolean;
  verify: () => Promise<void>;
  overrides: RunParameterOverride[];
}) {
  return executeCanvasPlanAction({
    ...args.model.context,
    execution: args.model.execution,
    canPlan: args.canPlan,
    sessionContext: args.sessionContext,
    plansService: {
      previewPlan: async (input) => {
        await args.verify();
        const result = await args.plansService.previewPlan({
          ...input,
          ...(args.overrides.length ? { parameterOverrides: args.overrides } : {}),
        });
        await args.verify();
        return result;
      },
    },
  });
}
