import { CheckCircle2, Info, Puzzle, Radio, XCircle } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { PLUGIN_REGISTRY } from '../plugins/registry';

export default function PluginsView() {
  const {
    data: capabilities,
    error: capabilitiesError,
    isLoading: capabilitiesLoading,
  } = useCapabilitiesQuery();

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <Puzzle className="size-6 text-orange-400" />
          <div>
            <h1 className="text-xl font-semibold">Plugins</h1>
            <p className="text-xs text-slate-400">
              {PLUGIN_REGISTRY.length} plugin{PLUGIN_REGISTRY.length !== 1 ? 's' : ''} registered
              {capabilities && (
                <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                  <Radio className="size-3" />
                  API {capabilities.apiVersion}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          {capabilitiesLoading && (
            <Card className="border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              Checking backend capability availability...
            </Card>
          )}

          {capabilitiesError && (
            <Card className="border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-medium">Backend capability probe unavailable</div>
                  <p className="mt-1 text-amber-100/80">
                    `/api/capabilities` did not respond. Availability is being shown from frontend
                    registry state only.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {PLUGIN_REGISTRY.map((plugin) => {
            const backendInfo = capabilities?.plugins[plugin.id];
            const isAvailable = backendInfo?.available ?? true;
            const envFlagValue = plugin.envFlag
              ? (import.meta.env as Record<string, string | boolean | undefined>)[plugin.envFlag]
              : undefined;

            return (
              <Card key={plugin.id} className="border-slate-700 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700">
                      <Puzzle className="size-5" />
                    </div>

                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{resolveString(plugin.displayName)}</span>
                        <Badge variant="outline" className="text-xs">
                          v{plugin.version}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {plugin.kind ?? 'core'}
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

                      {backendInfo?.reason && (
                        <p className="mb-2 flex items-center gap-1 text-xs text-slate-400">
                          <Info className="size-3 shrink-0" />
                          {backendInfo.reason}
                        </p>
                      )}

                      {plugin.envFlag && (
                        <p className="mt-1 text-xs text-slate-500">
                          env flag: <span className="font-mono">{plugin.envFlag}</span> ={' '}
                          <span className="font-mono">{envFlagValue ?? 'unset'}</span>
                        </p>
                      )}

                      {(plugin.capabilities?.length ?? 0) > 0 && (
                        <div className="mt-3">
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

                      {(plugin.nodeKinds?.length ?? 0) > 0 && (
                        <div className="mt-3">
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
