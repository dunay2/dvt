import type { ReactNode } from 'react';

import { Card } from '../../ui/card';
import { cn } from '../../ui/utils';
import {
  routeWorkbenchBodyPaddingClassName,
  routeWorkbenchClassName,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../RouteWorkbenchFrame';

type WorkbenchStateFrameProps = {
  title: string;
  children: ReactNode;
  bodyClassName?: string;
  slotPrefix?: string;
};

export function WorkbenchStateFrame({
  title,
  children,
  bodyClassName,
  slotPrefix = 'workbench-state',
}: WorkbenchStateFrameProps) {
  return (
    <div data-slot={`${slotPrefix}-frame`} className={routeWorkbenchClassName}>
      <div
        data-slot={`${slotPrefix}-header`}
        className={cn(routeWorkbenchHeaderBandClassName, 'flex h-12 items-center px-4 py-0')}
      >
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div
        data-slot={`${slotPrefix}-body`}
        className={cn('flex-1', routeWorkbenchBodyPaddingClassName, bodyClassName)}
      >
        {children}
      </div>
    </div>
  );
}

type WorkbenchStateCardTone = 'default' | 'danger' | 'warning';

type WorkbenchStateCardProps = {
  children: ReactNode;
  className?: string;
  dataSlot?: string;
  tone?: WorkbenchStateCardTone;
};

function resolveWorkbenchStateToneClassName(tone: WorkbenchStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'border-[color:var(--status-danger)] bg-[var(--surface-elevated)]';
    case 'warning':
      return 'border-[color:var(--status-warning)] bg-[var(--surface-elevated)]';
    default:
      return '';
  }
}

function resolveWorkbenchStateTitleToneClassName(tone: WorkbenchStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'text-[var(--status-danger)]';
    case 'warning':
      return 'text-[var(--status-warning)]';
    default:
      return '';
  }
}

function WorkbenchStateCard({
  children,
  className,
  dataSlot,
  tone = 'default',
}: WorkbenchStateCardProps) {
  return (
    <Card
      data-slot={dataSlot}
      className={cn(
        routeWorkbenchPanelClassName,
        resolveWorkbenchStateToneClassName(tone),
        className
      )}
    >
      {children}
    </Card>
  );
}

type WorkbenchEmptyStateProps = {
  frameTitle: string;
  title: string;
  message: ReactNode;
  action?: ReactNode;
  centered?: boolean;
  dataSlot?: string;
  slotPrefix?: string;
};

export function WorkbenchEmptyState({
  frameTitle,
  title,
  message,
  action,
  centered = false,
  dataSlot = 'workbench-empty-state',
  slotPrefix,
}: WorkbenchEmptyStateProps) {
  return (
    <WorkbenchStateFrame title={frameTitle} slotPrefix={slotPrefix}>
      <WorkbenchStateCard
        dataSlot={dataSlot}
        className={cn('mx-auto max-w-xl', centered ? 'p-8 text-center' : 'p-5')}
      >
        <h2 className="mb-2 text-base font-semibold">{title}</h2>
        <p className={cn(action ? 'mb-3' : '', 'text-sm', routeWorkbenchMutedTextClassName)}>
          {message}
        </p>
        {action}
      </WorkbenchStateCard>
    </WorkbenchStateFrame>
  );
}

type WorkbenchLoadingStateProps = {
  frameTitle: string;
  message: ReactNode;
  dataSlot?: string;
  slotPrefix?: string;
};

export function WorkbenchLoadingState({
  frameTitle,
  message,
  dataSlot = 'workbench-loading-state',
  slotPrefix,
}: WorkbenchLoadingStateProps) {
  return (
    <WorkbenchStateFrame title={frameTitle} slotPrefix={slotPrefix}>
      <WorkbenchStateCard
        dataSlot={dataSlot}
        className={cn('mx-auto max-w-xl p-5 text-sm', routeWorkbenchMutedTextClassName)}
      >
        {message}
      </WorkbenchStateCard>
    </WorkbenchStateFrame>
  );
}

type WorkbenchErrorStateProps = {
  frameTitle: string;
  title: string;
  message: ReactNode;
  dataSlot?: string;
  slotPrefix?: string;
};

export function WorkbenchErrorState({
  frameTitle,
  title,
  message,
  dataSlot = 'workbench-error-state',
  slotPrefix,
}: WorkbenchErrorStateProps) {
  return (
    <WorkbenchStateFrame title={frameTitle} slotPrefix={slotPrefix}>
      <WorkbenchStateCard dataSlot={dataSlot} tone="danger" className="mx-auto max-w-xl p-5">
        <h2
          className={cn(
            'mb-2 text-base font-semibold',
            resolveWorkbenchStateTitleToneClassName('danger')
          )}
        >
          {title}
        </h2>
        <p className="text-sm text-[var(--text-default)]">{message}</p>
      </WorkbenchStateCard>
    </WorkbenchStateFrame>
  );
}

type WorkbenchDegradedStateProps = {
  title: string;
  message: ReactNode;
  note?: ReactNode;
  dataSlot?: string;
};

export function WorkbenchDegradedState({
  title,
  message,
  note,
  dataSlot = 'workbench-degraded-state',
}: WorkbenchDegradedStateProps) {
  return (
    <WorkbenchStateCard dataSlot={dataSlot} tone="warning" className="rounded px-3 py-2 text-sm">
      <div className={cn('font-semibold', resolveWorkbenchStateTitleToneClassName('warning'))}>
        {title}
      </div>
      <div className="mt-1 text-[var(--text-default)]">{message}</div>
      {note ? <div className={cn('mt-1', routeWorkbenchMutedTextClassName)}>{note}</div> : null}
    </WorkbenchStateCard>
  );
}
