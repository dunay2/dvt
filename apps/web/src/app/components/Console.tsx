import { Terminal, FileText, BarChart3, Radio, X } from 'lucide-react';
import { useState } from 'react';

import { useAppStore } from '../stores/appStore';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export default function Console() {
  const { setConsolePanelHeight, currentRun } = useAppStore();
  const [activeTab, setActiveTab] = useState('events');

  const mockLogs = [
    { time: '10:35:14', level: 'INFO', message: 'Starting run step...' },
    { time: '10:35:14', level: 'INFO', message: 'Running stg_orders [1 of 4]' },
    { time: '10:35:16', level: 'SUCCESS', message: 'stg_orders completed in 2.3s' },
    { time: '10:35:16', level: 'INFO', message: 'Running stg_customers [2 of 4]' },
    { time: '10:35:18', level: 'SUCCESS', message: 'stg_customers completed in 1.8s' },
    { time: '10:35:18', level: 'INFO', message: 'Running dim_store [3 of 4]' },
  ];

  const mockEvents = currentRun?.events || [];

  return (
    <div className="h-full bg-[#0f1116] border-t border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-gray-400" />
          <span className="text-sm font-medium">Console</span>
          {currentRun && (
            <Badge variant="outline" className="text-xs">
              Run {currentRun.runId}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-gray-400 hover:text-white"
          onClick={() => setConsolePanelHeight(0)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="bg-transparent border-b border-gray-800 rounded-none px-4">
          <TabsTrigger value="events" className="data-[state=active]:bg-[#1a1d23]">
            <Radio className="size-3 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-[#1a1d23]">
            <FileText className="size-3 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-[#1a1d23]">
            <BarChart3 className="size-3 mr-2" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {mockEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No events yet</p>
              ) : (
                mockEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 text-xs font-mono">
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={
                        event.type.includes('Completed') || event.type.includes('Started')
                          ? 'text-blue-400'
                          : event.type.includes('Failed')
                            ? 'text-red-400'
                            : 'text-gray-300'
                      }
                    >
                      [{event.type}]
                    </span>
                    <span className="text-gray-300">{event.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-1 font-mono text-xs">
              {mockLogs.map((log, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-gray-500">{log.time}</span>
                  <span
                    className={
                      log.level === 'SUCCESS'
                        ? 'text-green-400'
                        : log.level === 'ERROR'
                          ? 'text-red-400'
                          : log.level === 'WARN'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                    }
                  >
                    [{log.level}]
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1d23] border border-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total Duration</div>
                  <div className="text-xl font-semibold mt-1">20.7s</div>
                </div>
                <div className="bg-[#1a1d23] border border-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Models Run</div>
                  <div className="text-xl font-semibold mt-1">4 / 4</div>
                </div>
                <div className="bg-[#1a1d23] border border-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Estimated Cost</div>
                  <div className="text-xl font-semibold mt-1">$0.45</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
