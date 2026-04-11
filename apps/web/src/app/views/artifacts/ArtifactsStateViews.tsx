import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { artifactsViewCopy as copy } from './copy';

type ArtifactsStateCardTone = 'default' | 'danger' | 'warning';

function resolveToneClassName(tone: ArtifactsStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'border-[color:var(--status-danger)]';
    case 'warning':
      return 'border-[color:var(--status-warning)]';
    default:
      return '';
  }
}

function resolveTitleToneClassName(tone: ArtifactsStateCardTone): string {
  switch (tone) {
    case 'danger':
      return 'text-[var(--status-danger)]';
    case 'warning':
      return 'text-[var(--status-warning)]';
    default:
      return '';
  }
}

function ArtifactsStateCard({
  title,
  message,
  dataSlot,
  tone = 'default',
}: {
  title: string;
  message: string;
  dataSlot: string;
  tone?: ArtifactsStateCardTone;
}) {
  return (
    <Card
      data-slot={dataSlot}
      className={cn(
        'mx-auto max-w-3xl p-5',
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

export function ArtifactsLoadingStateView() {
  return (
    <ArtifactsStateCard
      dataSlot="artifacts-loading-state"
      title={copy.routeLoadingTitle}
      message={copy.routeLoadingMessage}
    />
  );
}

export function ArtifactsEmptyStateView() {
  return (
    <ArtifactsStateCard
      dataSlot="artifacts-empty-state"
      title={copy.routeEmptyTitle}
      message={copy.routeEmptyMessage}
    />
  );
}

export function ArtifactsErrorStateView({ message }: { message: string }) {
  return (
    <ArtifactsStateCard
      dataSlot="artifacts-error-state"
      tone="danger"
      title={copy.routeErrorTitle}
      message={message}
    />
  );
}

export function ArtifactsInvalidImportStateView({ message }: { message: string }) {
  return (
    <ArtifactsStateCard
      dataSlot="artifacts-invalid-import-state"
      tone="warning"
      title={copy.invalidImportTitle}
      message={`${copy.invalidImportMessagePrefix} ${message}`}
    />
  );
}

export function ArtifactPreviewUnavailableStateView({ fileName }: { fileName: string }) {
  return (
    <div
      data-slot="artifact-preview-unavailable-state"
      className={cn(
        'rounded border border-dashed border-[var(--border-default)] px-4 py-6 text-sm',
        routeWorkbenchMutedTextClassName
      )}
    >
      <div className="mb-2 font-semibold text-[var(--text-default)]">
        {copy.previewUnavailableTitle}
      </div>
      <p>
        {copy.previewUnavailableMessage} <span className="font-mono">{fileName}</span>.
      </p>
    </div>
  );
}
