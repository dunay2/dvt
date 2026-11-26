/** Owned concern: present execution steps and their admitted policy facts. */
import { Clock } from 'lucide-react';
import type { PlanViewModel } from '../../types/plans';
import { Badge } from '../ui/badge';
import { PlanPreviewSection } from './PlanPreviewFields';
import type { PlanPreviewModalMessages } from './PlanPreviewMessages';
import styles from './PlanPreview.module.css';
export function PlanPreviewExecutionSteps({
  plan,
  messages,
}: Readonly<{ plan: PlanViewModel; messages: PlanPreviewModalMessages }>) {
  return (
    <PlanPreviewSection
      title={messages.planPreviewExecutionStepsTitle}
      caption={messages.planPreviewExecutionStepsCaption}
    >
      <ol className={styles.stepList}>
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
    <li className={styles.step}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIdentity}>
          <div className={styles.stepNameRow}>
            <span className={styles.stepNumber}>
              {messages.planPreviewStepLabel} {index + 1}
            </span>
            <span className={styles.stepName}>{step.name}</span>
            <Badge variant="secondary" className={styles.stepKind}>
              {step.type}
            </Badge>
          </div>
          <div className={styles.stepId}>{step.id}</div>
        </div>
        <span className={styles.stepNodeCount}>
          {step.nodes.length}{' '}
          {step.nodes.length === 1
            ? messages.planPreviewNodeSuffix
            : messages.planPreviewNodesSuffix}
        </span>
      </div>
      <div className={styles.policies}>
        {step.policies.timeout ? (
          <span className={styles.timedPolicy}>
            <Clock className={styles.policyIcon} />
            {messages.planPreviewTimeoutLabel} {step.policies.timeout}s
          </span>
        ) : null}
        {step.policies.retries ? (
          <span className={styles.policy}>
            {messages.planPreviewRetriesLabel} {step.policies.retries}
          </span>
        ) : null}
        {step.policies.concurrency ? (
          <span className={styles.policy}>
            {messages.planPreviewConcurrencyLabel} {step.policies.concurrency}
          </span>
        ) : null}
        {step.policies.warehouse ? (
          <span className={styles.policy}>
            {messages.planPreviewWarehouseLabel} {step.policies.warehouse}
          </span>
        ) : null}
      </div>
    </li>
  );
}
