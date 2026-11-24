/**
 * Owned concern: present the authoritative Preview outcome and its available actions.
 * @baseline ADR-0044: Diagnostic prose is not a presentation contract.
 * @decision Resolve rejection copy by cause while retaining structural diagnostics.
 * @consequence Language changes affect presentation, never execution admission.
 * @version 1.0.0
 */
import { EXECUTABILITY_REJECTION_CODES } from '@dvt/contracts';
import { AlertTriangle, Clock, Download, Zap } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import type { PlanPreviewOutcome, PreviewAffectedModel } from '../ports/plans';
import { resolveDvtOperationalRejectionCopy } from '../services/api/dvtOperationalRejectionCopy';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import type { PlanPreviewSelectionIntentViewModel, PlanViewModel } from '../types/plans';
import { projectDbtExecutionTargetBinding } from './dbtExecutionTargetBinding';

import { PlanExecutionDecisionView } from './PlanExecutionDecisionView';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
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
  planPreviewDvtProvenanceCaption: string;
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
  planPreviewAffectedModelLabel: string;
  planPreviewTechnicalDetailsLabel: string;
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
  affectedModel?: PreviewAffectedModel;
}>;

function PlanPreviewRejectionPanel({
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
    <AlertDescription className="min-w-0 [overflow-wrap:anywhere]">{safe.reason}</AlertDescription>
  );

  return (
    <section
      aria-label={messages.planPreviewReasonLabel}
      data-testid="plan-preview-rejection"
      className="min-w-0 space-y-3"
    >
      <Alert>
        {details.affectedModel ? (
          <AlertTitle className="min-w-0 line-clamp-none [overflow-wrap:anywhere]">
            <span className="block text-xs text-muted-foreground">
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
      <details className="min-w-0 rounded-md border border-(--border-subtle) bg-(--surface-panel)">
        <summary className="cursor-pointer rounded-md px-3 py-2 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
          {messages.planPreviewTechnicalDetailsLabel}
        </summary>
        <div className="grid min-w-0 gap-3 px-3 pb-3 md:grid-cols-2">
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
        className="min-w-0 max-h-[92vh] w-[calc(100vw-2rem)] gap-0 overflow-hidden border-slate-700 bg-slate-950 p-0 text-slate-50 shadow-2xl sm:max-w-2xl"
      >
        <DialogHeader className="min-w-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 items-center gap-2 pr-8 text-lg text-amber-100 sm:text-xl">
            <AlertTriangle className="size-5" aria-hidden="true" />
            {messages.planPreviewSelectionRejectedTitle}
          </DialogTitle>
        </DialogHeader>
        <div
          data-slot="plan-preview-scroll-region"
          className="min-w-0 max-h-[70vh] space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5"
        >
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
          <PlanPreviewBody
            plan={plan}
            messages={messages}
            validation={validation}
            startRunMessage={startRunMessage}
          />
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

function PlanPreviewIdentity({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  return (
    <PlanPreviewSection
      title={messages.planPreviewIdentityTitle}
      caption={messages.planPreviewIdentityCaption}
    >
      <PlanPreviewFieldGrid fields={buildPlanPreviewIdentityFields(plan, messages)} />
    </PlanPreviewSection>
  );
}

function PlanPreviewExecutionTarget({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const target = projectPlanExecutionTarget(plan, messages);
  return (
    <PlanPreviewSection
      title={messages.planPreviewExecutionTargetTitle}
      caption={messages.planPreviewExecutionTargetCaption}
    >
      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        <PlanPreviewField label={messages.planPreviewExecutorLabel}>
          {target.executor}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewAdapterLabel}>
          {target.adapter}
        </PlanPreviewField>
        <PlanPreviewField label={messages.planPreviewTargetLabel}>
          <Badge variant="secondary">{target.target}</Badge>
        </PlanPreviewField>
        {target.details ? (
          <>
            <PlanPreviewField label={messages.planPreviewConnectionLabel}>
              {target.details.connection}
            </PlanPreviewField>
            <PlanPreviewField label={messages.planPreviewResolutionSourceLabel}>
              {target.details.resolution}
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
  );
}

function PlanPreviewSummary({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const summary = plan.preview?.summary;
  if (!summary) return null;
  return (
    <PlanPreviewSection
      title={messages.planPreviewSummaryTitle}
      caption={messages.planPreviewSummaryCaption}
    >
      <PlanPreviewFieldGrid fields={buildPlanPreviewSummaryFields(summary, messages)} />
    </PlanPreviewSection>
  );
}

function PlanPreviewMetadata({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const { persisted: persistedPreview, selectionIntent } = plan.preview ?? {};
  return (
    <>
      {' '}
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
    </>
  );
}

function PlanPreviewProvenance({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  const provenance = plan.preview?.provenance;
  if (!provenance) return null;
  const captions = {
    'dbt-project-files': messages.planPreviewDbtProvenanceCaption,
    'dvt-protected-workspace-graph': messages.planPreviewDvtProvenanceCaption,
    'transformation-git-artifacts': messages.planPreviewRepositoryProvenanceCaption,
  };
  return (
    <PlanPreviewSection
      title={messages.planPreviewProvenanceTitle}
      caption={captions[provenance.kind ?? 'transformation-git-artifacts']}
    >
      <PlanPreviewProvenanceFields
        provenance={provenance}
        selectionIntent={plan.preview?.selectionIntent}
        messages={messages}
      />
    </PlanPreviewSection>
  );
}

function PlanPreviewProvenanceFields({
  provenance,
  selectionIntent,
  messages,
}: Readonly<{
  provenance: NonNullable<NonNullable<PlanViewModel['preview']>['provenance']>;
  selectionIntent: NonNullable<PlanViewModel['preview']>['selectionIntent'];
  messages: PlanPreviewModalMessages;
}>) {
  if (provenance.kind === 'dbt-project-files') {
    const fields = [
      { label: messages.planPreviewCanvasLabel, value: provenance.canvasId, long: true },
      { label: messages.planPreviewProjectRootLabel, value: provenance.projectRoot, long: true },
      { label: messages.planPreviewDbtVersionLabel, value: provenance.dbtVersion },
      {
        label: messages.planPreviewProjectRevisionLabel,
        value: provenance.contentSetSha256,
        long: true,
      },
      {
        label: messages.planPreviewAnalysisRevisionLabel,
        value: provenance.analysisSha256,
        long: true,
      },
      ...(selectionIntent
        ? []
        : [
            {
              label: messages.planPreviewSelectedResourcesLabel,
              value: provenance.selectedUniqueIds.join(', '),
              long: true,
            },
          ]),
    ];
    return <PlanPreviewFieldGrid fields={fields} />;
  }
  if (provenance.kind === 'dvt-protected-workspace-graph')
    return (
      <PlanPreviewFieldGrid
        fields={[
          { label: messages.planPreviewCanvasLabel, value: provenance.canvasId, long: true },
        ]}
      />
    );
  const fields = [
    ...(provenance.graphArtifact
      ? [
          {
            label: messages.planPreviewGraphArtifactLabel,
            value: (
              <>
                {provenance.graphArtifact.repo}: {provenance.graphArtifact.path}
              </>
            ),
            long: true,
          },
        ]
      : []),
    ...(provenance.sqlArtifact
      ? [
          {
            label: messages.planPreviewSqlArtifactLabel,
            value: (
              <>
                {provenance.sqlArtifact.repo}: {provenance.sqlArtifact.path}
              </>
            ),
            long: true,
          },
        ]
      : []),
  ];
  return <PlanPreviewFieldGrid fields={fields} />;
}

function PlanPreviewExecutionSteps({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  return (
    <PlanPreviewSection
      title={messages.planPreviewExecutionStepsTitle}
      caption={messages.planPreviewExecutionStepsCaption}
    >
      <ol className="space-y-3">
        {plan.steps.map((step, index) => (
          <PlanPreviewStep key={step.id} step={step} index={index} messages={messages} />
        ))}
      </ol>
    </PlanPreviewSection>
  );
}

function PlanPreviewStep({
  step,
  index,
  messages,
}: Readonly<{
  step: PlanViewModel['steps'][number];
  index: number;
  messages: PlanPreviewModalMessages;
}>) {
  return (
    <li className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 p-3">
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
          <div className="mt-1 break-all font-mono text-[11px] text-slate-500">{step.id}</div>
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
  );
}

function PlanPreviewBody({
  plan,
  messages,
  validation,
  startRunMessage,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }> &
  Readonly<{
    validation: Extract<PlanPreviewOutcome, { kind: 'plan-invalid' }>['validation'] | null;
    startRunMessage?: string;
  }>) {
  const validationCodeKnown =
    validation != null &&
    EXECUTABILITY_REJECTION_CODES.includes(
      validation.code as (typeof EXECUTABILITY_REJECTION_CODES)[number]
    );
  return (
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

      <PlanPreviewIdentity plan={plan} messages={messages} />

      <PlanPreviewExecutionTarget plan={plan} messages={messages} />

      <PlanPreviewSummary plan={plan} messages={messages} />

      <PlanPreviewMetadata plan={plan} messages={messages} />

      <PlanPreviewProvenance plan={plan} messages={messages} />

      <PlanPreviewExecutionSteps plan={plan} messages={messages} />
    </div>
  );
}

function resolvePreviewOutcomeDetails({
  providedPlan,
  outcome,
}: Pick<PlanPreviewModalProps, 'outcome'> & Readonly<{ providedPlan: PlanViewModel | null }>) {
  if (outcome?.kind === 'accepted') return { plan: outcome.plan, validation: null };
  if (outcome?.kind === 'plan-invalid')
    return { plan: outcome.plan, validation: outcome.validation };
  return { plan: providedPlan, validation: null };
}

function projectPlanExecutionTarget(plan: PlanViewModel, messages: PlanPreviewModalMessages) {
  const { provenance, summary } = plan.preview ?? {};
  if (provenance?.kind === 'dbt-project-files') {
    const details = projectDbtExecutionTargetBinding(
      provenance.executionTarget,
      messages.planPreviewEnvironmentDefaultValue
    );
    return {
      executor: details.executor,
      adapter: details.adapter,
      target: details.target,
      details,
    };
  }
  return {
    executor: summary?.executor ?? messages.planPreviewNotReportedValue,
    adapter:
      plan.adapter && plan.adapter !== 'unknown' ? plan.adapter : messages.planPreviewUnknownValue,
    target: plan.target,
    details: null,
  };
}

function PlanPreviewFieldGrid({
  fields,
}: Readonly<{
  fields: readonly Readonly<{
    label: string;
    value: ReactNode;
    dataSlot?: string;
    long?: boolean;
    mono?: boolean;
    fullWidth?: boolean;
  }>[];
}>) {
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const content = (
          <PlanPreviewField
            label={field.label}
            dataSlot={field.dataSlot}
            long={field.long}
            mono={field.mono}
          >
            {field.value}
          </PlanPreviewField>
        );
        return field.fullWidth ? (
          <div key={field.label} className="md:col-span-2">
            {content}
          </div>
        ) : (
          <Fragment key={field.label}>{content}</Fragment>
        );
      })}
    </div>
  );
}

function buildPlanPreviewIdentityFields(plan: PlanViewModel, messages: PlanPreviewModalMessages) {
  const cost = formatPlanPreviewEstimate(plan.estimatedCost, messages.planPreviewNotEstimatedValue);
  return [
    {
      label: messages.planPreviewIdLabel,
      dataSlot: 'plan-preview-id',
      value: plan.planId,
      long: true,
    },
    { label: messages.planPreviewVersionLabel, value: plan.planVersion },
    ...(plan.planRef
      ? [
          {
            label: messages.planPreviewRefLabel,
            value: plan.planRef.uri,
            long: true,
            fullWidth: true,
          },
        ]
      : []),
    {
      label: messages.planPreviewGeneratedLabel,
      value: new Date(plan.generatedAt).toLocaleString(),
      mono: true,
    },
    {
      label: messages.planPreviewEstimatedCostLabel,
      value: <span className={cost.className}>{cost.label}</span>,
    },
  ];
}

function buildPlanPreviewSummaryFields(
  summary: NonNullable<NonNullable<PlanViewModel['preview']>['summary']>,
  messages: PlanPreviewModalMessages
) {
  return [
    { label: messages.planPreviewNodesLabel, value: summary.nodeCount },
    { label: messages.planPreviewStepsLabel, value: summary.stepCount },
    {
      label: messages.planPreviewSourceTablesLabel,
      value: summary.sourceTables.join(', ') || messages.planPreviewUnavailableValue,
    },
    {
      label: messages.planPreviewSinkTablesLabel,
      value: summary.sinkTables.join(', ') || messages.planPreviewUnavailableValue,
    },
  ];
}

function formatPlanPreviewEstimate(cost: PlanViewModel['estimatedCost'], notEstimated: string) {
  if (typeof cost !== 'number') return { className: 'text-slate-300', label: notEstimated };
  return {
    className: 'text-green-300',
    label: Number.isFinite(cost) ? `$${cost.toFixed(2)}` : notEstimated,
  };
}
