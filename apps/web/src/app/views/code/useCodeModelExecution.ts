/**
 * Owned concern: compile and materialize one accepted Code model through existing execution rails.
 * @baseline ADR-0060: file authority and revision own dbt execution semantics.
 * @decision Keep the accepted plan local to a keyed file/session lifetime; reuse Canvas admission.
 * @consequence An unrelated Canvas preview or a late response cannot enable this file's Run.
 * @version 1.0.0
 */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  useGraphDbtModelCompilationQueryPort,
  useGraphDbtWorkspaceArtifactPublicationCommandPort,
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { PlanViewModel } from '../../types/plans';
import type { FileContent } from '../../ports/workspace';
import { resolveCanvasRunAdmission } from '../canvas/canvasRuntimePolicy';
import { buildDbtProjectFileExecutionStrategy } from '../canvas/dbtProjectFileExecutionStrategy';
import { projectDbtProjectGraphToCanonicalCanvas } from '../canvas/dbtProjectFileProjection';
import { useCanvasExecutionActions } from '../canvas/useCanvasExecutionActions';
import { isCurrentCodeModelRevision } from './codeModelRevision';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';
import { resolveCodeViewCopy } from './codeViewCopy';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';

function rejectFileVerification(error: unknown): never {
  throw new Error(
    resolveCodeWorkbenchErrorPresentation({
      scope: 'file-preview',
      error,
      copy: resolveCodeViewCopy(getApplicationLanguage()),
    }).message
  );
}

export function useCodeModelExecution({
  file,
  project,
  modelId,
  synchronized,
}: Readonly<{
  file: FileContent;
  project: DbtProjectGraphProjection;
  modelId: string;
  synchronized: boolean;
}>) {
  const [plan, setPlan] = useState<PlanViewModel | null>(null);
  const [phase, setPhase] = useState<'idle' | 'compiling' | 'running'>('idle');
  const [runId, setRunId] = useState<string>();
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const permissions = useAuthorizationStore((state) => state.userPermissions);
  const sessionContext = useSessionContext();
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const plansService = usePlansService();
  const shellFeedback = useShellFeedback();
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const expectedScope = sessionContext.getWorkspaceScopeSnapshot();
  async function verifyCurrentFile() {
    const current = await workspaceFilesQuery.getFileContent(file.path);
    const scope = sessionContext.getWorkspaceScopeSnapshot();
    if (
      !mounted.current ||
      !isCurrentCodeModelRevision(
        { file, scope: expectedScope, authorityBinding: project.authorityBinding },
        { file: current, scope }
      )
    ) {
      throw new WorkspaceFileRevisionConflictError(file.path);
    }
  }
  const strategy = useMemo(() => buildDbtProjectFileExecutionStrategy(project), [project]);
  const graph = useMemo(() => projectDbtProjectGraphToCanonicalCanvas(project), [project]);
  const selection = useMemo(
    () => createCanvasExecutionSelectionIntent([modelId], 'explicit'),
    [modelId]
  );
  const workspaceNodeIds = useMemo(() => graph.nodes.map((node) => node.id), [graph]);
  const actions = useCanvasExecutionActions({
    graphDraftCanvasId: null,
    plansService: {
      ...plansService,
      previewPlan: async (input) => {
        await verifyCurrentFile().catch(rejectFileVerification);
        const result = await plansService.previewPlan(input);
        await verifyCurrentFile().catch(rejectFileVerification);
        return result;
      },
    },
    runsService: useRunsService(),
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand:
      useGraphDbtWorkspaceArtifactPublicationCommandPort(),
    graphDbtModelCompilationQuery: useGraphDbtModelCompilationQueryPort(),
    shellFeedback: {
      success: (message) => {
        if (mounted.current) shellFeedback.success(message);
      },
      error: (message) => {
        if (mounted.current) shellFeedback.error(message);
      },
    },
    executionStrategy: strategy,
    canonicalNodes: graph.nodes,
    canonicalEdges: graph.edges,
    selectionIntent: selection,
    workspaceNodeIds,
    canPlan: synchronized && permissions.canPlan,
    runAdmission: resolveCanvasRunAdmission({
      permissionGranted: permissions.canRun,
      executionAvailable: project.capabilities.canRun,
      draftBarrier: synchronized ? null : 'saving',
    }),
    sessionContext,
    currentPlan: plan,
    setCurrentPlan: (value) => {
      if (mounted.current) setPlan(value);
    },
    showBottomDrawer: () => {
      if (mounted.current) showBottomDrawer();
    },
    onRunStarted: (id) => {
      if (mounted.current) setRunId(id);
    },
  });
  const canCompile =
    synchronized && permissions.canPlan && actions.canPlanGraph && phase === 'idle';
  const canExecute = synchronized && actions.canStartRun && phase === 'idle';

  async function compile() {
    if (!canCompile || busy.current) return;
    busy.current = true;
    setPlan(null);
    setPhase('compiling');
    try {
      await actions.handlePreviewExecutionPlan();
    } finally {
      busy.current = false;
      if (mounted.current) setPhase('idle');
    }
  }

  async function execute() {
    if (!canExecute || busy.current) return;
    busy.current = true;
    setPhase('running');
    try {
      await verifyCurrentFile();
      await actions.handleStartRun();
    } catch (error) {
      if (mounted.current) {
        setPlan(null);
        shellFeedback.error(
          resolveCodeWorkbenchErrorPresentation({
            scope: 'file-preview',
            error,
            copy: resolveCodeViewCopy(getApplicationLanguage()),
          }).message
        );
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPhase('idle');
    }
  }

  return {
    compile,
    execute,
    canCompile,
    canExecute,
    phase,
    runId,
    compiled: actions.canStartRun,
    unavailable: !permissions.canPlan || !permissions.canRun || !actions.canPlanGraph,
    blockedReason: actions.planRunReadiness.summary,
  };
}
