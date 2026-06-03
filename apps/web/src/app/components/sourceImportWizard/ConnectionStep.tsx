import { CheckCircle2, Database, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

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

function filterConnections(
  connections: readonly WarehouseConnection[],
  searchValue: string
): readonly WarehouseConnection[] {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) {
    return connections;
  }

  return connections.filter((connection) =>
    [
      connection.id,
      connection.name,
      connection.type,
      connection.database,
      'database source registry governed catalog connection warehouse',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  );
}

function formatConnectionCatalogSummary(connectionCount: number): string {
  return `${connectionCount} ${
    connectionCount === 1 ? 'connection' : 'connections'
  } in governed catalog`;
}

export function ConnectionStep({
  connections,
  selectedConnection,
  isLoadingConnections,
  loadError,
  onSelectConnection,
}: ConnectionStepProps) {
  const [searchValue, setSearchValue] = useState('');
  const visibleConnections = useMemo(
    () => filterConnections(connections, searchValue),
    [connections, searchValue]
  );

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
          <>
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-300">
                <span>{formatConnectionCatalogSummary(connections.length)}</span>
                <span>{copy.connection.catalogSource}</span>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  data-slot="source-import-connection-search"
                  value={searchValue}
                  aria-label={copy.connection.searchLabel}
                  placeholder={copy.connection.searchLabel}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  onInput={(event) => setSearchValue(event.currentTarget.value)}
                  onChange={(event) => setSearchValue(event.currentTarget.value)}
                />
              </label>
            </div>

            {connections.length === 0 ? (
              <Card className="border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                <div className="font-medium text-slate-100">{copy.connection.empty}</div>
                <div className="mt-1">{copy.connection.emptyHint}</div>
              </Card>
            ) : visibleConnections.length === 0 ? (
              <Card className="border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                {copy.connection.noMatches}
              </Card>
            ) : (
              visibleConnections.map((connection) => (
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
                    <div className="flex min-w-0 items-center gap-3">
                      <Database className="size-5 shrink-0 text-blue-400" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{connection.name}</div>
                        <div className="text-xs text-slate-300">
                          {connection.type} - {connection.database}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-500">
                          {connection.id}
                        </div>
                      </div>
                    </div>
                    {selectedConnection === connection.id ? (
                      <CheckCircle2 className="size-5 shrink-0 text-blue-400" />
                    ) : null}
                  </div>
                </Card>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
