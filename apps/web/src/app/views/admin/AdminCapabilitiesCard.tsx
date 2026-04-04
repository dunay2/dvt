import { Radio } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { adminViewCopy as copy } from './copy';
import { getCapabilitiesEmptyState } from './adminViewModel';
import { AdminStatusBadge } from './AdminStatusBadge';
import type { AdminPlatformTabProps } from './platformTypes';

type CapabilitiesProps = Pick<
  AdminPlatformTabProps,
  'capabilitiesData' | 'capabilitiesLoading' | 'capabilitiesError'
>;

export function AdminCapabilitiesCard({
  capabilitiesData,
  capabilitiesLoading,
  capabilitiesError,
}: Readonly<CapabilitiesProps>) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="size-5 text-cyan-400" />
        <div>
          <h3 className="font-semibold">{copy.sections.capabilitiesTitle}</h3>
          <p className="text-sm text-slate-400">{copy.sections.capabilitiesSubtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {copy.labels.frontendCompatibility}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">apiVersion: {capabilitiesData?.apiVersion ?? 'n/a'}</Badge>
            <Badge variant="outline">
              minFrontendVersion: {capabilitiesData?.minFrontendVersion ?? 'n/a'}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
          <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
            {copy.labels.pluginAvailability}
          </div>
          <div className="space-y-2">
            {capabilitiesData ? (
              Object.entries(capabilitiesData.plugins).map(([pluginId, info]) => (
                <div
                  key={pluginId}
                  className="flex items-center justify-between rounded border border-slate-800 px-3 py-2"
                >
                  <span className="font-mono text-sm text-slate-200">{pluginId}</span>
                  <div className="flex items-center gap-2">
                    {info.reason ? (
                      <span className="text-xs text-slate-500">{info.reason}</span>
                    ) : null}
                    <AdminStatusBadge
                      ok={info.available}
                      label={info.available ? 'available' : 'blocked'}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">
                {getCapabilitiesEmptyState(capabilitiesLoading, capabilitiesError)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
