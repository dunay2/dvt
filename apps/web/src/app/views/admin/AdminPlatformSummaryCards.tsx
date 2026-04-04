import { Activity, Database, Link2, Radio } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { adminViewCopy as copy } from './copy';
import { getBackendStatusLabel, getReadyzSummary } from './adminViewModel';
import type { AdminPlatformTabProps } from './platformTypes';

type SummaryProps = Pick<AdminPlatformTabProps, 'connectionStatus' | 'platformHealthSnapshot' | 'capabilitiesData'>;

export function AdminPlatformSummaryCards({
  connectionStatus,
  platformHealthSnapshot,
  capabilitiesData,
}: Readonly<SummaryProps>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-slate-700 bg-slate-900 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{copy.labels.backendStatus}</div>
            <div className="mt-2 text-lg font-semibold">{getBackendStatusLabel(connectionStatus.rest)}</div>
          </div>
          <Activity
            className={cn(
              'size-5',
              connectionStatus.rest === 'ok' && 'text-green-400',
              connectionStatus.rest === 'degraded' && 'text-amber-400',
              connectionStatus.rest === 'offline' && 'text-red-400'
            )}
          />
        </div>
        <div className="mt-4 text-sm text-slate-400">
          REST: {connectionStatus.rest} - events: {connectionStatus.liveEvents}
        </div>
      </Card>

      <Card className="border-slate-700 bg-slate-900 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{copy.labels.version}</div>
            <div className="mt-2 text-lg font-semibold">
              {platformHealthSnapshot?.version.data?.version ?? 'unknown'}
            </div>
          </div>
          <Radio className="size-5 text-cyan-400" />
        </div>
        <div className="mt-4 text-sm text-slate-400">
          {platformHealthSnapshot?.version.data?.name ?? 'backend'} - API {capabilitiesData?.apiVersion ?? 'n/a'}
        </div>
      </Card>

      <Card className="border-slate-700 bg-slate-900 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{copy.labels.readiness}</div>
            <div className="mt-2 text-lg font-semibold">
              {platformHealthSnapshot?.readyz.data?.status ?? 'unavailable'}
            </div>
          </div>
          <Link2 className="size-5 text-violet-400" />
        </div>
        <div className="mt-4 text-sm text-slate-400">{getReadyzSummary(platformHealthSnapshot)}</div>
      </Card>

      <Card className="border-slate-700 bg-slate-900 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{copy.labels.dataSourceMode}</div>
            <div className="mt-2 text-lg font-semibold">
              {platformHealthSnapshot?.dataSourceMode ?? 'unknown'}
            </div>
          </div>
          <Database className="size-5 text-emerald-400" />
        </div>
        <div className="mt-4 text-sm text-slate-400">
          API base: {platformHealthSnapshot?.apiBaseUrl ?? 'not resolved'}
        </div>
      </Card>
    </div>
  );
}

