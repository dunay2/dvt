/** Owned concern: compose Preview dialog lifecycle and its existing user actions. */
import { Download } from 'lucide-react';
import type { PlanPreviewOutcome } from '../ports/plans';
import type { PlanViewModel } from '../types/plans';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { PlanPreviewEvidence } from './planPreview/PlanPreviewEvidence';
import type { PlanPreviewModalMessages } from './planPreview/PlanPreviewMessages';
import { PlanPreviewOverview } from './planPreview/PlanPreviewOverview';
import {
  PlanPreviewValidationNotice,
  SelectionRejectedPlanPreviewModal,
  resolvePreviewOutcomeDetails,
  type PlanPreviewValidation,
} from './planPreview/PlanPreviewRejection';
import { PlanPreviewExecutionSteps } from './planPreview/PlanPreviewSteps';
import styles from './planPreview/PlanPreview.module.css';
export type { PlanPreviewModalMessages } from './planPreview/PlanPreviewMessages';
interface PlanPreviewModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlanViewModel | null;
  outcome: PlanPreviewOutcome | null;
  messages: PlanPreviewModalMessages;
  startRunDisabled?: boolean;
  startRunMessage?: string;
  onStartRun: () => void;
}

export function PlanPreviewModal({
  open,
  onClose,
  plan: providedPlan,
  outcome,
  messages,
  startRunDisabled = false,
  startRunMessage,
  onStartRun,
}: PlanPreviewModalProps) {
  if (outcome?.kind === 'selection-rejected') {
    return (
      <SelectionRejectedPlanPreviewModal
        open={open}
        onClose={onClose}
        outcome={outcome}
        messages={messages}
      />
    );
  }

  const { plan, validation } = resolvePreviewOutcomeDetails({ providedPlan, outcome });
  if (!plan) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-testid="plan-preview-modal"
        closeLabel={messages.planPreviewCloseLabel}
        className={styles.dialogWide}
      >
        <DialogHeader className={styles.header}>
          <DialogTitle className={styles.planTitle}>
            {validation == null ? messages.planPreviewTitle : messages.planPreviewPlanInvalidTitle}
            <Badge variant="outline" className={styles.readOnlyBadge}>
              {messages.planPreviewReadOnlyLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription className={styles.description}>
            {validation == null
              ? messages.planPreviewDescription
              : messages.planPreviewPlanInvalidDescription}
          </DialogDescription>
        </DialogHeader>

        <div className={styles.scrollRegion}>
          <PlanPreviewBody
            plan={plan}
            messages={messages}
            validation={validation}
            startRunMessage={startRunMessage}
          />
        </div>

        <DialogFooter className={styles.footerWide}>
          <Button variant="outline" onClick={onClose}>
            <Download className={styles.exportIcon} />
            {messages.planPreviewExportJsonAction}
          </Button>
          <Button
            data-slot="plan-preview-start-run"
            disabled={startRunDisabled || validation != null}
            onClick={() => {
              onStartRun();
            }}
          >
            {messages.planPreviewStartRunAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanPreviewBody({
  plan,
  messages,
  validation,
  startRunMessage,
}: Readonly<{
  plan: PlanViewModel;
  messages: PlanPreviewModalMessages;
  validation: PlanPreviewValidation;
  startRunMessage?: string;
}>): JSX.Element {
  return (
    <div className={styles.body}>
      {startRunMessage ? <div className={styles.startRunMessage}>{startRunMessage}</div> : null}
      <PlanPreviewValidationNotice validation={validation} messages={messages} />
      <PlanPreviewOverview plan={plan} messages={messages} />
      <PlanPreviewEvidence plan={plan} messages={messages} />
      <PlanPreviewExecutionSteps plan={plan} messages={messages} />
    </div>
  );
}
