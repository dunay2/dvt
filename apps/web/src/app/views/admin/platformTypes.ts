import type { AdminPlatformHealthPresentation } from './adminViewModel';

export type AdminCapabilitiesData =
  | {
      apiVersion: string;
      minFrontendVersion: string;
      plugins: Record<string, { available: boolean; reason?: string }>;
    }
  | undefined;

export type AdminPlatformTabProps = {
  health: AdminPlatformHealthPresentation;
  capabilitiesData: AdminCapabilitiesData;
  capabilitiesLoading: boolean;
  capabilitiesError: boolean;
};
