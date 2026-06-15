/** Owned concern: render route-contributed operational drawer panels. */
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import type {
  OperationalDrawerContribution,
  OperationalDrawerTabId,
} from './operationalDrawerContributionStore';

export function BottomOperationalProblemsPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  const problems = contribution.problems.items;

  return (
    <section
      data-slot="bottom-operational-drawer-problems"
      className="h-full min-h-0 overflow-auto px-4 py-3"
      aria-label="Canvas problems"
    >
      {problems.length === 0 ? (
        <p className="text-sm text-[var(--text-subtle)]">No current Canvas problems.</p>
      ) : (
        <ol className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem.id}
              className="grid grid-cols-[6rem_1fr] gap-3 border-b border-[color:var(--border-muted)] py-2 text-sm last:border-b-0"
            >
              <span className="h-fit rounded border border-amber-400/50 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-100">
                {problem.severity}
              </span>
              <span className="min-w-0">
                <span className="block text-[var(--text-default)]">{problem.message}</span>
                <span className="mt-1 block font-mono text-[11px] text-[var(--text-muted)]">
                  {problem.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function BottomOperationalRunsPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  return (
    <section
      data-slot="bottom-operational-drawer-runs"
      className="h-full min-h-0 overflow-auto px-4 py-3 text-sm"
      aria-label="Canvas runs"
    >
      {contribution.runs.activeRunId == null ? (
        <p className="text-[var(--text-subtle)]">No active Canvas run.</p>
      ) : (
        <div className="grid gap-1">
          <span className="text-[var(--text-muted)]">Active run</span>
          <code className="font-mono text-[var(--text-strong)]">
            {contribution.runs.activeRunId}
          </code>
        </div>
      )}
    </section>
  );
}

export function BottomOperationalPreviewPanel({
  contribution,
}: Readonly<{ contribution: OperationalDrawerContribution }>): JSX.Element {
  return (
    <section
      data-slot="bottom-operational-drawer-preview"
      className="h-full min-h-0 overflow-auto px-4 py-3 text-sm"
      aria-label="Canvas execution preview"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
            {contribution.preview.status === 'ready' ? 'Preview ready' : 'Preview blocked'}
          </div>
          <p className="mt-1 text-[var(--text-default)]">{contribution.preview.summary}</p>
          {contribution.preview.blockers.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contribution.preview.blockers.map((blocker) => (
                <code
                  key={blocker}
                  className="rounded border border-amber-400/40 px-2 py-0.5 text-[11px] text-amber-100"
                >
                  {blocker}
                </code>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!contribution.preview.canPreview}
          onClick={contribution.preview.onPreviewExecutionPlan}
        >
          Preview execution plan
        </Button>
      </div>
    </section>
  );
}

export function BottomOperationalDrawerTabs({
  activeTab,
  contribution,
  onSelectTab,
}: Readonly<{
  activeTab: OperationalDrawerTabId;
  contribution: OperationalDrawerContribution;
  onSelectTab: (tab: OperationalDrawerTabId) => void;
}>): JSX.Element {
  return (
    <div
      data-slot="bottom-operational-drawer-tabs"
      className="flex shrink-0 items-center gap-1 border-b border-[color:var(--border-default)] px-3"
      role="tablist"
      aria-label="Canvas operational drawer"
    >
      {contribution.tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          data-slot="bottom-operational-drawer-tab"
          data-tab={tab.id}
          className="h-9 border-b-2 border-transparent px-2 text-xs font-semibold text-[var(--text-muted)] data-[active=true]:border-[color:var(--focus-ring)] data-[active=true]:text-[var(--text-strong)]"
          data-active={activeTab === tab.id}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
          {tab.count == null ? null : <span> {tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function BottomOperationalDrawerBody({
  activeTab,
  contribution,
  logBody,
}: Readonly<{
  activeTab: OperationalDrawerTabId;
  contribution: OperationalDrawerContribution | null;
  logBody: ReactNode;
}>): JSX.Element {
  if (contribution == null || activeTab === 'log') {
    return <>{logBody}</>;
  }

  if (activeTab === 'problems') {
    return <BottomOperationalProblemsPanel contribution={contribution} />;
  }

  if (activeTab === 'runs') {
    return <BottomOperationalRunsPanel contribution={contribution} />;
  }

  return <BottomOperationalPreviewPanel contribution={contribution} />;
}
