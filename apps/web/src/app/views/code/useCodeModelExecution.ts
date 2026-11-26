/**
 * Owned concern: sequence a Code user's command against one current file and one accepted plan.
 * @decision Run with parameters uses the returned compilation receipt in the same gesture.
 * @consequence Cancelled dialogs, changed files and subsequent sessions cannot submit a late plan.
 */
import type { DbtProjectGraphProjection, RunParameterOverride } from '@dvt/contracts';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FileContent } from '../../ports/workspace';
import {
  usePlansService,
  useRunsService,
  useSessionContext,
  useShellFeedback,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasPreviewAttempt } from '../canvas/canvasExecutionActions.types';
import {
  presentCanvasRunStartFailure,
  presentPlanRunReadiness,
} from '../canvas/canvasReadinessPresentation';
import { resolveCanvasRunAdmission } from '../canvas/canvasRuntimePolicy';
import { executeCanvasRunStartAction } from '../canvas/canvasRunStartAction';
import { canvasViewCopy } from '../canvas/copy';
import {
  compileCodeFilePlan,
  observeCodeFilePlan,
  prepareCodeFileModel,
  verifyCodeFilePlanRevision,
} from './codeFileModelPlan';
import { resolveCodeModelCommandCopy } from './codeViewCopy';

type Command = 'compile' | 'execute';
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
  const model = useMemo(() => prepareCodeFileModel(project, modelId), [project, modelId]);
  const [accepted, setAccepted] = useState<CanvasPreviewAttempt | null>(null);
  const [phase, setPhase] = useState<'idle' | 'compiling' | 'running'>('idle');
  const [runId, setRunId] = useState<string>();
  const [dialog, setDialog] = useState<Command | 'parameters' | null>(null);
  const [overrides, setOverrides] = useState<RunParameterOverride[]>();
  const generation = useRef(0);
  const busy = useRef(false);
  useLayoutEffect(
    () => () => {
      generation.current++;
    },
    []
  );
  const permissions = useAuthorizationStore((state) => state.userPermissions);
  const sessionContext = useSessionContext();
  const workspaceFilesQuery = useWorkspaceFilesQueryPort();
  const plansService = usePlansService();
  const runsService = useRunsService();
  const feedback = useShellFeedback();
  const scope = sessionContext.getWorkspaceScopeSnapshot();
  const runAdmission = () =>
    resolveCanvasRunAdmission({
      permissionGranted: useAuthorizationStore.getState().userPermissions.canRun,
      executionAvailable: project.capabilities.canRun,
      draftBarrier: synchronized ? null : 'saving',
    });
  const readiness = observeCodeFilePlan(model, runAdmission(), accepted);
  const canCompile = canCompileCodeModel({
    synchronized,
    canPlan: permissions.canPlan,
    model,
    phase,
  });
  const parameterized = Boolean(model.parameters?.length);
  const canExecute = parameterized
    ? canCompile && runAdmission().allowed
    : synchronized && phase === 'idle' && readiness.status === 'ready';

  async function compileAttempt(
    command: Command,
    values: RunParameterOverride[],
    verify: () => ReturnType<typeof verifyCodeFilePlanRevision>,
    current: () => boolean
  ): Promise<CanvasPreviewAttempt | null> {
    if (parameterized) setRunId(undefined);
    setAccepted(null);
    setPhase('compiling');
    const result = await compileCodeFilePlan({
      model,
      sessionContext,
      plansService,
      canPlan: canCompile,
      overrides: values,
      verify,
    });
    if (!current()) return null;
    if (!result.ok) {
      feedback.error(result.message);
      return null;
    }
    const attempt = { draftSignature: result.draftSignature, outcome: result.previewOutcome };
    setAccepted(attempt);
    const observed = observeCodeFilePlan(model, runAdmission(), attempt);
    if (attempt.outcome.kind !== 'accepted') {
      feedback.error(presentPlanRunReadiness(observed).summary);
      return null;
    }

    if (command === 'compile') {
      feedback.success(canvasViewCopy.planCreatedMessage);
      setDialog(null);
      return null;
    }
    return attempt;
  }

  async function runAttempt(
    attempt: CanvasPreviewAttempt | null,
    verify: () => ReturnType<typeof verifyCodeFilePlanRevision>,
    current: () => boolean
  ): Promise<void> {
    // Parameterized Preview already re-read the file after receiving this exact plan.
    if (!parameterized) await verify();
    if (!current()) return;
    setPhase('running');
    setDialog(null);
    const result = await executeCanvasRunStartAction({
      observeReadiness: () => observeCodeFilePlan(model, runAdmission(), attempt),
      runsService,
      sessionContext,
    });
    if (!current()) return;
    if (!result.ok) {
      feedback.error(presentCanvasRunStartFailure(result.failure).message);
      return;
    }
    useUiLayoutStore.getState().showBottomDrawer();
    feedback.success(canvasViewCopy.runStartedMessage);
    setRunId(result.runId);
  }

  async function submit(command: Command, values: RunParameterOverride[]) {
    if (busy.current) return;
    if (!{ compile: canCompile, execute: canExecute }[command]) return;
    busy.current = true;
    const token = ++generation.current;
    const current = () => token === generation.current;
    const verify = () =>
      verifyCodeFilePlanRevision({
        file,
        scope,
        authorityBinding: project.authorityBinding,
        workspaceFilesQuery,
        sessionContext,
        isCurrent: current,
      });
    try {
      let attempt = accepted;
      if (command === 'compile' || parameterized) {
        attempt = await compileAttempt(command, values, verify, current);
        if (attempt == null) return;
      }
      await runAttempt(attempt, verify, current);
    } catch (error) {
      if (current()) {
        setAccepted(null);
        feedback.error(resolveCodeModelCommandError(error));
      }
    } finally {
      finishAttempt(current);
    }
  }
  function finishAttempt(current?: () => boolean): void {
    if (current && !current()) return;
    busy.current = false;
    setPhase('idle');
  }
  function cancel() {
    generation.current++;
    finishAttempt();
    setDialog(null);
  }
  async function request(command: Command) {
    if (busy.current) return;
    if (!{ compile: canCompile, execute: canExecute }[command]) return;
    if (parameterized && overrides === undefined) setDialog(command);
    else await submit(command, overrides ?? []);
  }
  return {
    compile: () => request('compile'),
    execute: () => request('execute'),
    configureParameters: () => {
      if (!parameterized) return;
      if (!canCompile) return;
      if (busy.current) return;
      setDialog('parameters');
    },
    canCompile,
    canExecute,
    phase,
    runId,
    compiled: readiness.status === 'ready',
    parameterized,
    unavailable:
      !permissions.canPlan ||
      !permissions.canRun ||
      !model.graph.canPlanGraph ||
      model.parameters === null,
    blockedReason:
      model.parameters === null
        ? resolveCodeModelCommandCopy(getApplicationLanguage()).conflict
        : presentPlanRunReadiness(readiness).summary,
    parameters: model.parameters,
    environmentId: scope.environmentId,
    overrides: overrides ?? [],
    dialog,
    cancel,
    confirm: async (values: RunParameterOverride[]) => {
      if (!dialog || busy.current) return;
      setOverrides(values);
      if (dialog !== 'parameters') return submit(dialog, values);
      if (JSON.stringify(values) !== JSON.stringify(overrides)) setAccepted(null);
      setDialog(null);
    },
  };
}

function canCompileCodeModel({
  synchronized,
  canPlan,
  model,
  phase,
}: Readonly<{
  synchronized: boolean;
  canPlan: boolean;
  model: ReturnType<typeof prepareCodeFileModel>;
  phase: string;
}>): boolean {
  return (
    synchronized &&
    canPlan &&
    model.graph.canPlanGraph &&
    model.parameters !== null &&
    phase === 'idle'
  );
}

function resolveCodeModelCommandError(error: unknown): string {
  return error instanceof Error ? error.message : canvasViewCopy.runFailedMessage;
}
