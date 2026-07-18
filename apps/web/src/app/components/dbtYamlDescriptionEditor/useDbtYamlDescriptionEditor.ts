/** Owned concern: orchestrate one propose/apply/revert dbt YAML description transaction. */
import type { DbtYamlDescriptionAppliedReceipt } from '@dvt/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { IDbtYamlDescriptionEditPort } from '../../ports/dbtYamlDescriptionEdit';
import { ApiError } from '../../services/api/createApiClient';
import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';
import { DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON } from '../../services/dbtProject/dbtYamlDescriptionEdit.api';
import type { DbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';
import {
  createDbtYamlDescriptionEditorState,
  hasDbtYamlDescriptionChanges,
  normalizeDbtYamlDescriptionDraft,
} from './dbtYamlDescriptionEditorModel';

type UseDbtYamlDescriptionEditorOptions = Readonly<{
  canvasId: string;
  resourceUniqueId: string;
  currentDescription: string | null;
  port: IDbtYamlDescriptionEditPort;
  copy: DbtYamlDescriptionEditorCopy;
  onProjectChanged: () => Promise<void>;
  onReloadLatest: () => Promise<string | null>;
}>;

function readErrorReason(responseBody: unknown): string | null {
  if (responseBody == null || typeof responseBody !== 'object') return null;
  const error = (responseBody as { error?: unknown }).error;
  if (error == null || typeof error !== 'object') return null;
  const reason = (error as { reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : null;
}

function presentFailure(
  error: unknown,
  copy: DbtYamlDescriptionEditorCopy
): Readonly<{ kind: 'conflict' | 'error'; message: string }> {
  if (error instanceof ApiError) {
    const reason = readErrorReason(error.responseBody);
    if (reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.revisionConflict) {
      return { kind: 'conflict', message: copy.revisionConflictMessage };
    }
    if (
      reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.proposalMismatch ||
      reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.receiptInvalid ||
      reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.authorityRequired
    ) {
      return { kind: 'conflict', message: copy.proposalConflictMessage };
    }
    if (reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.idempotencyConflict) {
      return { kind: 'conflict', message: copy.idempotencyConflictMessage };
    }
    if (
      reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.resourceNotFound ||
      reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.resourceAmbiguous
    ) {
      return { kind: 'error', message: copy.resourceUnavailableMessage };
    }
    if (reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.resourceUnsupported) {
      return { kind: 'error', message: copy.resourceUnsupportedMessage };
    }
    if (reason === DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON.documentInvalid) {
      return { kind: 'error', message: copy.documentInvalidMessage };
    }
    if (error.category === 'unauthorized') {
      return { kind: 'error', message: copy.unauthorizedMessage };
    }
    if (error.category === 'forbidden') {
      return { kind: 'error', message: copy.forbiddenMessage };
    }
    if (error.category === 'network') {
      return { kind: 'error', message: copy.networkMessage };
    }
  }

  return { kind: 'error', message: copy.unknownFailureMessage };
}

export function useDbtYamlDescriptionEditor(options: UseDbtYamlDescriptionEditorOptions) {
  const {
    canvasId,
    resourceUniqueId,
    currentDescription,
    port,
    copy,
    onProjectChanged,
    onReloadLatest,
  } = options;
  const [state, setState] = useState(() => createDbtYamlDescriptionEditorState(currentDescription));
  const operationRevision = useRef(0);
  const resourceIdentity = useRef(resourceUniqueId);
  const applyKeyByProposal = useRef(new Map<string, string>());
  const revertKeyByReceipt = useRef(new Map<string, string>());

  useEffect(() => {
    if (resourceIdentity.current !== resourceUniqueId) {
      resourceIdentity.current = resourceUniqueId;
      operationRevision.current += 1;
      applyKeyByProposal.current.clear();
      revertKeyByReceipt.current.clear();
      setState(createDbtYamlDescriptionEditorState(currentDescription));
      return;
    }

    setState((current) => {
      if (
        current.phase !== 'editing' ||
        hasDbtYamlDescriptionChanges(current) ||
        current.baselineDescription === currentDescription
      ) {
        return current;
      }
      return createDbtYamlDescriptionEditorState(currentDescription);
    });
  }, [currentDescription, resourceUniqueId]);

  const setDraft = useCallback((draft: string) => {
    operationRevision.current += 1;
    setState((current) => ({
      ...current,
      phase: 'editing',
      draft,
      proposal: null,
      appliedReceipt: null,
      failureMessage: null,
      refreshFailureMessage: null,
    }));
  }, []);

  const review = useCallback(async () => {
    const revision = ++operationRevision.current;
    const baselineDescription = state.baselineDescription;
    const nextDescription = normalizeDbtYamlDescriptionDraft(state.draft);
    setState((current) => ({
      ...current,
      phase: 'proposing',
      proposal: null,
      failureMessage: null,
      refreshFailureMessage: null,
    }));
    try {
      const proposal = await port.propose({
        canvasId,
        resourceUniqueId,
        nextDescription,
      });
      if (operationRevision.current !== revision) return;
      if (proposal.previousDescription !== baselineDescription) {
        setState((current) => ({
          ...current,
          phase: 'conflict',
          failureMessage: copy.revisionConflictMessage,
        }));
        return;
      }
      setState((current) => ({
        ...current,
        phase: 'reviewing',
        proposal,
      }));
    } catch (error) {
      if (operationRevision.current !== revision) return;
      const failure = presentFailure(error, copy);
      setState((current) => ({
        ...current,
        phase: failure.kind === 'conflict' ? 'conflict' : 'editing',
        failureMessage: failure.message,
      }));
    }
  }, [canvasId, copy, port, resourceUniqueId, state.baselineDescription, state.draft]);

  const discardReview = useCallback(() => {
    operationRevision.current += 1;
    setState((current) => ({
      ...current,
      phase: 'editing',
      proposal: null,
      failureMessage: null,
    }));
  }, []);

  const apply = useCallback(async () => {
    const proposal = state.proposal;
    if (proposal == null) return;
    const revision = ++operationRevision.current;
    const idempotencyKey =
      applyKeyByProposal.current.get(proposal.proposalDigest) ??
      createBrowserIdempotencyKey(`dbt-description-apply:${resourceUniqueId}`);
    applyKeyByProposal.current.set(proposal.proposalDigest, idempotencyKey);
    setState((current) => ({ ...current, phase: 'applying', failureMessage: null }));
    try {
      const appliedReceipt = await port.apply({ proposal, idempotencyKey });
      if (operationRevision.current !== revision) return;
      setState((current) => ({
        ...current,
        phase: 'applied',
        baselineDescription: appliedReceipt.nextDescription,
        draft: appliedReceipt.nextDescription ?? '',
        proposal: null,
        appliedReceipt,
      }));
      try {
        await onProjectChanged();
      } catch {
        if (operationRevision.current !== revision) return;
        setState((current) => ({
          ...current,
          refreshFailureMessage: copy.refreshFailedMessage,
        }));
      }
    } catch (error) {
      if (operationRevision.current !== revision) return;
      const failure = presentFailure(error, copy);
      setState((current) => ({
        ...current,
        phase: failure.kind === 'conflict' ? 'conflict' : 'reviewing',
        failureMessage: failure.message,
      }));
    }
  }, [copy, onProjectChanged, port, resourceUniqueId, state.proposal]);

  const revert = useCallback(async () => {
    const appliedReceipt: DbtYamlDescriptionAppliedReceipt | null = state.appliedReceipt;
    if (appliedReceipt == null) return;
    const revision = ++operationRevision.current;
    const idempotencyKey =
      revertKeyByReceipt.current.get(appliedReceipt.receiptId) ??
      createBrowserIdempotencyKey(`dbt-description-revert:${resourceUniqueId}`);
    revertKeyByReceipt.current.set(appliedReceipt.receiptId, idempotencyKey);
    setState((current) => ({ ...current, phase: 'reverting', failureMessage: null }));
    try {
      const receipt = await port.revert({
        appliedReceiptId: appliedReceipt.receiptId,
        idempotencyKey,
      });
      if (operationRevision.current !== revision) return;
      setState((current) => ({
        ...current,
        phase: 'reverted',
        baselineDescription: receipt.restoredDescription,
        draft: receipt.restoredDescription ?? '',
        proposal: null,
        appliedReceipt: null,
      }));
      try {
        await onProjectChanged();
      } catch {
        if (operationRevision.current !== revision) return;
        setState((current) => ({
          ...current,
          refreshFailureMessage: copy.refreshFailedMessage,
        }));
      }
    } catch (error) {
      if (operationRevision.current !== revision) return;
      const failure = presentFailure(error, copy);
      setState((current) => ({
        ...current,
        phase: failure.kind === 'conflict' ? 'conflict' : 'applied',
        failureMessage: failure.message,
      }));
    }
  }, [copy, onProjectChanged, port, resourceUniqueId, state.appliedReceipt]);

  const reloadLatest = useCallback(async () => {
    const revision = ++operationRevision.current;
    setState((current) => ({ ...current, phase: 'reloading', failureMessage: null }));
    try {
      const description = await onReloadLatest();
      if (operationRevision.current !== revision) return;
      applyKeyByProposal.current.clear();
      revertKeyByReceipt.current.clear();
      setState(createDbtYamlDescriptionEditorState(description));
    } catch {
      if (operationRevision.current !== revision) return;
      setState((current) => ({
        ...current,
        phase: 'conflict',
        failureMessage: copy.refreshFailedMessage,
      }));
    }
  }, [copy.refreshFailedMessage, onReloadLatest]);

  const continueEditing = useCallback(() => {
    operationRevision.current += 1;
    setState((current) => ({
      ...current,
      phase: 'editing',
      proposal: null,
      appliedReceipt: null,
      failureMessage: null,
      refreshFailureMessage: null,
    }));
  }, []);

  return {
    state,
    commands: {
      setDraft,
      review,
      discardReview,
      apply,
      revert,
      reloadLatest,
      continueEditing,
    },
  } as const;
}
