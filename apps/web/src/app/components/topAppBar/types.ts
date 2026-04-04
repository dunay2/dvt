import type { PlatformConnectionState } from '../../../capabilities/platform-health';

export type TopAppBarProps = {
  readonly connectionDetail?: string | null;
  readonly connectionStateOverride?: PlatformConnectionState | null;
  readonly isConnectionChecking?: boolean;
};
