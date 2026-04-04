import type {
  PlatformConnectionState,
  PlatformHealthSnapshot,
} from '../../../capabilities/platform-health';

export type AdminCapabilitiesData =
  | {
      apiVersion: string;
      minFrontendVersion: string;
      plugins: Record<string, { available: boolean; reason?: string }>;
    }
  | undefined;

export type AdminPlatformTabProps = {
  connectionStatus: PlatformConnectionState;
  platformHealthSnapshot: PlatformHealthSnapshot | undefined;
  capabilitiesData: AdminCapabilitiesData;
  capabilitiesLoading: boolean;
  capabilitiesError: boolean;
};
