import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import {
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
} from '../../components/workbench/state/WorkbenchStates';
import type { CodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { codeViewCopy as copy } from './codeViewCopy';

function CodePreviewStateCard({
  title,
  message,
  dataSlot,
  tone = 'default',
  selectedPath,
}: {
  title: string;
  message: string;
  dataSlot: string;
  tone?: 'default' | 'danger';
  selectedPath?: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      {' '}
      <Card
        data-slot={dataSlot}
        className={cn(
          routeWorkbenchPanelClassName,
          'mx-auto w-full max-w-2xl p-5',
          tone === 'danger'
            ? 'border-[color:var(--status-danger)] bg-[var(--surface-elevated)]'
            : ''
        )}
      >
        {' '}
        <h2
          className={cn(
            'mb-2 text-base font-semibold',
            tone === 'danger' ? 'text-[var(--status-danger)]' : ''
          )}
        >
          {' '}
          {title}{' '}
        </h2>{' '}
        <p className="text-sm text-[var(--text-default)]">{message}</p>{' '}
        {selectedPath ? (
          <p className={cn('mt-2 text-sm font-mono', routeWorkbenchMutedTextClassName)}>
            {' '}
            {selectedPath}{' '}
          </p>
        ) : null}{' '}
      </Card>{' '}
    </div>
  );
}

export function CodeRouteLoadingStateView() {
  return (
    <WorkbenchLoadingState
      frameTitle={copy.title}
      slotPrefix="code-state"
      dataSlot="code-route-loading-state"
      message={copy.routeLoadingMessage}
    />
  );
}

export function CodeRouteEmptyStateView() {
  return (
    <WorkbenchEmptyState
      frameTitle={copy.title}
      slotPrefix="code-state"
      dataSlot="code-route-empty-state"
      title={copy.routeEmptyTitle}
      message={copy.routeEmptyMessage}
      centered
    />
  );
}

export function CodeRouteErrorStateView({ error }: { error: CodeWorkbenchErrorPresentation }) {
  return (
    <WorkbenchErrorState
      frameTitle={copy.title}
      slotPrefix="code-state"
      dataSlot="code-route-error-state"
      title={error.title}
      message={error.message}
    />
  );
}

export function CodePreviewEmptyStateView() {
  return (
    <CodePreviewStateCard
      dataSlot="code-preview-empty-state"
      title={copy.previewEmptyTitle}
      message={copy.previewEmptyMessage}
    />
  );
}

export function CodePreviewErrorStateView({ error }: { error: CodeWorkbenchErrorPresentation }) {
  return (
    <CodePreviewStateCard
      dataSlot="code-preview-error-state"
      title={error.title}
      message={error.message}
      tone="danger"
      selectedPath={error.selectedPath}
    />
  );
}
