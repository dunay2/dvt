import { CheckCircle2, Database, Loader2 } from 'lucide-react';

import type { WarehouseConnection } from '../../ports/workspace';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { sourceImportWizardCopy as copy } from './copy';

interface ConnectionStepProps {
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  isLoadingConnections: boolean;
  loadError: string | null;
  onSelectConnection: (connectionId: string) => void;
}

export function ConnectionStep({
  connections,
  selectedConnection,
  isLoadingConnections,
  loadError,
  onSelectConnection,
}: ConnectionStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg font-medium">{copy.connection.title}</h3>
          <Badge variant="outline">Database</Badge>
        </div>
        <p className="mb-4 text-sm text-slate-300">{copy.connection.description}</p>
      </div>

      {loadError ? (
        <Card className="border-red-700 bg-red-950/30 p-3 text-sm text-red-200">{loadError}</Card>
      ) : null}

      <div className="space-y-2">
        {isLoadingConnections ? (
          <Card className="flex items-center gap-3 border-slate-600 p-4 text-slate-300">
            <Loader2 className="size-4 animate-spin" />
            {copy.connection.loading}
          </Card>
        ) : (
          connections.map((connection) => (
            <Card
              key={connection.id}
              className={`cursor-pointer p-4 transition-all ${
                selectedConnection === connection.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-600 hover:border-gray-600'
              }`}
              onClick={() => onSelectConnection(connection.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="size-5 text-blue-400" />
                  <div>
                    <div className="font-medium">{connection.name}</div>
                    <div className="text-xs text-slate-300">
                      {connection.type} - {connection.database}
                    </div>
                  </div>
                </div>
                {selectedConnection === connection.id ? (
                  <CheckCircle2 className="size-5 text-blue-400" />
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
