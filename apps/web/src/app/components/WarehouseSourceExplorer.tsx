/** Owned concern: render warehouse source discovery inside the Canvas explorer rail. */
import { CheckCircle2, Database, Loader2, Plus, Search, Table, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { graphVisualClasses } from '../plugins/graph/graphVisualTokens';
import type {
  CreateWarehouseConnectionInput,
  IWarehouseSourceImportPort,
  WarehouseConnection,
  WarehouseTable,
} from '../ports/workspace';
import type { SourceImportInitialSelection } from './sourceImportWizard/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ConnectionActionState = 'idle' | 'creating' | 'testing';

type WarehouseSourceExplorerProps = Readonly<{
  canEditGraph: boolean;
  warehouseSourceImport: IWarehouseSourceImportPort;
  onOpenDataRegistry?: (selection?: SourceImportInitialSelection) => void;
}>;

function buildTableKey(table: Pick<WarehouseTable, 'database' | 'schema' | 'table'>): string {
  return [table.database, table.schema, table.table].join('.');
}

function formatTableName(table: Pick<WarehouseTable, 'database' | 'schema' | 'table'>): string {
  return `${table.database}.${table.schema}.${table.table}`;
}

function formatRowCount(rowCount: number | undefined): string {
  if (rowCount == null) {
    return 'Rows unknown';
  }

  return `${rowCount.toLocaleString()} rows`;
}

function filterTables(
  tables: readonly WarehouseTable[],
  searchValue: string
): readonly WarehouseTable[] {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) {
    return tables;
  }

  return tables.filter((table) =>
    [
      table.database,
      table.schema,
      table.table,
      ...(table.columns?.map((column) => `${column.name} ${column.type}`) ?? []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  );
}

function resolveSelectedTables(
  tables: readonly WarehouseTable[],
  selectedTableKeys: ReadonlySet<string>
): WarehouseTable[] {
  return tables.filter((table) => selectedTableKeys.has(buildTableKey(table)));
}

const initialConnectionDraft: CreateWarehouseConnectionInput = {
  name: '',
  type: 'postgres',
  database: '',
  credentialRef: '',
};

export default function WarehouseSourceExplorer({
  canEditGraph,
  warehouseSourceImport,
  onOpenDataRegistry,
}: WarehouseSourceExplorerProps): JSX.Element {
  const [connectionState, setConnectionState] = useState<LoadState>('idle');
  const [tableState, setTableState] = useState<LoadState>('idle');
  const [connections, setConnections] = useState<WarehouseConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [tables, setTables] = useState<WarehouseTable[]>([]);
  const [selectedTableKeys, setSelectedTableKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [searchValue, setSearchValue] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectionDraft, setConnectionDraft] =
    useState<CreateWarehouseConnectionInput>(initialConnectionDraft);
  const [connectionFormVisible, setConnectionFormVisible] = useState(false);
  const [connectionActionState, setConnectionActionState] = useState<ConnectionActionState>('idle');
  const [connectionFeedback, setConnectionFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadConnections = async () => {
      setConnectionState('loading');
      setLoadError(null);
      try {
        const nextConnections = await warehouseSourceImport.listWarehouseConnections();
        if (cancelled) {
          return;
        }
        setConnections([...nextConnections]);
        setActiveConnectionId((current) => current ?? nextConnections[0]?.id ?? null);
        setConnectionState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to load warehouse sources.');
        setConnectionState('error');
      }
    };

    void loadConnections();

    return () => {
      cancelled = true;
    };
  }, [warehouseSourceImport]);

  useEffect(() => {
    if (activeConnectionId == null) {
      setTables([]);
      setSelectedTableKeys(new Set());
      return;
    }

    let cancelled = false;
    const loadTables = async () => {
      setTableState('loading');
      setLoadError(null);
      setSelectedTableKeys(new Set());
      try {
        const nextTables = await warehouseSourceImport.listWarehouseTables(activeConnectionId);
        if (cancelled) {
          return;
        }
        setTables([...nextTables]);
        setTableState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTables([]);
        setLoadError(error instanceof Error ? error.message : 'Failed to load warehouse tables.');
        setTableState('error');
      }
    };

    void loadTables();

    return () => {
      cancelled = true;
    };
  }, [activeConnectionId, warehouseSourceImport]);

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
    [activeConnectionId, connections]
  );
  const visibleTables = useMemo(() => filterTables(tables, searchValue), [searchValue, tables]);
  const selectedTables = useMemo(
    () => resolveSelectedTables(tables, selectedTableKeys),
    [selectedTableKeys, tables]
  );
  const canRegisterSelection =
    canEditGraph && activeConnectionId != null && selectedTables.length > 0 && onOpenDataRegistry;
  const canCreateConnection =
    canEditGraph &&
    connectionActionState === 'idle' &&
    connectionDraft.name.trim().length > 0 &&
    connectionDraft.database.trim().length > 0 &&
    connectionDraft.credentialRef.trim().length > 0;
  const canTestConnection =
    canEditGraph && connectionActionState === 'idle' && activeConnectionId != null;

  const setConnectionDraftValue = (field: keyof CreateWarehouseConnectionInput, value: string) => {
    setConnectionDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleTableSelection = (table: WarehouseTable) => {
    const tableKey = buildTableKey(table);
    setSelectedTableKeys((current) => {
      const next = new Set(current);
      if (next.has(tableKey)) {
        next.delete(tableKey);
      } else {
        next.add(tableKey);
      }
      return next;
    });
  };

  const registerSelectedTables = () => {
    if (!canRegisterSelection || activeConnectionId == null) {
      return;
    }
    onOpenDataRegistry?.({
      connectionId: activeConnectionId,
      tables: selectedTables,
    });
  };

  const createConnection = async () => {
    if (!canCreateConnection) {
      return;
    }
    setConnectionActionState('creating');
    setLoadError(null);
    setConnectionFeedback(null);
    try {
      const createdConnection = await warehouseSourceImport.createWarehouseConnection({
        name: connectionDraft.name.trim(),
        type: connectionDraft.type,
        database: connectionDraft.database.trim(),
        credentialRef: connectionDraft.credentialRef.trim(),
      });
      setConnections((current) => [
        ...current.filter((connection) => connection.id !== createdConnection.id),
        createdConnection,
      ]);
      setActiveConnectionId(createdConnection.id);
      setConnectionDraft(initialConnectionDraft);
      setConnectionFormVisible(false);
      setConnectionState('ready');
      setConnectionFeedback('Connection created');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to create connection.');
    } finally {
      setConnectionActionState('idle');
    }
  };

  const testConnection = async () => {
    if (!canTestConnection || activeConnectionId == null) {
      return;
    }
    setConnectionActionState('testing');
    setLoadError(null);
    setConnectionFeedback(null);
    try {
      const result = await warehouseSourceImport.testWarehouseConnection(activeConnectionId);
      if (result.status === 'passed') {
        setConnectionFeedback(`Connection test passed - ${result.tableCount} tables visible`);
      } else {
        setLoadError(result.message);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to test connection.');
    } finally {
      setConnectionActionState('idle');
    }
  };

  return (
    <section className={graphVisualClasses.contextPanelSection}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={graphVisualClasses.contextPanelSectionTitle}>Warehouse sources</h3>
          <p className={graphVisualClasses.contextPanelHelpText}>
            Browse governed source objects before registering them into the canvas graph.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          DB-first
        </Badge>
      </div>

      {loadError != null ? (
        <div className="mb-3 rounded border border-red-700 bg-red-950/30 p-2 text-xs text-red-200">
          {loadError}
        </div>
      ) : null}
      {connectionFeedback != null ? (
        <div className="mb-3 rounded border border-emerald-700 bg-emerald-950/30 p-2 text-xs text-emerald-200">
          {connectionFeedback}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Connection</span>
            <span>{connections.length} available</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-8 flex-1 gap-1.5', graphVisualClasses.contextPanelActionButton)}
              disabled={!canEditGraph}
              onClick={() => setConnectionFormVisible((current) => !current)}
            >
              <Plus className="size-3.5" />
              New connection
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-8 flex-1 gap-1.5', graphVisualClasses.contextPanelActionButton)}
              disabled={!canTestConnection}
              onClick={() => void testConnection()}
            >
              {connectionActionState === 'testing' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              Test connection
            </Button>
          </div>
          {connectionFormVisible ? (
            <div className="space-y-2 rounded border border-slate-700 bg-slate-950/40 p-2">
              <label className="block space-y-1 text-[11px] text-slate-400">
                <span>Connection name</span>
                <input
                  aria-label="Connection name"
                  value={connectionDraft.name}
                  className="h-8 w-full min-w-0 rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
                  placeholder="Analytics Postgres"
                  onInput={(event) => setConnectionDraftValue('name', event.currentTarget.value)}
                  onChange={(event) => setConnectionDraftValue('name', event.currentTarget.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1 text-[11px] text-slate-400">
                  <span>Adapter</span>
                  <select
                    aria-label="Connection adapter"
                    value={connectionDraft.type}
                    className="h-8 w-full rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                    onChange={(event) => setConnectionDraftValue('type', event.currentTarget.value)}
                  >
                    <option value="postgres">PostgreSQL</option>
                  </select>
                </label>
                <label className="block space-y-1 text-[11px] text-slate-400">
                  <span>Database</span>
                  <input
                    aria-label="Database name"
                    value={connectionDraft.database}
                    className="h-8 w-full min-w-0 rounded border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
                    placeholder="analytics"
                    onInput={(event) =>
                      setConnectionDraftValue('database', event.currentTarget.value)
                    }
                    onChange={(event) =>
                      setConnectionDraftValue('database', event.currentTarget.value)
                    }
                  />
                </label>
              </div>
              <label className="block space-y-1 text-[11px] text-slate-400">
                <span>Credential reference</span>
                <input
                  aria-label="Credential reference"
                  value={connectionDraft.credentialRef}
                  className="h-8 w-full min-w-0 rounded border border-slate-700 bg-slate-950 px-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
                  placeholder="env:ANALYTICS_DATABASE_URL"
                  onInput={(event) =>
                    setConnectionDraftValue('credentialRef', event.currentTarget.value)
                  }
                  onChange={(event) =>
                    setConnectionDraftValue('credentialRef', event.currentTarget.value)
                  }
                />
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('h-8 w-full gap-1.5', graphVisualClasses.contextPanelActionButton)}
                disabled={!canCreateConnection}
                onClick={() => void createConnection()}
              >
                {connectionActionState === 'creating' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Create connection
              </Button>
            </div>
          ) : null}
          {connectionState === 'loading' ? (
            <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
              <Loader2 className="size-3.5 animate-spin" />
              Loading governed connections
            </div>
          ) : connections.length === 0 ? (
            <div className="rounded border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
              No warehouse connections are available.
            </div>
          ) : (
            <div className="grid gap-1">
              {connections.map((connection) => (
                <button
                  key={connection.id}
                  type="button"
                  className={cn(
                    'flex min-w-0 items-center gap-2 rounded border px-2 py-2 text-left text-xs transition-colors',
                    connection.id === activeConnectionId
                      ? 'border-blue-500 bg-blue-950/30 text-slate-50'
                      : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-950'
                  )}
                  onClick={() => setActiveConnectionId(connection.id)}
                >
                  <Database className="size-3.5 shrink-0 text-blue-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{connection.name}</span>
                    <span className="block truncate text-[10px] text-slate-400">
                      {connection.type} - {connection.database}
                    </span>
                  </span>
                  {connection.id === activeConnectionId ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-blue-300" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950/50 px-2 py-2">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            aria-label="Search warehouse source objects"
            value={searchValue}
            placeholder="Search schema, table, or column"
            className="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
            onInput={(event) => setSearchValue(event.currentTarget.value)}
            onChange={(event) => setSearchValue(event.currentTarget.value)}
          />
        </label>

        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>{activeConnection?.name ?? 'No connection selected'}</span>
          <span>{selectedTables.length} selected</span>
        </div>

        {tableState === 'loading' ? (
          <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950/40 px-3 py-3 text-xs text-slate-300">
            <Loader2 className="size-3.5 animate-spin" />
            Loading warehouse tables
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-1 pr-2">
              {visibleTables.length === 0 ? (
                <div className="rounded border border-slate-700 bg-slate-950/40 px-3 py-3 text-xs text-slate-300">
                  No source objects match the current selection.
                </div>
              ) : (
                visibleTables.map((table) => {
                  const tableKey = buildTableKey(table);
                  const isSelected = selectedTableKeys.has(tableKey);
                  return (
                    <button
                      key={tableKey}
                      type="button"
                      data-source-table={tableKey}
                      className={cn(
                        'flex w-full min-w-0 items-start gap-2 rounded px-2 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-slate-800 text-slate-50 ring-1 ring-blue-500'
                          : 'text-slate-300 hover:bg-slate-950'
                      )}
                      onClick={() => toggleTableSelection(table)}
                    >
                      <Table className="mt-0.5 size-3.5 shrink-0 text-blue-300" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11px]">{table.table}</span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {formatTableName(table)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                          <span>{formatRowCount(table.rowCount)}</span>
                          <span>{table.columns?.length ?? 0} columns</span>
                        </span>
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-blue-300" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-full gap-1.5', graphVisualClasses.contextPanelActionButton)}
          disabled={!canRegisterSelection}
          onClick={registerSelectedTables}
        >
          Register selected
        </Button>
      </div>
    </section>
  );
}
