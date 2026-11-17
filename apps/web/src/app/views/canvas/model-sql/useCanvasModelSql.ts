/** Coordinate an explicit SQL buffer transaction with existing query and Model command ports. */
import { useEffect, useReducer, useRef } from 'react';
import { MODEL_SQL_MAX_LENGTH, type ModelSqlCompilationResponse } from '@dvt/contracts';

import type { ICanvasModelSqlQueryPort, ModelSqlFailure } from '../../../ports/canvasModelSql';
import type { CanonicalNode } from '../../../types/canonical';
import type { CanvasModelPreviewPreparation } from '../canvasDraftLifecycle.types';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeApplyResult,
} from '../canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';
import {
  initialModelSqlDraft,
  modelSqlDraftReducer,
  hasModelSqlChanges,
  currentModelSqlAnalysis,
} from './modelSqlDraftState';
import { useModelSqlAnalysis } from './useModelSqlAnalysis';
import { applyModelSqlProposal, useModelSqlApplyCommand } from './modelSqlApplyCommand';

export function useCanvasModelSql(
  args: Readonly<{
    canvasId: string;
    node: CanonicalNode;
    revision: string;
    open: boolean;
    query?: ICanvasModelSqlQueryPort;
    authoring?: CanvasRelationalTreeAuthoringContract;
    visual: React.RefObject<CanvasRelationalTreeWorkbenchHandle>;
    preparePreview?: CanvasModelPreviewPreparation;
    onOpenData: () => void;
    onApplyingChange?: (applying: boolean) => void;
  }>
) {
  const [state, dispatch] = useReducer(modelSqlDraftReducer, initialModelSqlDraft);
  const latest = useRef(state);
  latest.current = state;
  const request = useModelSqlAnalysis(args.revision);
  const command = useModelSqlApplyCommand(args.onApplyingChange);
  request.observeBuffer(state.sql);
  const target = { canvasId: args.canvasId, transformNodeId: args.node.id };
  const lastRevision = useRef(args.revision);
  const [problem, setProblem] = useReducer(
    (_old: 'conflict' | 'applyFailed' | null, value: 'conflict' | 'applyFailed' | null) => value,
    null
  );
  useEffect(() => {
    if (lastRevision.current === args.revision) return;
    lastRevision.current = args.revision;
    dispatch({ type: 'invalidate' });
  }, [args.revision]);
  const fail = (reason: ModelSqlFailure) => dispatch({ type: 'failure', reason });
  const loadContext = async () => {
    if (args.query == null || command.isApplying()) return;
    dispatch({ type: 'pending', action: 'context' });
    await request.run(
      null,
      async (signal, current) => {
        const saved = await args.preparePreview?.();
        if (saved != null && !saved.ok) throw new Error('Model save was rejected.');
        const context = await args.query!.context(target, signal);
        if (current()) dispatch({ type: 'context', context });
        return context;
      },
      fail
    );
  };
  useEffect(() => {
    if (args.open) void loadContext();
  }, [args.open, args.revision, command.applying]);

  const perform = async (
    action: 'validate' | 'execute'
  ): Promise<ModelSqlCompilationResponse | null> => {
    const sql = latest.current.sql;
    if (
      args.query == null ||
      sql.trim().length === 0 ||
      sql.length > MODEL_SQL_MAX_LENGTH ||
      request.busy ||
      command.isApplying()
    )
      return null;
    setProblem(null);
    dispatch({ type: 'pending', action });
    return request.run(
      sql,
      async (signal, current) => {
        const saved = await args.preparePreview?.();
        if (!current()) return null;
        if (saved != null && !saved.ok) throw new Error('Model save was rejected.');
        const context = latest.current.context ?? (await args.query!.context(target, signal));
        if (!current()) return null;
        if (latest.current.context == null) dispatch({ type: 'context', context });
        const input = {
          ...target,
          draftRevision: context.draftRevision,
          contextSha256: context.contextSha256,
          sql,
        };
        if (action === 'execute') {
          args.onOpenData();
          const result = await args.query!.preview(
            { ...input, schemaVersion: 'canvas-transform-sql-draft-data-sample.v1', limit: 20 },
            signal
          );
          if (current()) dispatch({ type: 'data', sql, result });
          return null;
        }
        const proposal = await args.query!.compile(input, signal);
        if (!current()) return null;
        dispatch({ type: 'analysis', sql, result: proposal });
        return proposal;
      },
      fail
    );
  };
  const generate = async (): Promise<CanvasRelationalTreeApplyResult | null> => {
    if (args.visual.current?.hasUnappliedChanges) {
      setProblem('conflict');
      return null;
    }
    const sql = latest.current.sql;
    const proposal = await perform('validate');
    if (proposal?.status !== 'valid' || latest.current.sql !== sql) return null;
    if (args.visual.current?.hasUnappliedChanges) {
      setProblem('conflict');
      return null;
    }
    try {
      const applied = await command.run((signal) =>
        applyModelSqlProposal(args.node, args.authoring, proposal, signal)
      );
      if (applied?.outcome === 'rejected') setProblem('applyFailed');
      else if (applied != null)
        dispatch({
          type: 'applied',
          sql,
          semanticSha256: proposal.semanticDocument.semanticPlan.sha256,
        });
      return applied;
    } catch {
      setProblem('applyFailed');
      return null;
    }
  };
  const pending = command.applying ? 'generate' : request.busy ? state.pending : null;
  const analysis = currentModelSqlAnalysis(state);
  return {
    state,
    analysis,
    pending,
    problem,
    dirty: hasModelSqlChanges(state),
    staleData:
      state.data != null &&
      (state.data.sql !== state.sql ||
        state.data.result.contextSha256 !== state.context?.contextSha256),
    setSql: (sql: string) => {
      if (command.isApplying()) return;
      if (latest.current.pending !== 'context') request.cancel();
      request.observeBuffer(sql);
      dispatch({ type: 'text', sql });
    },
    loadContext,
    validate: () => perform('validate'),
    execute: () => perform('execute'),
    generate,
    discard: () => {
      command.cancel();
      request.cancel();
      dispatch({ type: 'discard' });
      setProblem(null);
    },
    cancel: () => {
      command.cancel();
      request.cancel();
      dispatch({ type: 'pending', action: null });
    },
  };
}
