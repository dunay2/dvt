import { Server } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { adminViewCopy as copy } from './copy';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { AdminPlatformTabProps } from './platformTypes';

type ProbeDetailsProps = Pick<AdminPlatformTabProps, 'platformHealthSnapshot'>;

export function AdminProbeDetailsCard({ platformHealthSnapshot }: Readonly<ProbeDetailsProps>) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Server className="size-5 text-blue-400" />
        <div>
          <h3 className="font-semibold">{copy.sections.backendProbeTitle}</h3>
          <p className="text-sm text-slate-400">{copy.sections.backendProbeSubtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ProbeEndpoint
          label="/healthz"
          ok={platformHealthSnapshot?.healthz.data.status === 'healthy'}
          status={platformHealthSnapshot?.healthz.data.status ?? 'offline'}
          description={`intent reconciler: ${platformHealthSnapshot?.healthz.data?.components?.intentReconciler?.status ?? 'n/a'}`}
          statusCode={platformHealthSnapshot?.healthz.statusCode}
          latencyMs={platformHealthSnapshot?.healthz.latencyMs}
        />
        <ProbeEndpoint
          label="/readyz"
          ok={platformHealthSnapshot?.readyz.data?.ok === true}
          status={platformHealthSnapshot?.readyz.data?.status ?? 'unavailable'}
          description={
            platformHealthSnapshot?.readyz.availability === 'available'
              ? (platformHealthSnapshot?.readyz.error?.message ?? 'endpoint responded')
              : 'endpoint not enabled'
          }
          statusCode={platformHealthSnapshot?.readyz.statusCode}
          latencyMs={platformHealthSnapshot?.readyz.latencyMs}
        />
        <ProbeEndpoint
          label="/version"
          ok={platformHealthSnapshot?.version.availability === 'available'}
          status={platformHealthSnapshot?.version.statusCode?.toString() ?? 'n/a'}
          description={
            platformHealthSnapshot?.version.data
              ? `${platformHealthSnapshot.version.data.name}@${platformHealthSnapshot.version.data.version}`
              : (platformHealthSnapshot?.version.error?.message ?? 'endpoint not enabled')
          }
          statusCode={platformHealthSnapshot?.version.statusCode}
          latencyMs={platformHealthSnapshot?.version.latencyMs}
          monospaced
        />
        <ProbeEndpoint
          label="/db/ready"
          ok={platformHealthSnapshot?.dbReady.data?.ok === true}
          status={platformHealthSnapshot?.dbReady.statusCode?.toString() ?? 'n/a'}
          description={
            platformHealthSnapshot?.dbReady.data?.reason ??
            platformHealthSnapshot?.dbReady.error?.message ??
            'endpoint not enabled'
          }
          statusCode={platformHealthSnapshot?.dbReady.statusCode}
          latencyMs={platformHealthSnapshot?.dbReady.latencyMs}
        />
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {copy.labels.apiBaseUrl}
            </div>
            <div className="mt-2 break-all font-mono text-sm text-slate-200">
              {platformHealthSnapshot?.apiBaseUrl ?? 'not resolved'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {copy.labels.dataSourceMode}
            </div>
            <div className="mt-2 text-sm text-slate-200">
              {platformHealthSnapshot?.dataSourceMode ?? 'unknown'}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          fetched at {platformHealthSnapshot?.fetchedAt ?? 'n/a'}
        </div>
      </div>
    </Card>
  );
}

function ProbeEndpoint({
  label,
  ok,
  status,
  description,
  statusCode,
  latencyMs,
  monospaced = false,
}: Readonly<{
  label: string;
  ok: boolean;
  status: string;
  description: string;
  statusCode: number | null | undefined;
  latencyMs: number | null | undefined;
  monospaced?: boolean;
}>) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <AdminStatusBadge ok={ok} label={status} />
      </div>
      <div className={monospaced ? 'font-mono text-xs text-slate-400' : 'text-xs text-slate-400'}>
        {description}
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        HTTP {statusCode ?? 'n/a'} - {latencyMs ?? 'n/a'} ms
      </div>
    </div>
  );
}
