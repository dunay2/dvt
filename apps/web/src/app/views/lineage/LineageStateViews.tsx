/** Owned concern: render Lineage route loading, empty, and error states inside the workbench slot contract. */
import type { ReactNode } from 'react';

import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  RouteWorkbenchFrame,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { lineageViewCopy as copy } from './copy';

type LineageWorkbenchStateViewProps = {
  header: ReactNode;
};

type LineageStateCardTone = 'default' | 'danger' | 'warning';

function resolveToneClassName(tone: LineageStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'border-[color:var(--status-danger)]';
    case 'warning':
      return 'border-[color:var(--status-warning)]';
    default:
      return '';
  }
}

function resolveTitleToneClassName(tone: LineageStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'text-[var(--status-danger)]';
    case 'warning':
      return 'text-[var(--status-warning)]';
    default:
      return '';
  }
}

function LineageStateCard({
  title,
  message,
  dataSlot,
  tone = 'default',
}: {
  title: string;
  message: ReactNode;
  dataSlot: string;
  tone?: LineageStateCardTone;
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

function LineageWorkbenchStateLayout({
  header,
  children,
}: LineageWorkbenchStateViewProps & { children: ReactNode }) {
  return (
    <RouteWorkbenchFrame
      header={header}
      bodyContainerClassName="flex min-h-[420px] items-center justify-center"
      slots={{
        primarySurface: <>{children}</>,
      }}
    />
  );
}

export function LineageLoadingStateView({ header }: LineageWorkbenchStateViewProps) {
  return (
    <LineageWorkbenchStateLayout header={header}>
      <LineageStateCard
        dataSlot="lineage-loading-state"
        title={copy.routeLoadingTitle}
        message={copy.routeLoadingMessage}
      />
    </LineageWorkbenchStateLayout>
  );
}

export function LineageEmptyStateView({ header }: LineageWorkbenchStateViewProps) {
  return (
    <LineageWorkbenchStateLayout header={header}>
      <LineageStateCard
        dataSlot="lineage-empty-state"
        title={copy.routeEmptyTitle}
        message={copy.routeEmptyMessage}
      />
    </LineageWorkbenchStateLayout>
  );
}

export function LineageErrorStateView({
  header,
  message,
}: LineageWorkbenchStateViewProps & { message: string }) {
  return (
    <LineageWorkbenchStateLayout header={header}>
      <LineageStateCard
        dataSlot="lineage-error-state"
        tone="danger"
        title={copy.routeErrorTitle}
        message={message}
      />
    </LineageWorkbenchStateLayout>
  );
}
