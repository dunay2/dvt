import {
  Database,
  Table,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { resolveDataSource } from '../services/config/dataSource';
import {
  createWorkspaceService,
  type ImportSourcesResult,
  type WarehouseConnection,
  type WarehouseTable,
} from '../services/workspace/workspaceService';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface SourceImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (result: ImportSourcesResult) => void;
}

type WizardStep = 'connection' | 'selection' | 'grouping' | 'options' | 'review' | 'result';

interface TableInfo {
  database: string;
  schema: string;
  table: string;
  rowCount?: number;
  columns?: WarehouseTable['columns'];
  selected: boolean;
}

export default function SourceImportWizard({ open, onClose, onComplete }: SourceImportWizardProps) {
  const workspaceService = useMemo(() => createWorkspaceService(resolveDataSource()), []);
  const [currentStep, setCurrentStep] = useState<WizardStep>('connection');
  const [connections, setConnections] = useState<WarehouseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [groupingStrategy, setGroupingStrategy] = useState<'schema' | 'database' | 'custom'>(
    'schema'
  );
  const [includeColumns, setIncludeColumns] = useState(false);
  const [addTests, setAddTests] = useState(false);
  const [addFreshness, setAddFreshness] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportSourcesResult | null>(null);

  const selectedCount = tables.filter((t) => t.selected).length;
  const connection = connections.find((c) => c.id === selectedConnection);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadConnections = async () => {
      setIsLoadingConnections(true);
      setLoadError(null);

      try {
        const loadedConnections = await workspaceService.listWarehouseConnections();
        if (!cancelled) {
          setConnections(loadedConnections);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load warehouse connections.';
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConnections(false);
        }
      }
    };

    void loadConnections();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceService]);

  useEffect(() => {
    if (!open || !selectedConnection) {
      return;
    }

    let cancelled = false;

    const loadTables = async () => {
      setIsLoadingTables(true);
      setLoadError(null);

      try {
        const loadedTables = await workspaceService.listWarehouseTables(selectedConnection);
        if (!cancelled) {
          setTables(
            loadedTables.map((table) => ({
              ...table,
              selected: false,
            }))
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load warehouse tables.';
        if (!cancelled) {
          setLoadError(message);
          setTables([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTables(false);
        }
      }
    };

    void loadTables();

    return () => {
      cancelled = true;
    };
  }, [open, selectedConnection, workspaceService]);

  const handleNext = () => {
    if (currentStep === 'connection' && !selectedConnection) {
      toast.error('Please select a connection');
      return;
    }
    if (currentStep === 'selection' && selectedCount === 0) {
      toast.error('Please select at least one table');
      return;
    }

    const steps: WizardStep[] = [
      'connection',
      'selection',
      'grouping',
      'options',
      'review',
      'result',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep);
      }
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = [
      'connection',
      'selection',
      'grouping',
      'options',
      'review',
      'result',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      if (previousStep) {
        setCurrentStep(previousStep);
      }
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setLoadError(null);

    try {
      if (!selectedConnection) {
        throw new Error('Please select a connection');
      }

      const result = await workspaceService.importSources({
        connectionId: selectedConnection,
        tables: tables
          .filter((table) => table.selected)
          .map((table) => ({
            database: table.database,
            schema: table.schema,
            table: table.table,
            rowCount: table.rowCount,
            columns: table.columns,
          })),
        groupingStrategy,
        includeColumns,
        addTests,
        addFreshness,
      });

      setImportResult(result);
      setCurrentStep('result');
      toast.success('Sources imported successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import sources.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    if (importResult) {
      onComplete?.(importResult);
    }
    onClose();
    // Reset wizard
    setCurrentStep('connection');
    setConnections([]);
    setSelectedConnection(null);
    setTables([]);
    setLoadError(null);
    setImportResult(null);
  };

  const toggleTable = (index: number) => {
    setTables((prev) => prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t)));
  };

  const toggleSchema = (schema: string) => {
    const schemaTables = tables.filter((t) => t.schema === schema);
    const allSelected = schemaTables.every((t) => t.selected);
    setTables((prev) =>
      prev.map((t) => (t.schema === schema ? { ...t, selected: !allSelected } : t))
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'connection':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Select Connection</h3>
              <p className="text-sm text-slate-300 mb-4">
                Choose a warehouse connection to import sources from
              </p>
            </div>

            {loadError && (
              <Card className="p-3 border-red-700 bg-red-950/30 text-sm text-red-200">
                {loadError}
              </Card>
            )}

            <div className="space-y-2">
              {isLoadingConnections ? (
                <Card className="p-4 border-slate-600 flex items-center gap-3 text-slate-300">
                  <Loader2 className="size-4 animate-spin" />
                  Loading connections...
                </Card>
              ) : (
                connections.map((conn) => (
                  <Card
                    key={conn.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedConnection === conn.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-slate-600 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedConnection(conn.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="size-5 text-blue-400" />
                        <div>
                          <div className="font-medium">{conn.name}</div>
                          <div className="text-xs text-slate-300">
                            {conn.type} - {conn.database}
                          </div>
                        </div>
                      </div>
                      {selectedConnection === conn.id && (
                        <CheckCircle2 className="size-5 text-blue-400" />
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'selection':
        const schemaGroups = tables.reduce(
          (acc, table) => {
            if (!acc[table.schema]) {
              acc[table.schema] = [];
            }
            const bucket = acc[table.schema];
            if (bucket) {
              bucket.push(table);
            }
            return acc;
          },
          {} as Record<string, TableInfo[]>
        );

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Select Tables</h3>
              <p className="text-sm text-slate-300 mb-4">
                Choose tables to import as sources. Selected: {selectedCount}
              </p>
            </div>

            {loadError && (
              <Card className="p-3 border-red-700 bg-red-950/30 text-sm text-red-200">
                {loadError}
              </Card>
            )}

            {isLoadingTables ? (
              <Card className="p-4 border-slate-600 flex items-center gap-3 text-slate-300">
                <Loader2 className="size-4 animate-spin" />
                Loading tables...
              </Card>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(schemaGroups).length === 0 ? (
                    <Card className="p-4 border-slate-600 text-sm text-slate-300">
                      No tables available for this connection.
                    </Card>
                  ) : (
                    Object.entries(schemaGroups).map(([schema, schemaTables]) => (
                      <div key={schema}>
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={schemaTables.every((t) => t.selected)}
                            onCheckedChange={() => toggleSchema(schema)}
                          />
                          <h4 className="font-medium text-sm">{schema}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {schemaTables.length}
                          </Badge>
                        </div>

                        <div className="ml-6 space-y-1">
                          {schemaTables.map((table, idx) => {
                            const globalIndex = tables.findIndex(
                              (t) =>
                                t.database === table.database &&
                                t.schema === table.schema &&
                                t.table === table.table
                            );
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded hover:bg-slate-950 cursor-pointer"
                                onClick={() => toggleTable(globalIndex)}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={table.selected}
                                    onCheckedChange={() => toggleTable(globalIndex)}
                                  />
                                  <Table className="size-4 text-slate-300" />
                                  <span className="text-sm font-mono">{table.table}</span>
                                </div>
                                {table.rowCount && (
                                  <span className="text-xs text-slate-400">
                                    {table.rowCount.toLocaleString()} rows
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'grouping':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Grouping Strategy</h3>
              <p className="text-sm text-slate-300 mb-4">
                Choose how to group tables into dbt source definitions
              </p>
            </div>

            <RadioGroup value={groupingStrategy} onValueChange={(v: any) => setGroupingStrategy(v)}>
              <Card className="p-4 border-slate-600">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="schema" id="schema" />
                  <div className="flex-1">
                    <Label htmlFor="schema" className="font-medium cursor-pointer">
                      Group by Schema (Recommended)
                    </Label>
                    <p className="text-xs text-slate-300 mt-1">
                      Creates one source per schema. Example: RAW.ERP.ORDERS -&gt; source(erp)
                    </p>
                    <div className="mt-2 text-xs">
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Enterprise-friendly
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-slate-600">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="database" id="database" />
                  <div className="flex-1">
                    <Label htmlFor="database" className="font-medium cursor-pointer">
                      Group by Database
                    </Label>
                    <p className="text-xs text-slate-300 mt-1">
                      Creates one source per database. Best for small projects.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-slate-600">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="custom" id="custom" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="font-medium cursor-pointer">
                      Custom Grouping
                    </Label>
                    <p className="text-xs text-slate-300 mt-1">
                      Manually organize sources (advanced)
                    </p>
                  </div>
                </div>
              </Card>
            </RadioGroup>
          </div>
        );

      case 'options':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Metadata Options</h3>
              <p className="text-sm text-slate-300 mb-4">
                Configure what metadata to include in source definitions
              </p>
            </div>

            <Card className="p-4 border-slate-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Include Column Metadata</h4>
                  <p className="text-xs text-slate-300">
                    Add column names and data types to YAML (stored under meta.warehouse_data_type)
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    Default: OFF (Minimal YAML)
                  </Badge>
                </div>
                <Checkbox
                  checked={includeColumns}
                  onCheckedChange={(v: boolean) => setIncludeColumns(v)}
                />
              </div>
            </Card>

            <Card className="p-4 border-slate-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Add Generic Tests</h4>
                  <p className="text-xs text-slate-300">
                    Automatically add not_null and unique tests for detected primary keys
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    Default: OFF
                  </Badge>
                </div>
                <Checkbox checked={addTests} onCheckedChange={(v: boolean) => setAddTests(v)} />
              </div>
            </Card>

            <Card className="p-4 border-slate-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Add Freshness Checks</h4>
                  <p className="text-xs text-slate-300">
                    Add default freshness thresholds (warn_after: 24h, error_after: 48h)
                  </p>
                  <Badge variant="secondary" className="text-xs mt-2">
                    Default: OFF
                  </Badge>
                </div>
                <Checkbox
                  checked={addFreshness}
                  onCheckedChange={(v: boolean) => setAddFreshness(v)}
                />
              </div>
            </Card>
          </div>
        );

      case 'review':
        const selectedTables = tables.filter((t) => t.selected);
        const previewSchemaGroups = new Map<string, TableInfo[]>();

        selectedTables.forEach((table) => {
          const key = groupingStrategy === 'schema' ? table.schema : table.database;
          if (!previewSchemaGroups.has(key)) {
            previewSchemaGroups.set(key, []);
          }
          previewSchemaGroups.get(key)!.push(table);
        });

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Review & Confirm</h3>
              <p className="text-sm text-slate-300 mb-4">
                Review your import configuration before proceeding
              </p>
            </div>

            <Card className="p-4 border-slate-600">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Connection:</span>
                  <span className="font-medium">{connection?.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-300">Tables Selected:</span>
                  <span className="font-medium">{selectedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Sources to Create:</span>
                  <span className="font-medium">{previewSchemaGroups.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Grouping Strategy:</span>
                  <Badge variant="outline">{groupingStrategy}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-300">Include Columns:</span>
                  <Badge variant={includeColumns ? 'default' : 'secondary'}>
                    {includeColumns ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Add Tests:</span>
                  <Badge variant={addTests ? 'default' : 'secondary'}>
                    {addTests ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Add Freshness:</span>
                  <Badge variant={addFreshness ? 'default' : 'secondary'}>
                    {addFreshness ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-600">
              <h4 className="font-medium text-sm mb-3">Sources Preview</h4>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {Array.from(previewSchemaGroups.entries()).map(([key, groupTables]) => (
                    <div key={key} className="border border-slate-600 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm text-blue-400">source: {key.toLowerCase()}</code>
                        <Badge variant="secondary" className="text-xs">
                          {groupTables.length} tables
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        {groupTables.slice(0, 3).map((t, i) => (
                          <div key={i}>-&gt; {t.table}</div>
                        ))}
                        {groupTables.length > 3 && <div>... and {groupTables.length - 3} more</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        );

      case 'result':
        if (!importResult) return null;

        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-green-500" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
              <p className="text-sm text-slate-300">
                Your sources have been successfully imported and are ready to use
              </p>
            </div>

            <Card className="p-4 border-slate-600 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Sources Created:</span>
                  <span className="font-medium text-green-400">{importResult.sourcesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tables Imported:</span>
                  <span className="font-medium text-green-400">{importResult.tablesImported}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-600 text-left">
              <h4 className="font-medium text-sm mb-2">YAML Files Created</h4>
              <ScrollArea className="h-24">
                <div className="space-y-1 text-xs font-mono">
                  {importResult.yamlFiles.map((file: string, i: number) => (
                    <div key={i} className="text-slate-300">
                      [file] {file}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <div className="text-xs text-slate-400 bg-blue-900/20 border border-blue-800 rounded p-3">
              <AlertCircle className="size-4 inline-block mr-2" />
              The workspace graph has been refreshed locally. Persisted backend import requires a
              dedicated API endpoint in `api` mode.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (currentStep === 'connection') return !!selectedConnection;
    if (currentStep === 'selection') return selectedCount > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Sources from Warehouse</DialogTitle>
          <DialogDescription>
            Import warehouse tables as dbt source nodes and refresh the current workspace graph
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        {currentStep !== 'result' && (
          <div className="flex items-center justify-between mb-4">
            {['connection', 'selection', 'grouping', 'options', 'review'].map((step, idx) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center size-8 rounded-full text-xs font-medium ${
                    currentStep === step
                      ? 'bg-blue-500 text-white'
                      : ['connection', 'selection', 'grouping', 'options', 'review'].indexOf(
                            currentStep
                          ) >
                          ['connection', 'selection', 'grouping', 'options', 'review'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-slate-300'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 4 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      ['connection', 'selection', 'grouping', 'options', 'review'].indexOf(
                        currentStep
                      ) > idx
                        ? 'bg-green-500'
                        : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1 -mx-6 px-6">{renderStepContent()}</ScrollArea>

        {/* Footer */}
        <DialogFooter className="mt-4">
          {currentStep === 'result' ? (
            <Button onClick={handleComplete} className="w-full">
              Done
            </Button>
          ) : (
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'connection'}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>

              {currentStep === 'review' ? (
                <Button
                  onClick={() => void handleImport()}
                  disabled={isProcessing || !canProceed()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 mr-2" />
                      Import Sources
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
