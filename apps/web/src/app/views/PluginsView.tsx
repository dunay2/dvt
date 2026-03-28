import { CheckCircle2, Info, Puzzle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PLUGIN_REGISTRY } from '../plugins/registry';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';

// ---------------------------------------------------------------------------
// /api/capabilities — optional backend availability check
// ---------------------------------------------------------------------------

type CapabilitiesResponse = {
  apiVersion: string;
  minFrontendVersion: string;
  plugins: Record<string, { available: boolean; reason?: string }>;
};

async function fetchCapabilities(): Promise<CapabilitiesResponse> {
  const res = await fetch('/api/capabilities');
  if (!res.ok) throw new Error('capabilities unavailable');
  return res.json() as Promise<CapabilitiesResponse>;
}

// ---------------------------------------------------------------------------
// PluginsView — read-only, informative (v1 spec §7)
// ---------------------------------------------------------------------------

export default function PluginsView() {
  const { data: capabilities } = useQuery({
    queryKey: ['shell', 'capabilities'],
    queryFn: fetchCapabilities,
    retry: false,
    staleTime: 60_000,
  });

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Puzzle className="size-6 text-orange-400" />
          <div>
            <h1 className="text-xl font-semibold">Plugins</h1>
            <p className="text-xs text-slate-400">
              {PLUGIN_REGISTRY.length} plugin{PLUGIN_REGISTRY.length !== 1 ? 's' : ''} registered
              {capabilities && (
                <span className="ml-2 text-slate-500">· API {capabilities.apiVersion}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          {PLUGIN_REGISTRY.map((plugin) => {
            const backendInfo = capabilities?.plugins[plugin.id];
            const isAvailable = backendInfo?.available ?? true; // assume available if no backend info

            return (
              <Card key={plugin.id} className="border-slate-700 bg-slate-900 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Icon placeholder */}
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-700">
                      <Puzzle className="size-5" />
                    </div>

                    <div>
                      {/* Name + version + status */}
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold">{resolveString(plugin.displayName)}</span>
                        <Badge variant="outline" className="text-xs">
                          v{plugin.version}
                        </Badge>
                        {isAvailable ? (
                          <Badge className="bg-green-700 text-xs">
                            <CheckCircle2 className="mr-1 size-3" />
                            available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-red-400">
                            <XCircle className="mr-1 size-3" />
                            unavailable
                          </Badge>
                        )}
                      </div>

                      {/* Unavailability reason */}
                      {backendInfo?.reason && (
                        <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                          <Info className="size-3 shrink-0" />
                          {backendInfo.reason}
                        </p>
                      )}

                      {/* Capabilities */}
                      {(plugin.capabilities?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-xs text-slate-500">Capabilities</div>
                          <div className="flex flex-wrap gap-1">
                            {plugin.capabilities!.map((cap) => (
                              <Badge key={cap} variant="secondary" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Node kinds */}
                      {(plugin.nodeKinds?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-xs text-slate-500">Node kinds</div>
                          <div className="flex flex-wrap gap-1">
                            {plugin.nodeKinds!.map((kind) => (
                              <Badge
                                key={kind.kind}
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {kind.kind}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plugin id — always visible for debugging */}
                  <span className="shrink-0 font-mono text-[10px] text-slate-600">{plugin.id}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
