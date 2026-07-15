/** Owned concern: orchestrate validate-before-import interaction for one dialog session. */
import type { DbtProjectImportResult } from '@dvt/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { IDbtProjectImportPort } from '../../ports/dbtProjectImport';
import { ApiError } from '../../services/api/createApiClient';
import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';
import {
  buildDbtProjectImportPresentationModel,
  type DbtProjectImportInteractionState,
} from './dbtProjectImportPresentationModel';

type UseDbtProjectImportControllerOptions = Readonly<{
  open: boolean;
  port: IDbtProjectImportPort;
  onImported: (result: DbtProjectImportResult) => void;
}>;

const INITIAL_STATE: DbtProjectImportInteractionState = {
  phase: 'idle',
  projectRoot: '',
  canvasId: '',
  report: null,
  result: null,
  failureMessage: null,
};

const IMPORT_ERROR_MESSAGE_BY_REASON: Readonly<Record<string, string>> = {
  invalid_dbt_project_import_request: 'Check the project root and Canvas ID, then validate again.',
  dbt_project_import_rejected: 'The project no longer satisfies import policy. Validate it again.',
  dbt_project_import_stale_receipt:
    'Project files changed after validation. Validate the project again.',
  dbt_project_import_canvas_occupied:
    'That Canvas ID already owns a graph. Choose a new Canvas ID.',
  dbt_project_import_authority_conflict:
    'Another authority already owns that Canvas ID. Choose a new Canvas ID.',
  dbt_project_import_idempotency_mismatch:
    'This import identity was reused for different content. Close and reopen the import dialog.',
  dbt_project_import_projection_failed:
    'The server could not project the imported project. Review project diagnostics and retry.',
};

function readErrorReason(responseBody: unknown): string | null {
  if (responseBody == null || typeof responseBody !== 'object') {
    return null;
  }
  const error = (responseBody as { error?: unknown }).error;
  if (error == null || typeof error !== 'object') {
    return null;
  }
  const reason = (error as { reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : null;
}

function presentImportFailure(error: unknown): string {
  if (error instanceof ApiError) {
    const reason = readErrorReason(error.responseBody);
    if (reason != null && IMPORT_ERROR_MESSAGE_BY_REASON[reason] != null) {
      return IMPORT_ERROR_MESSAGE_BY_REASON[reason];
    }
    if (error.category === 'unauthorized') {
      return 'Your API session expired. Sign in again before importing the project.';
    }
    if (error.category === 'forbidden') {
      return 'Your current workspace role cannot perform this project import.';
    }
    if (error.category === 'network') {
      return 'The API could not be reached. Check the coordinated development stack and retry.';
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'The dbt project operation failed without a usable server diagnostic.';
}

function createIdempotencyKey(canvasId: string): string {
  return createBrowserIdempotencyKey(`dbt-project-import:${canvasId}`);
}

export function useDbtProjectImportController({
  open,
  port,
  onImported,
}: UseDbtProjectImportControllerOptions) {
  const [state, setState] = useState<DbtProjectImportInteractionState>(INITIAL_STATE);
  const operationRevision = useRef(0);
  const idempotencyKey = useRef<string | null>(null);

  const invalidateAcceptedValidation = useCallback(
    (field: 'projectRoot' | 'canvasId', value: string) => {
      operationRevision.current += 1;
      idempotencyKey.current = null;
      setState((current) => ({
        ...INITIAL_STATE,
        projectRoot: field === 'projectRoot' ? value : current.projectRoot,
        canvasId: field === 'canvasId' ? value : current.canvasId,
      }));
    },
    []
  );

  useEffect(() => {
    if (!open) {
      operationRevision.current += 1;
      idempotencyKey.current = null;
      setState(INITIAL_STATE);
    }
  }, [open]);

  const validateProject = useCallback(async () => {
    const projectRoot = state.projectRoot.trim();
    const canvasId = state.canvasId.trim();
    if (projectRoot.length === 0 || canvasId.length === 0) {
      return;
    }

    const revision = operationRevision.current + 1;
    operationRevision.current = revision;
    idempotencyKey.current = null;
    setState((current) => ({
      ...current,
      projectRoot,
      canvasId,
      phase: 'validating',
      report: null,
      result: null,
      failureMessage: null,
    }));

    try {
      const report = await port.validateProject({
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot,
      });
      if (operationRevision.current !== revision) {
        return;
      }
      if (report.status === 'accepted') {
        idempotencyKey.current = createIdempotencyKey(canvasId);
      }
      setState((current) => ({
        ...current,
        phase: report.status,
        report,
        result: null,
        failureMessage: null,
      }));
    } catch (error) {
      if (operationRevision.current !== revision) {
        return;
      }
      setState((current) => ({
        ...current,
        phase: 'failed',
        report: null,
        result: null,
        failureMessage: presentImportFailure(error),
      }));
    }
  }, [port, state.canvasId, state.projectRoot]);

  const importProject = useCallback(async () => {
    if (state.report?.status !== 'accepted' || idempotencyKey.current == null) {
      return;
    }

    const revision = operationRevision.current + 1;
    operationRevision.current = revision;
    const commandIdempotencyKey = idempotencyKey.current;
    setState((current) => ({
      ...current,
      phase: 'importing',
      failureMessage: null,
    }));

    try {
      const result = await port.importProject({
        schemaVersion: 'import-dbt-project-command.v1',
        canvasId: state.canvasId,
        conflictPolicy: 'require-unbound-canvas',
        idempotencyKey: commandIdempotencyKey,
        validationReceipt: state.report.receipt,
      });
      if (operationRevision.current !== revision) {
        return;
      }
      setState((current) => ({
        ...current,
        phase: 'imported',
        result,
        failureMessage: null,
      }));
      onImported(result);
    } catch (error) {
      if (operationRevision.current !== revision) {
        return;
      }
      setState((current) => ({
        ...current,
        phase: 'failed',
        result: null,
        failureMessage: presentImportFailure(error),
      }));
    }
  }, [onImported, port, state.canvasId, state.report]);

  const model = useMemo(() => buildDbtProjectImportPresentationModel(state), [state]);

  return {
    model,
    setProjectRoot: (value: string) => invalidateAcceptedValidation('projectRoot', value),
    setCanvasId: (value: string) => invalidateAcceptedValidation('canvasId', value),
    validateProject,
    importProject,
  } as const;
}
