import type { PlatformConnectionState } from '../../../capabilities/platform-health';

export type ShellTopBarProps = {
  readonly connectionDetail?: string | null;
  readonly connectionStateOverride?: PlatformConnectionState | null;
  readonly isConnectionChecking?: boolean;
};
