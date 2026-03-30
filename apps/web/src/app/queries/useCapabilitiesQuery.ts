import { useQuery } from '@tanstack/react-query';

export type CapabilitiesResponse = {
  apiVersion: string;
  minFrontendVersion: string;
  plugins: Record<string, { available: boolean; reason?: string }>;
};

async function fetchCapabilities(): Promise<CapabilitiesResponse> {
  const res = await fetch('/api/capabilities');
  if (!res.ok) throw new Error('capabilities unavailable');
  return res.json() as Promise<CapabilitiesResponse>;
}

export function useCapabilitiesQuery() {
  return useQuery({
    queryKey: ['shell', 'capabilities'],
    queryFn: fetchCapabilities,
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * Returns true if the backend says the plugin is available, or if the backend
 * is unreachable (fail-open). Returns false only when the backend explicitly
 * marks it as unavailable.
 */
export function isPluginAvailableFromCapabilities(
  capabilities: CapabilitiesResponse | undefined,
  pluginId: string
): boolean {
  if (!capabilities) return true;
  const info = capabilities.plugins[pluginId];
  if (!info) return true;
  return info.available;
}
