import { AlertTriangle, WifiOff } from 'lucide-react';

import type { PlatformHealthSnapshot } from '../services/platform/types';

type GlobalStatusBannerProps = {
  restStatus: 'ok' | 'degraded' | 'offline';
  snapshot: PlatformHealthSnapshot | undefined;
  errorMessage: string | null;
};

function formatReason(snapshot: PlatformHealthSnapshot | undefined): string {
  if (!snapshot) {
    return 'No health payload available yet';
  }

  const reasons: string[] = [];

  if (snapshot.healthz.status === 'degraded') {
    const reconciler = snapshot.healthz.components.intentReconciler;
    if (reconciler.status === 'degraded') {
      reasons.push(`intentReconciler=${reconciler.reasonCode}`);
    } else {
      reasons.push(`healthz=${snapshot.healthz.status}`);
    }
  }

  if (snapshot.readyz.available && snapshot.readyz.data?.ok === false) {
    reasons.push(`readyz=${snapshot.readyz.data.reasonCode}`);
  }

  if (snapshot.dbReady.available && snapshot.dbReady.data?.ok === false) {
    reasons.push(`dbReady=${snapshot.dbReady.data.reason ?? 'unavailable'}`);
  }

  if (snapshot.readyz.error) {
    reasons.push(`readyzError=${snapshot.readyz.error}`);
  }
  if (snapshot.version.error) {
    reasons.push(`versionError=${snapshot.version.error}`);
  }
  if (snapshot.dbReady.error) {
    reasons.push(`dbReadyError=${snapshot.dbReady.error}`);
  }

  return reasons.length > 0 ? reasons.join(' | ') : 'Platform reports degraded state';
}

export default function GlobalStatusBanner({
  restStatus,
  snapshot,
  errorMessage,
}: GlobalStatusBannerProps) {
  if (restStatus === 'ok') {
    return null;
  }

  if (restStatus === 'offline') {
    return (
      <div className="h-8 border-b border-red-700 bg-red-950/60 px-4 text-red-100">
        <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-2 text-xs">
          <WifiOff className="size-3" />
          <span className="font-medium">Offline</span>
          <span className="truncate text-red-200/90">
            {errorMessage ?? 'Unable to reach /healthz'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-8 border-b border-amber-700 bg-amber-950/60 px-4 text-amber-100">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-2 text-xs">
        <AlertTriangle className="size-3" />
        <span className="font-medium">Degraded</span>
        <span className="truncate text-amber-200/90">{formatReason(snapshot)}</span>
      </div>
    </div>
  );
}
