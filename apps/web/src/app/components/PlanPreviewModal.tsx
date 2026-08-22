import { EXECUTABILITY_REJECTION_CODES } from '@dvt/contracts';
import { AlertTriangle, Clock, Download, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import type { PlanPreviewOutcome } from '../ports/plans';
import type { PlanPreviewSelectionIntentViewModel, PlanViewModel } from '../types/plans';
import { projectDbtExecutionTargetBinding } from './dbtExecutionTargetBinding';

import { PlanExecutionDecisionView } from './PlanExecutionDecisionView';
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

export type PlanPreviewModalMessages = Readonly<{
  planPreviewTitle: string;
  planPreviewReadOnlyLabel: string;
  planPreviewDescription: string;
  planPreviewNotEstimatedValue: string;
  planPreviewIdentityTitle: string;
  planPreviewIdentityCaption: string;
  planPreviewIdLabel: string;
  planPreviewVersionLabel: string;
  planPreviewRefLabel: string;
  planPreviewGeneratedLabel: string;
  planPreviewEstimatedCostLabel: string;
  planPreviewExecutionTargetTitle: string;
  planPreviewExecutionTargetCaption: string;
  planPreviewExecutorLabel: string;
  planPreviewNotReportedValue: string;
  planPreviewAdapterLabel: string;
  planPreviewUnknownValue: string;
  planPreviewTargetLabel: string;
  planPreviewConnectionLabel: string;
  planPreviewResolutionSourceLabel: string;
  planPreviewEnvironmentDefaultValue: string;
  planPreviewCapabilitiesLabel: string;
  planPreviewSummaryTitle: string;
  planPreviewSummaryCaption: string;
  planPreviewNodesLabel: string;
  planPreviewStepsLabel: string;
  planPreviewSourceTablesLabel: string;
  planPreviewSinkTablesLabel: string;
  planPreviewUnavailableValue: string;
  planPreviewPersistenceTitle: string;
  planPreviewPersistenceCaption: string;
  planPreviewRecordLabel: string;
  planPreviewCanonicalShaLabel: string;
  planPreviewSelectionTitle: string;
  planPreviewSelectionCaption: string;
  planPreviewSelectionModeLabel: string;
  planPreviewSelectionExplicitValue: string;
  planPreviewSelectionWorkspaceDefaultValue: string;
  planPreviewRequestedResourcesLabel: string;
  planPreviewIncludedDependenciesLabel: string;
  planPreviewNoneValue: string;
  planPreviewAuthorizedScopeLabel: string;
  planPreviewProvenanceTitle: string;
  planPreviewDbtProvenanceCaption: string;
  planPreviewRepositoryProvenanceCaption: string;
  planPreviewCanvasLabel: string;
  planPreviewProjectRootLabel: string;
  planPreviewDbtVersionLabel: string;
  planPreviewProjectRevisionLabel: string;
  planPreviewAnalysisRevisionLabel: string;
  planPreviewSelectedResourcesLabel: string;
  planPreviewGraphArtifactLabel: string;
  planPreviewSqlArtifactLabel: string;
  planPreviewExecutionStepsTitle: string;
  planPreviewExecutionStepsCaption: string;
  planPreviewStepLabel: string;
  planPreviewNodeSuffix: string;
  planPreviewNodesSuffix: string;
  planPreviewTimeoutLabel: string;
  planPreviewRetriesLabel: string;
  planPreviewConcurrencyLabel: string;
  planPreviewWarehouseLabel: string;
  planPreviewExportJsonAction: string;
  planPreviewStartRunAction: string;
  planPreviewSelectionRejectedTitle: string;
  planPreviewSelectionRejectedDescription: string;
  planPreviewPlanInvalidTitle: string;
  planPreviewPlanInvalidDescription: string;
  planPreviewUnknownCodeMessage: string;
  planPreviewCodeLabel: string;
  planPreviewCauseLabel: string;
  planPreviewReasonLabel: string;
  planPreviewCloseLabel: string;
  planPreviewDecisionsTitle: string;
  planPreviewDecisionsCaption: string;
  planPreviewDecisionSubjectLabel: string;
  planPreviewDecisionStatusLabel: string;
  planPreviewDecisionReasonLabel: string;
  planPreviewDecisionIncludedLabel: string;
  planPreviewDecisionExcludedLabel: string;
  planPreviewDecisionRunLabel: string;
  planPreviewDecisionSkipLabel: string;
  planPreviewDecisionPartialLabel: string;
  planPreviewDecisionSelectedRootReason: string;
  planPreviewDecisionSelectedClosureReason: string;
  planPreviewDecisionOutsideClosureReason: string;
  planPreviewDecisionBoundedSelectionReason: string;
}>;

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

function PlanPreviewSection({
  title,
  caption,
  children,
}: Readonly<{
  title: string;
  caption?: string;
  children: ReactNode;
}>) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/75 p-3 shadow-sm sm:p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        {caption ? <p className="mt-1 text-xs text-slate-400">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

function PlanPreviewField({
  label,
  children,
  long = false,
  mono = false,
  dataSlot,
}: Readonly<{
  label: string;
  children: ReactNode;
  long?: boolean;
  mono?: boolean;
  dataSlot?: string;
}>) {
  const valueClassName = long
    ? 'block min-w-0 break-all font-mono text-xs leading-5 text-blue-300'
    : mono
      ? 'font-mono text-xs text-blue-300'
      : 'text-sm font-medium text-slate-50';

  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        aria-label={label}
        data-slot={dataSlot}
        data-testid={long ? 'plan-preview-long-value' : undefined}
        className={`mt-1 ${valueClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

type PlanPreviewRejectionDetails = Readonly<{
  code: string;
  cause?: string;
  reason: string;
  knownCode: boolean;
}>;

function PlanPreviewRejectionPanel({
  details,
  messages,
}: Readonly<{
  details: PlanPreviewRejectionDetails;
  messages: PlanPreviewModalMessages;
}>) {
  const safeReason = details.knownCode ? details.reason : messages.planPreviewUnknownCodeMessage;
  const safeCause = details.knownCode ? details.cause : undefined;

  return (
    <section
      aria-label={messages.planPreviewReasonLabel}
      data-testid="plan-preview-rejection"
      className="min-w-0 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4"
    >
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <PlanPreviewField label={messages.planPreviewCodeLabel} long>
          {details.code}
        </PlanPreviewField>
        {safeCause ? (
          <PlanPreviewField label={messages.planPreviewCauseLabel} long>
            {safeCause}
          </PlanPreviewField>
        ) : null}
        <div className="md:col-span-2">
          <PlanPreviewField label={messages.planPreviewReasonLabel} long>
            {safeReason}
          </PlanPreviewField>
        </div>
      </div>
    </section>
  );
}

function PlanPreviewSelectionReview({
  selectionIntent,
  messages,
}: Readonly<{
  selectionIntent: PlanPreviewSelectionIntentViewModel;
  messages: PlanPreviewModalMessages;
}>) {
  return (
    <PlanPreviewSection
      title={messages.planPreviewSelectionTitle}
      caption={messages.planPreviewSelectionCaption}
    >
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <PlanPreviewField label={messages.planPreviewSelectionModeLabel}>
          {selectionIntent.mode === 'explicit'
            ? messages.planPreviewSelectionExplicitValue
            : messages.planPreviewSelectionWorkspaceDefaultValue}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewRequestedResourcesLabel} long>
          {selectionIntent.requestedRootNodeIds.join(', ')}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewIncludedDependenciesLabel} long>
          {selectionIntent.derivedDependencyNodeIds.join(', ') || messages.planPreviewNoneValue}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewAuthorizedScopeLabel} long>
          {selectionIntent.authorizedScopeNodeIds.join(', ')}
        </PlanPreviewField>
      </div>
    </PlanPreviewSection>
  );
}

function SelectionRejectedPlanPreviewModal({
  open,
  onClose,
  outcome,
  messages,
  startRunMessage,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  outcome: Extract<PlanPreviewOutcome, { kind: 'selection-rejected' }>;
  messages: PlanPreviewModalMessages;
  startRunMessage?: string;
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
        className="min-w-0 max-h-[92vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-50 shadow-2xl sm:max-w-2xl"
      >
        <DialogHeader className="min-w-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 items-center gap-2 pr-8 text-lg text-amber-100 sm:text-xl">
            <AlertTriangle className="size-5" aria-hidden="true" />
            {messages.planPreviewSelectionRejectedTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-200">
            {messages.planPreviewSelectionRejectedDescription}
          </DialogDescription>
        </DialogHeader>
        <div
          data-slot="plan-preview-scroll-region"
          className="min-w-0 max-h-[70vh] space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
          {startRunMessage ? (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-50">
              {startRunMessage}
            </div>
          ) : null}
          <PlanPreviewRejectionPanel
            details={{
              code: outcome.rejection.code,
              cause: outcome.rejection.cause,
              reason: outcome.rejection.reason,
              knownCode: outcome.rejection.code === 'REJECTED',
            }}
            messages={messages}
          />
        </div>
        <DialogFooter className="border-t border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6">
          <Button onClick={onClose}>{messages.planPreviewCloseLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
        startRunMessage={startRunMessage}
      />
    );
  }

  const plan =
    outcome?.kind === 'accepted' || outcome?.kind === 'plan-invalid' ? outcome.plan : providedPlan;
  if (!plan) return null;

  const validation = outcome?.kind === 'plan-invalid' ? outcome.validation : null;
  const validationCodeKnown =
    validation != null &&
    EXECUTABILITY_REJECTION_CODES.includes(
      validation.code as (typeof EXECUTABILITY_REJECTION_CODES)[number]
    );
  const previewSummary = plan.preview?.summary;
  const persistedPreview = plan.preview?.persisted;
  const provenance = plan.preview?.provenance;
  const selectionIntent = plan.preview?.selectionIntent;
  const dbtExecutionTarget =
    provenance?.kind === 'dbt-project-files'
      ? projectDbtExecutionTargetBinding(
          provenance.executionTarget,
          messages.planPreviewEnvironmentDefaultValue
        )
      : null;

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
        className="min-w-0 max-h-[92vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-50 shadow-2xl sm:max-w-4xl"
      >
        <DialogHeader className="min-w-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-8 text-lg text-slate-50 sm:text-xl">
            {validation == null ? messages.planPreviewTitle : messages.planPreviewPlanInvalidTitle}
            <Badge variant="outline" className="border-blue-400/50 bg-blue-500/10 text-blue-100">
              {messages.planPreviewReadOnlyLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-200">
            {validation == null
              ? messages.planPreviewDescription
              : messages.planPreviewPlanInvalidDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 max-h-[70vh] overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            {startRunMessage ? (
              <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-50">
                {startRunMessage}
              </div>
            ) : null}

            {validation ? (
              <PlanPreviewRejectionPanel
                details={{
                  code: validation.code,
                  cause: validation.cause,
                  reason: validation.reason,
                  knownCode: validationCodeKnown,
                }}
                messages={messages}
              />
            ) : null}

            <PlanPreviewSection
              title={messages.planPreviewIdentityTitle}
              caption={messages.planPreviewIdentityCaption}
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <PlanPreviewField
                  label={messages.planPreviewIdLabel}
                  dataSlot="plan-preview-id"
                  long
                >
                  {plan.planId}
                </PlanPreviewField>
                <PlanPreviewField label={messages.planPreviewVersionLabel}>
                  {plan.planVersion}
                </PlanPreviewField>
                {plan.planRef ? (
                  <div className="md:col-span-2">
                    <PlanPreviewField label={messages.planPreviewRefLabel} long>
                      {plan.planRef.uri}
                    </PlanPreviewField>
                  </div>
                ) : null}
                <PlanPreviewField label={messages.planPreviewGeneratedLabel} mono>
                  {new Date(plan.generatedAt).toLocaleString()}
                </PlanPreviewField>
                <PlanPreviewField label={messages.planPreviewEstimatedCostLabel}>
                  <span
                    className={
                      typeof plan.estimatedCost === 'number' ? 'text-green-300' : 'text-slate-300'
                    }
                  >
                    {typeof plan.estimatedCost === 'number' && Number.isFinite(plan.estimatedCost)
                      ? `$${plan.estimatedCost.toFixed(2)}`
                      : messages.planPreviewNotEstimatedValue}
                  </span>
                </PlanPreviewField>
              </div>
            </PlanPreviewSection>

            <PlanPreviewSection
              title={messages.planPreviewExecutionTargetTitle}
              caption={messages.planPreviewExecutionTargetCaption}
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-3">
                <PlanPreviewField label={messages.planPreviewExecutorLabel}>
                  {dbtExecutionTarget?.executor ??
                    previewSummary?.executor ??
                    messages.planPreviewNotReportedValue}
                </PlanPreviewField>
                <PlanPreviewField label={messages.planPreviewAdapterLabel}>
                  {dbtExecutionTarget?.adapter ??
                    (plan.adapter && plan.adapter !== 'unknown'
                      ? plan.adapter
                      : messages.planPreviewUnknownValue)}
                </PlanPreviewField>
                <PlanPreviewField label={messages.planPreviewTargetLabel}>
                  <Badge variant="secondary">{dbtExecutionTarget?.target ?? plan.target}</Badge>
                </PlanPreviewField>
                {dbtExecutionTarget ? (
                  <>
                    <PlanPreviewField label={messages.planPreviewConnectionLabel}>
                      {dbtExecutionTarget.connection}
                    </PlanPreviewField>
                    <PlanPreviewField label={messages.planPreviewResolutionSourceLabel}>
                      {dbtExecutionTarget.resolution}
                    </PlanPreviewField>
                  </>
                ) : null}
              </div>
              {plan.capabilities.length > 0 ? (
                <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Zap className="size-3.5 text-yellow-300" />
                    {messages.planPreviewCapabilitiesLabel}
                  </span>
                  {plan.capabilities.map((capability) => (
                    <Badge
                      key={capability}
                      variant="outline"
                      className="border-slate-600 bg-slate-950/50 text-slate-200"
                    >
                      {capability}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </PlanPreviewSection>

            {previewSummary ? (
              <PlanPreviewSection
                title={messages.planPreviewSummaryTitle}
                caption={messages.planPreviewSummaryCaption}
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <PlanPreviewField label={messages.planPreviewNodesLabel}>
                    {previewSummary.nodeCount}
                  </PlanPreviewField>
                  <PlanPreviewField label={messages.planPreviewStepsLabel}>
                    {previewSummary.stepCount}
                  </PlanPreviewField>
                  <PlanPreviewField label={messages.planPreviewSourceTablesLabel}>
                    {previewSummary.sourceTables.join(', ') || messages.planPreviewUnavailableValue}
                  </PlanPreviewField>
                  <PlanPreviewField label={messages.planPreviewSinkTablesLabel}>
                    {previewSummary.sinkTables.join(', ') || messages.planPreviewUnavailableValue}
                  </PlanPreviewField>
                </div>
              </PlanPreviewSection>
            ) : null}

            {persistedPreview ? (
              <PlanPreviewSection
                title={messages.planPreviewPersistenceTitle}
                caption={messages.planPreviewPersistenceCaption}
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <PlanPreviewField label={messages.planPreviewRecordLabel} long>
                    {persistedPreview.planRecordId}
                  </PlanPreviewField>
                  <PlanPreviewField label={messages.planPreviewCanonicalShaLabel} long>
                    {persistedPreview.canonicalPlanSha256}
                  </PlanPreviewField>
                </div>
              </PlanPreviewSection>
            ) : null}

            {selectionIntent ? (
              <PlanPreviewSelectionReview selectionIntent={selectionIntent} messages={messages} />
            ) : null}

            {plan.decisions ? (
              <PlanExecutionDecisionView
                decisions={plan.decisions}
                messages={{
                  title: messages.planPreviewDecisionsTitle,
                  caption: messages.planPreviewDecisionsCaption,
                  subjectLabel: messages.planPreviewDecisionSubjectLabel,
                  statusLabel: messages.planPreviewDecisionStatusLabel,
                  reasonLabel: messages.planPreviewDecisionReasonLabel,
                  includedLabel: messages.planPreviewDecisionIncludedLabel,
                  excludedLabel: messages.planPreviewDecisionExcludedLabel,
                  statusRun: messages.planPreviewDecisionRunLabel,
                  statusSkip: messages.planPreviewDecisionSkipLabel,
                  statusPartial: messages.planPreviewDecisionPartialLabel,
                  reasonSelectedRoot: messages.planPreviewDecisionSelectedRootReason,
                  reasonSelectedClosure: messages.planPreviewDecisionSelectedClosureReason,
                  reasonOutsideSelectedClosure: messages.planPreviewDecisionOutsideClosureReason,
                  reasonBoundedSelection: messages.planPreviewDecisionBoundedSelectionReason,
                }}
              />
            ) : null}

            {provenance ? (
              <PlanPreviewSection
                title={messages.planPreviewProvenanceTitle}
                caption={
                  provenance.kind === 'dbt-project-files'
                    ? messages.planPreviewDbtProvenanceCaption
                    : messages.planPreviewRepositoryProvenanceCaption
                }
              >
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {provenance.kind === 'dbt-project-files' ? (
                    <>
                      <PlanPreviewField label={messages.planPreviewCanvasLabel} long>
                        {provenance.canvasId}
                      </PlanPreviewField>
                      <PlanPreviewField label={messages.planPreviewProjectRootLabel} long>
                        {provenance.projectRoot}
                      </PlanPreviewField>
                      <PlanPreviewField label={messages.planPreviewDbtVersionLabel}>
                        {provenance.dbtVersion}
                      </PlanPreviewField>
                      <PlanPreviewField label={messages.planPreviewProjectRevisionLabel} long>
                        {provenance.contentSetSha256}
                      </PlanPreviewField>
                      <PlanPreviewField label={messages.planPreviewAnalysisRevisionLabel} long>
                        {provenance.analysisSha256}
                      </PlanPreviewField>
                      {!selectionIntent ? (
                        <PlanPreviewField label={messages.planPreviewSelectedResourcesLabel} long>
                          {provenance.selectedUniqueIds.join(', ')}
                        </PlanPreviewField>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {provenance.graphArtifact ? (
                        <PlanPreviewField label={messages.planPreviewGraphArtifactLabel} long>
                          {provenance.graphArtifact.repo}: {provenance.graphArtifact.path}
                        </PlanPreviewField>
                      ) : null}
                      {provenance.sqlArtifact ? (
                        <PlanPreviewField label={messages.planPreviewSqlArtifactLabel} long>
                          {provenance.sqlArtifact.repo}: {provenance.sqlArtifact.path}
                        </PlanPreviewField>
                      ) : null}
                    </>
                  )}
                </div>
              </PlanPreviewSection>
            ) : null}

            <PlanPreviewSection
              title={messages.planPreviewExecutionStepsTitle}
              caption={messages.planPreviewExecutionStepsCaption}
            >
              <ol className="space-y-3">
                {plan.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 p-3"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {messages.planPreviewStepLabel} {index + 1}
                          </span>
                          <span className="font-medium text-slate-50">{step.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {step.type}
                          </Badge>
                        </div>
                        <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                          {step.id}
                        </div>
                      </div>
                      <span className="text-xs text-slate-300">
                        {step.nodes.length}{' '}
                        {step.nodes.length === 1
                          ? messages.planPreviewNodeSuffix
                          : messages.planPreviewNodesSuffix}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      {step.policies.timeout ? (
                        <span className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1">
                          <Clock className="size-3" />
                          {messages.planPreviewTimeoutLabel} {step.policies.timeout}s
                        </span>
                      ) : null}
                      {step.policies.retries ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          {messages.planPreviewRetriesLabel} {step.policies.retries}
                        </span>
                      ) : null}
                      {step.policies.concurrency ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          {messages.planPreviewConcurrencyLabel} {step.policies.concurrency}
                        </span>
                      ) : null}
                      {step.policies.warehouse ? (
                        <span className="rounded border border-slate-700 px-2 py-1">
                          {messages.planPreviewWarehouseLabel} {step.policies.warehouse}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </PlanPreviewSection>
          </div>
        </div>

        <DialogFooter className="min-w-0 border-t border-slate-800 bg-slate-950/95 px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>
            <Download className="size-4 mr-2" />
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
