/** Owned concern: render Diff route loading, empty, and error states inside the workbench slot contract. */
import type { ReactNode } from 'react';

import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  RouteWorkbenchFrame,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { diffViewCopy as copy } from './copy';

type DiffWorkbenchStateViewProps = {
  header: ReactNode;
};

type DiffStateCardTone = 'default' | 'danger';

function resolveToneClassName(tone: DiffStateCardTone): string {
  if (tone === 'danger') {
    return 'border-[color:var(--status-danger)]';
  }

  return '';
}

function resolveTitleToneClassName(tone: DiffStateCardTone): string {
  if (tone === 'danger') {
    return 'text-[var(--status-danger)]';
  }

  return '';
}

function DiffStateCard({
  title,
  message,
  dataSlot,
  tone = 'default',
}: {
  title: string;
  message: ReactNode;
  dataSlot: string;
  tone?: DiffStateCardTone;
}) {
  return (
    <Card
      data-slot={dataSlot}
      className={cn(
        'mx-auto max-w-xl p-5',
        routeWorkbenchPanelClassName,
        resolveToneClassName(tone)
      )}
    >
      <h2 className={cn('mb-2 text-base font-semibold', resolveTitleToneClassName(tone))}>
        {title}
      </h2>
      <p
        className={cn(
          'text-sm',
          tone === 'danger' ? 'text-[var(--text-default)]' : routeWorkbenchMutedTextClassName
        )}
      >
        {message}
      </p>
    </Card>
  );
}

function DiffWorkbenchStateLayout({
  header,
  children,
}: DiffWorkbenchStateViewProps & { children: ReactNode }) {
  return (
    <RouteWorkbenchFrame
      header={header}
      slots={{
        primarySurface: (
          <div className="flex min-h-[420px] items-center justify-center">{children}</div>
        ),
      }}
    />
  );
}

export function DiffLoadingStateView({ header }: DiffWorkbenchStateViewProps) {
  return (
    <DiffWorkbenchStateLayout header={header}>
      <DiffStateCard
        dataSlot="diff-loading-state"
        title={copy.states.loadingTitle}
        message={copy.states.loadingMessage}
      />
    </DiffWorkbenchStateLayout>
  );
}

export function DiffEmptyStateView({ header }: DiffWorkbenchStateViewProps) {
  return (
    <DiffWorkbenchStateLayout header={header}>
      <DiffStateCard
        dataSlot="diff-empty-state"
        title={copy.states.emptyTitle}
        message={copy.states.emptyMessage}
      />
    </DiffWorkbenchStateLayout>
  );
}

export function DiffErrorStateView({
  header,
  message,
}: DiffWorkbenchStateViewProps & { message: string }) {
  return (
    <DiffWorkbenchStateLayout header={header}>
      <DiffStateCard
        dataSlot="diff-error-state"
        tone="danger"
        title={copy.states.errorTitle}
        message={message}
      />
    </DiffWorkbenchStateLayout>
  );
}

export function DiffPanelStateView({
  title,
  message,
  dataSlot,
}: {
  title: string;
  message: ReactNode;
  dataSlot: string;
}) {
  return (
    <Card
      data-slot={dataSlot}
      className={cn('p-5 text-sm', routeWorkbenchPanelClassName, routeWorkbenchMutedTextClassName)}
    >
      <div className="mb-2 text-base font-semibold text-[var(--text-default)]">{title}</div>
      <p>{message}</p>
    </Card>
  );
}
