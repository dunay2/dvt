import type { PlanExecutionDecisionViewModel } from '../types/plans';

import { Badge } from './ui/badge';

export type PlanExecutionDecisionViewMessages = Readonly<{
  title: string;
  caption: string;
  subjectLabel: string;
  statusLabel: string;
  reasonLabel: string;
  includedLabel: string;
  excludedLabel: string;
  statusRun: string;
  statusSkip: string;
  statusPartial: string;
  reasonSelectedRoot: string;
  reasonSelectedClosure: string;
  reasonOutsideSelectedClosure: string;
  reasonBoundedSelection: string;
}>;

type DecisionStatus = PlanExecutionDecisionViewModel['status'];
type DecisionReason = PlanExecutionDecisionViewModel['reasonCode'];

const STATUS_CLASS_NAMES: Readonly<Record<DecisionStatus, string>> = {
  RUN: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
  SKIP: 'border-slate-600 bg-slate-800/70 text-slate-200',
  PARTIAL: 'border-amber-400/50 bg-amber-500/10 text-amber-100',
};

function getStatusLabel(
  status: DecisionStatus,
  messages: PlanExecutionDecisionViewMessages
): string {
  switch (status) {
    case 'RUN':
      return messages.statusRun;
    case 'SKIP':
      return messages.statusSkip;
    case 'PARTIAL':
      return messages.statusPartial;
  }
}

function getReasonLabel(
  reason: DecisionReason,
  messages: PlanExecutionDecisionViewMessages
): string {
  switch (reason) {
    case 'SELECTED_ROOT':
      return messages.reasonSelectedRoot;
    case 'SELECTED_CLOSURE':
      return messages.reasonSelectedClosure;
    case 'OUTSIDE_SELECTED_CLOSURE':
      return messages.reasonOutsideSelectedClosure;
    case 'BOUNDED_SELECTION':
      return messages.reasonBoundedSelection;
  }
}

export function PlanExecutionDecisionView({
  decisions,
  messages,
}: Readonly<{
  decisions: readonly PlanExecutionDecisionViewModel[];
  messages: PlanExecutionDecisionViewMessages;
}>) {
  if (decisions.length === 0) return null;

  return (
    <section
      aria-labelledby="plan-execution-decisions-title"
      data-testid="plan-execution-decisions"
      className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/75 p-3 shadow-sm sm:p-4"
    >
      <div className="mb-3">
        <h3 id="plan-execution-decisions-title" className="text-sm font-semibold text-slate-50">
          {messages.title}
        </h3>
        <p className="mt-1 text-xs text-slate-400">{messages.caption}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-slate-800 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)]">
        <span>{messages.subjectLabel}</span>
        <span>{messages.statusLabel}</span>
        <span className="hidden md:block">{messages.reasonLabel}</span>
      </div>

      <ol className="divide-y divide-slate-800">
        {decisions.map((decision) => (
          <li
            key={`${decision.subjectKind}:${decision.subjectId}`}
            data-decision-subject={decision.subjectId}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)]"
          >
            <code className="min-w-0 break-all text-xs leading-5 text-blue-200">
              {decision.subjectId}
            </code>
            <Badge variant="outline" className={STATUS_CLASS_NAMES[decision.status]}>
              {getStatusLabel(decision.status, messages)}
            </Badge>
            <div className="col-span-2 min-w-0 text-xs leading-5 text-slate-200 md:col-span-1">
              <span className="mr-1 font-medium text-slate-400 md:hidden">
                {messages.reasonLabel}:
              </span>
              {getReasonLabel(decision.reasonCode, messages)}
              {decision.status === 'PARTIAL' ? (
                <dl className="mt-2 grid min-w-0 gap-2 text-[11px] sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="font-medium text-emerald-300">{messages.includedLabel}</dt>
                    <dd className="mt-0.5 break-all text-slate-300">
                      {decision.includedNodeIds.join(', ')}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-amber-300">{messages.excludedLabel}</dt>
                    <dd className="mt-0.5 break-all text-slate-300">
                      {decision.excludedNodeIds.join(', ')}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
