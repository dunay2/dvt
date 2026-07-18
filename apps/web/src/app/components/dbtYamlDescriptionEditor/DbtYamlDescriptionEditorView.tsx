/** Owned concern: render the passive dbt YAML description transaction surface. */
import type { DbtYamlDescriptionAppliedReceipt } from '@dvt/contracts';
import { AlertTriangle, CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { DbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';
import {
  hasDbtYamlDescriptionChanges,
  isDbtYamlDescriptionEditorBusy,
  type DbtYamlDescriptionEditorState,
} from './dbtYamlDescriptionEditorModel';
import { dbtYamlDescriptionEditorVisualTokens as tokens } from './dbtYamlDescriptionEditorVisualTokens';

export type DbtYamlDescriptionEditorViewProps = Readonly<{
  path: string;
  copy: DbtYamlDescriptionEditorCopy;
  state: DbtYamlDescriptionEditorState;
  onDraftChange: (value: string) => void;
  onReview: () => void;
  onDiscardReview: () => void;
  onApply: () => void;
  onRevert: () => void;
  onReloadLatest: () => void;
  onContinueEditing: () => void;
}>;

function abbreviateReference(value: string): string {
  return value.slice(0, 12);
}

function ReceiptReference({
  label,
  value,
}: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          data-full-value={value}
          aria-label={`${label}: ${value}`}
          className={tokens.receiptValue}
        >
          {abbreviateReference(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{value}</TooltipContent>
    </Tooltip>
  );
}

function resolveAnalysisStatusLabel(
  freshness: DbtYamlDescriptionAppliedReceipt['analysis']['freshness'],
  copy: DbtYamlDescriptionEditorCopy
): string {
  switch (freshness) {
    case 'fresh':
      return copy.analysisFreshLabel;
    case 'stale-last-valid':
      return copy.analysisStaleLabel;
    case 'invalid':
      return copy.analysisInvalidLabel;
    case 'unavailable':
      return copy.analysisUnavailableLabel;
  }
}

function AppliedReceiptView({
  copy,
  receipt,
}: Readonly<{
  copy: DbtYamlDescriptionEditorCopy;
  receipt: DbtYamlDescriptionAppliedReceipt;
}>): JSX.Element {
  return (
    <section data-slot="dbt-yaml-description-receipt" className={tokens.receipt}>
      <h4 className={tokens.receiptTitle}>{copy.receiptLabel}</h4>
      <TooltipProvider delayDuration={250}>
        <dl className={tokens.receiptGrid}>
          <dt className={tokens.receiptLabel}>{copy.receiptIdLabel}</dt>
          <dd>
            <ReceiptReference label={copy.receiptIdLabel} value={receipt.receiptId} />
          </dd>
          <dt className={tokens.receiptLabel}>{copy.fileRevisionLabel}</dt>
          <dd>
            <ReceiptReference label={copy.fileRevisionLabel} value={receipt.appliedContentSha256} />
          </dd>
          <dt className={tokens.receiptLabel}>{copy.analysisRevisionLabel}</dt>
          <dd>
            <ReceiptReference
              label={copy.analysisRevisionLabel}
              value={receipt.analysis.analysisSha256}
            />
          </dd>
          <dt className={tokens.receiptLabel}>{copy.projectRevisionLabel}</dt>
          <dd>
            <ReceiptReference
              label={copy.projectRevisionLabel}
              value={receipt.analysis.projectContentSetSha256}
            />
          </dd>
          <dt className={tokens.receiptLabel}>{copy.analysisStatusLabel}</dt>
          <dd className={tokens.receiptStatus}>
            {resolveAnalysisStatusLabel(receipt.analysis.freshness, copy)}
          </dd>
        </dl>
      </TooltipProvider>
    </section>
  );
}

export function DbtYamlDescriptionEditorView({
  path,
  copy,
  state,
  onDraftChange,
  onReview,
  onDiscardReview,
  onApply,
  onRevert,
  onReloadLatest,
  onContinueEditing,
}: DbtYamlDescriptionEditorViewProps): JSX.Element {
  const fieldId = useId();
  const diffRef = useRef<HTMLPreElement>(null);
  const busy = isDbtYamlDescriptionEditorBusy(state);
  const hasChanges = hasDbtYamlDescriptionChanges(state);
  const readOnly = !['editing', 'proposing'].includes(state.phase);

  useEffect(() => {
    if (state.phase === 'reviewing') {
      diffRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [state.phase, state.proposal?.proposalDigest]);

  return (
    <section data-slot="dbt-yaml-description-editor" className={tokens.root}>
      <div className={tokens.headingRow}>
        <h3 className={tokens.title}>{copy.title}</h3>
        <p className={tokens.path} title={path}>
          {path}
        </p>
      </div>

      <div className={tokens.formGroup}>
        <label htmlFor={fieldId} className={tokens.label}>
          {copy.fieldLabel}
        </label>
        <Textarea
          id={fieldId}
          data-slot="dbt-yaml-description-input"
          className={tokens.textarea}
          value={state.draft}
          placeholder={copy.emptyPlaceholder}
          maxLength={65_536}
          readOnly={readOnly}
          aria-describedby={`${fieldId}-hint`}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <div id={`${fieldId}-hint`} className={tokens.metadataRow}>
          <span>{copy.fieldHint}</span>
          <span>{`${state.draft.length.toLocaleString()} ${copy.characterCountLabel}`}</span>
        </div>
      </div>

      {state.failureMessage == null ? null : (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{state.phase === 'conflict' ? copy.reviewTitle : copy.title}</AlertTitle>
          <AlertDescription>{state.failureMessage}</AlertDescription>
        </Alert>
      )}

      {state.refreshFailureMessage == null ? null : (
        <Alert className={tokens.warningAlert}>
          <AlertTriangle />
          <AlertDescription>{state.refreshFailureMessage}</AlertDescription>
        </Alert>
      )}

      {state.proposal == null ? null : (
        <Alert className={tokens.alert}>
          <AlertTitle>{copy.reviewTitle}</AlertTitle>
          <AlertDescription>
            <p>{copy.reviewMessage}</p>
            <p>{`${copy.fileLabel}: ${state.proposal.path}`}</p>
          </AlertDescription>
          <pre
            ref={diffRef}
            data-slot="dbt-yaml-description-diff"
            aria-label={copy.diffLabel}
            className={tokens.diff}
          >
            {state.proposal.unifiedDiff}
          </pre>
        </Alert>
      )}

      {state.phase === 'applied' || state.phase === 'reverting' ? (
        <Alert className={tokens.successAlert}>
          <CheckCircle2 />
          <AlertTitle>{copy.appliedTitle}</AlertTitle>
          <AlertDescription>{copy.appliedMessage}</AlertDescription>
        </Alert>
      ) : null}

      {state.appliedReceipt == null ? null : (
        <AppliedReceiptView copy={copy} receipt={state.appliedReceipt} />
      )}

      {state.phase === 'reverted' ? (
        <Alert className={tokens.successAlert}>
          <RotateCcw />
          <AlertTitle>{copy.revertedTitle}</AlertTitle>
          <AlertDescription>{copy.revertedMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className={tokens.actions}>
        {state.phase === 'editing' || state.phase === 'proposing' ? (
          <>
            {!hasChanges && state.failureMessage == null ? (
              <span className={tokens.hint}>{copy.noChangesMessage}</span>
            ) : null}
            <Button
              type="button"
              size="sm"
              data-slot="dbt-yaml-description-review"
              disabled={!hasChanges || busy}
              onClick={onReview}
            >
              {state.phase === 'proposing' ? <LoaderCircle className={tokens.spinner} /> : null}
              {state.phase === 'proposing' ? copy.reviewingAction : copy.reviewAction}
            </Button>
          </>
        ) : null}

        {state.phase === 'reviewing' || state.phase === 'applying' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onDiscardReview}
            >
              {copy.discardReviewAction}
            </Button>
            <Button
              type="button"
              size="sm"
              data-slot="dbt-yaml-description-apply"
              disabled={busy}
              onClick={onApply}
            >
              {state.phase === 'applying' ? <LoaderCircle className={tokens.spinner} /> : null}
              {state.phase === 'applying' ? copy.applyingAction : copy.applyAction}
            </Button>
          </>
        ) : null}

        {state.phase === 'applied' || state.phase === 'reverting' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onContinueEditing}
            >
              {copy.continueAction}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-slot="dbt-yaml-description-revert"
              disabled={busy}
              onClick={onRevert}
            >
              {state.phase === 'reverting' ? (
                <LoaderCircle className={tokens.spinner} />
              ) : (
                <RotateCcw />
              )}
              {state.phase === 'reverting' ? copy.revertingAction : copy.revertAction}
            </Button>
          </>
        ) : null}

        {state.phase === 'reverted' ? (
          <Button type="button" size="sm" onClick={onContinueEditing}>
            {copy.continueAction}
          </Button>
        ) : null}

        {state.phase === 'conflict' || state.phase === 'reloading' ? (
          <Button
            type="button"
            size="sm"
            data-slot="dbt-yaml-description-reload"
            disabled={busy}
            onClick={onReloadLatest}
          >
            {state.phase === 'reloading' ? <LoaderCircle className={tokens.spinner} /> : null}
            {state.phase === 'reloading' ? copy.reloadingAction : copy.reloadAction}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
