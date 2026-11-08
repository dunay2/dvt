/** Owned concern: define shell top-bar presentation inputs without resolving route or runtime state. */
import type { PlatformConnectionState } from '../../../capabilities/platform-health';

export type ShellTopBarProps = {
  readonly connectionDetail?: string | null;
  readonly connectionStateOverride?: PlatformConnectionState | null;
  readonly isConnectionChecking?: boolean;
};
