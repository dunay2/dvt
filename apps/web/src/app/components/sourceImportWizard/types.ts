import type {
  ImportSourcesResult,
  WarehouseConnection,
  WarehouseTable,
} from '../../ports/workspace';

export interface SourceImportWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (result: ImportSourcesResult) => void;
}

export type WizardStep =
  | 'sourceType'
  | 'connection'
  | 'selection'
  | 'grouping'
  | 'options'
  | 'review'
  | 'result';

export type DataObjectSourceType = 'database' | 'file' | 'api' | 'stream';

export interface TableInfo {
  database: string;
  schema: string;
  table: string;
  rowCount?: number;
  columns?: WarehouseTable['columns'];
  selected: boolean;
}

export interface SourceImportWizardState {
  currentStep: WizardStep;
  selectedSourceType: DataObjectSourceType;
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  tables: TableInfo[];
  groupingStrategy: 'schema' | 'database' | 'custom';
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  isProcessing: boolean;
  isLoadingConnections: boolean;
  isLoadingTables: boolean;
  loadError: string | null;
  importResult: ImportSourcesResult | null;
}
