export type RuntimeCapabilitiesDto = {
  apiVersion: string;
  minFrontendVersion: string;
  plugins: Record<string, { available: boolean; reason?: string }>;
};
