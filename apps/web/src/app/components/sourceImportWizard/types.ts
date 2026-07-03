import type {
  CreateWarehouseConnectionInput,
  ImportSourcesResult,
  TestWarehouseConnectionResult,
  WarehouseConnection,
  WarehouseTable,
} from '../../ports/workspace';
import type { SourceImportOptionContribution } from '../../plugins/registry';

export interface SourceImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (result: ImportSourcesResult) => void;
  sourceImportOptions?: readonly SourceImportOptionContribution[];
  initialSelection?: SourceImportInitialSelection | null;
}

export type SourceImportInitialSelection = Readonly<{
  connectionId: string;
  tables: readonly WarehouseTable[];
}>;

export type WizardStep = 'connection' | 'selection' | 'grouping' | 'options' | 'review' | 'result';

export type SourceImportSection = 'connections' | 'browse' | 'metadata' | 'selected';

export interface TableInfo {
  database: string;
  schema: string;
  table: string;
  rowCount?: number;
  byteSize?: number;
  columns?: WarehouseTable['columns'];
  selected: boolean;
}

export type SourceImportSchemaIdentity = Readonly<{
  database: string;
  schema: string;
}>;

export type SourceImportDatabaseIdentity = Readonly<{
  database: string;
}>;

export interface SourceImportWizardState {
  currentStep: WizardStep;
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  createConnectionFormOpen: boolean;
  createConnectionForm: CreateWarehouseConnectionInput;
  tables: TableInfo[];
  groupingStrategy: 'schema' | 'database' | 'custom';
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  isProcessing: boolean;
  isLoadingConnections: boolean;
  isLoadingTables: boolean;
  isCreatingConnection: boolean;
  isTestingConnection: boolean;
  connectionTestResult: TestWarehouseConnectionResult | null;
  loadError: string | null;
  createConnectionError: string | null;
  importResult: ImportSourcesResult | null;
  activeTableKey: string | null;
  tableSearchQuery: string;
}
