/**
 * Owned concern: render safe localized Preview rejection and its rejected dialog.
 * @baseline ADR-0044: Diagnostic prose is not a presentation contract.
 */
import { EXECUTABILITY_REJECTION_CODES } from '@dvt/contracts';
import { AlertTriangle } from 'lucide-react';
import type { PlanPreviewOutcome, PreviewAffectedModel } from '../../ports/plans';
import { resolveDvtOperationalRejectionCopy } from '../../services/api/dvtOperationalRejectionCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { PlanViewModel } from '../../types/plans';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { PlanPreviewField } from './PlanPreviewFields';
import type { PlanPreviewModalMessages } from './PlanPreviewMessages';
import styles from './PlanPreview.module.css';
export type PlanPreviewValidation =
  Extract<PlanPreviewOutcome, { kind: 'plan-invalid' }>['validation'] | null;
export type PlanPreviewRejectionDetails = Readonly<{
  code: string;
  cause?: string;
  reason: string;
  knownCode: boolean;
  affectedModel?: PreviewAffectedModel;
}>;

export function PlanPreviewRejectionPanel({
  details,
  messages,
  describeDialog = false,
}: Readonly<{
  details: PlanPreviewRejectionDetails;
  messages: PlanPreviewModalMessages;
  describeDialog?: boolean;
}>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const safe = details.knownCode
    ? {
        reason: resolveDvtOperationalRejectionCopy(details.cause, language) ?? details.reason,
        cause: details.cause,
      }
    : { reason: messages.planPreviewUnknownCodeMessage, cause: undefined };
  const description = (
    <AlertDescription className={styles.rejectionDescription}>{safe.reason}</AlertDescription>
  );

  return (
    <section
      aria-label={messages.planPreviewReasonLabel}
      data-testid="plan-preview-rejection"
      className={styles.rejectionPanel}
    >
      <Alert>
        {details.affectedModel ? (
          <AlertTitle className={styles.affectedModelTitle}>
            <span className={styles.affectedModelLabel}>
              {messages.planPreviewAffectedModelLabel}
            </span>
            <span data-slot="plan-preview-affected-model">{details.affectedModel.name}</span>
          </AlertTitle>
        ) : null}
        {describeDialog ? (
          <DialogDescription asChild>{description}</DialogDescription>
        ) : (
          description
        )}
      </Alert>
      <details className={styles.technicalDisclosure}>
        <summary className={styles.technicalSummary}>
          {messages.planPreviewTechnicalDetailsLabel}
        </summary>
        <div className={styles.diagnosticGrid}>
          <PlanPreviewField label={messages.planPreviewCodeLabel} long>
            {details.code}
          </PlanPreviewField>
          {safe.cause ? (
            <PlanPreviewField label={messages.planPreviewCauseLabel} long>
              {safe.cause}
            </PlanPreviewField>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export function SelectionRejectedPlanPreviewModal({
  open,
  onClose,
  outcome,
  messages,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  outcome: Extract<PlanPreviewOutcome, { kind: 'selection-rejected' }>;
  messages: PlanPreviewModalMessages;
}>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        data-testid="plan-preview-modal"
        closeLabel={messages.planPreviewCloseLabel}
        className={styles.dialogNarrow}
      >
        <DialogHeader className={styles.header}>
          <DialogTitle className={styles.rejectionTitle}>
            <AlertTriangle className={styles.rejectionIcon} aria-hidden="true" />
            {messages.planPreviewSelectionRejectedTitle}
          </DialogTitle>
        </DialogHeader>
        <div data-slot="plan-preview-scroll-region" className={styles.rejectionScrollRegion}>
          <PlanPreviewRejectionPanel
            details={{
              code: outcome.rejection.code,
              cause: outcome.rejection.cause,
              reason: outcome.rejection.reason,
              knownCode: outcome.rejection.code === 'REJECTED',
              affectedModel: outcome.affectedModel,
            }}
            messages={messages}
            describeDialog
          />
        </div>
        <DialogFooter className={styles.footer}>
          <Button onClick={onClose}>{messages.planPreviewCloseLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanPreviewValidationNotice({
  validation,
  messages,
}: Readonly<{
  validation: PlanPreviewValidation;
  messages: PlanPreviewModalMessages;
}>): JSX.Element | null {
  if (!validation) return null;
  const knownCode = EXECUTABILITY_REJECTION_CODES.includes(
    validation.code as (typeof EXECUTABILITY_REJECTION_CODES)[number]
  );
  return (
    <PlanPreviewRejectionPanel
      details={{
        code: validation.code,
        cause: validation.cause,
        reason: validation.reason,
        knownCode,
      }}
      messages={messages}
    />
  );
}

export function resolvePreviewOutcomeDetails({
  providedPlan,
  outcome,
}: Readonly<{ outcome: PlanPreviewOutcome | null; providedPlan: PlanViewModel | null }>) {
  if (outcome?.kind === 'accepted') return { plan: outcome.plan, validation: null };
  if (outcome?.kind === 'plan-invalid')
    return { plan: outcome.plan, validation: outcome.validation };
  return { plan: providedPlan, validation: null };
}
