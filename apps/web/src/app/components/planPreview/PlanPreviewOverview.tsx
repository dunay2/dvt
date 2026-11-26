/** Owned concern: project and present Plan identity, execution target and summary. */
import { Zap } from 'lucide-react';
import type { PlanViewModel } from '../../types/plans';
import { projectDbtExecutionTargetBinding } from '../dbtExecutionTargetBinding';
import { Badge } from '../ui/badge';
import { PlanPreviewField, PlanPreviewSection } from './PlanPreviewFields';
import type { PlanPreviewModalMessages } from './PlanPreviewMessages';
import styles from './PlanPreview.module.css';
export function PlanPreviewOverview(
  props: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>
): JSX.Element {
  return (
    <>
      <PlanPreviewIdentity {...props} />
      <PlanPreviewExecutionTarget {...props} />
      <PlanPreviewSummary {...props} />
    </>
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
      fields={buildPlanPreviewIdentityFields(plan, messages)}
    />
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
      <div className={styles.targetGrid}>
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
        <div className={styles.capabilities}>
          <span className={styles.capabilityLabel}>
            <Zap className={styles.capabilityIcon} />
            {messages.planPreviewCapabilitiesLabel}
          </span>
          {plan.capabilities.map((capability) => (
            <Badge key={capability} variant="outline" className={styles.capabilityBadge}>
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
      fields={buildPlanPreviewSummaryFields(summary, messages)}
    />
  );
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
  if (typeof cost !== 'number')
    return { className: styles.estimateUnavailable, label: notEstimated };
  return {
    className: styles.estimateAvailable,
    label: Number.isFinite(cost) ? `$${cost.toFixed(2)}` : notEstimated,
  };
}
