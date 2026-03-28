import { useQuery } from '@tanstack/react-query';
import { Puzzle, CheckCircle2, XCircle, Settings, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { resolveDataSource } from '../services/config/dataSource';
import { createWorkspaceService } from '../services/workspace/workspaceService';

const workspaceService = createWorkspaceService(resolveDataSource());

export default function PluginsView() {
  const pluginsQuery = useQuery({
    queryKey: ['workspace', 'plugins'],
    queryFn: () => workspaceService.getPlugins(),
  });
  const [plugins, setPlugins] = useState(() => pluginsQuery.data ?? []);

  useEffect(() => {
    if (pluginsQuery.data) {
      setPlugins(pluginsQuery.data);
    }
  }, [pluginsQuery.data]);

  const handleTogglePlugin = (pluginId: string) => {
    setPlugins((prev) => prev.map((p) => (p.id === pluginId ? { ...p, enabled: !p.enabled } : p)));
    const plugin = plugins.find((p) => p.id === pluginId);
    toast.success(`${plugin?.name} ${plugin?.enabled ? 'disabled' : 'enabled'}`);
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Puzzle className="size-6 text-orange-400" />
            <h1 className="text-xl font-semibold">Plugins</h1>
          </div>
          <Button variant="default">Browse Marketplace</Button>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="installed" className="max-w-5xl mx-auto">
            <TabsList className="bg-slate-900 border border-slate-700">
              <TabsTrigger value="installed">Installed ({plugins.length})</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            </TabsList>

            <TabsContent value="installed" className="space-y-4 mt-6">
              {plugins.map((plugin) => (
                <Card key={plugin.id} className="bg-slate-900 border-slate-700 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="size-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Puzzle className="size-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{plugin.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            v{plugin.version}
                          </Badge>
                          {plugin.enabled ? (
                            <Badge className="bg-green-600 text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <XCircle className="size-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{plugin.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={() => handleTogglePlugin(plugin.id)}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                    <div className="flex gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Capabilities</div>
                        <div className="flex gap-1">
                          {plugin.capabilities.map((cap) => (
                            <Badge key={cap} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Permissions</div>
                        <div className="flex gap-1">
                          {plugin.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="size-4 mr-2" />
                        Configure
                      </Button>
                      <Button variant="outline" size="sm">
                        <ShieldCheck className="size-4 mr-2" />
                        Permissions
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="marketplace" className="mt-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    name: 'Data Quality Pro',
                    description: 'Advanced data quality checks and anomaly detection',
                    category: 'Quality',
                  },
                  {
                    name: 'Snowflake Optimizer',
                    description: 'Optimize Snowflake warehouse usage and costs',
                    category: 'Performance',
                  },
                  {
                    name: 'Teams Notifier',
                    description: 'Send run notifications to Microsoft Teams',
                    category: 'Notifications',
                  },
                  {
                    name: 'Git Auto-Commit',
                    description: 'Automatically commit changes to Git on successful runs',
                    category: 'Automation',
                  },
                ].map((plugin, idx) => (
                  <Card
                    key={idx}
                    className="bg-slate-900 border-slate-700 p-4 hover:border-slate-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="size-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Puzzle className="size-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{plugin.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {plugin.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-4">{plugin.description}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Install
                    </Button>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

