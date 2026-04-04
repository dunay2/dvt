import { Blocks, Database, FileJson, RadioTower, type LucideIcon } from 'lucide-react';

import type { DataObjectSourceType, WizardStep } from './types';

export const WIZARD_STEPS: WizardStep[] = [
  'sourceType',
  'connection',
  'selection',
  'grouping',
  'options',
  'review',
  'result',
];

export const WIZARD_PROGRESS_STEPS: Exclude<WizardStep, 'result'>[] = [
  'sourceType',
  'connection',
  'selection',
  'grouping',
  'options',
  'review',
];

export interface SourceTypeOption {
  id: DataObjectSourceType;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
}

export const SOURCE_TYPE_OPTIONS: SourceTypeOption[] = [
  {
    id: 'database',
    label: 'Database',
    description: 'Schemas and tables from a relational or warehouse source',
    icon: Database,
    available: true,
  },
  {
    id: 'file',
    label: 'File',
    description: 'CSV, Excel, JSON or parquet-backed data objects',
    icon: FileJson,
    available: false,
  },
  {
    id: 'api',
    label: 'API',
    description: 'Service endpoints and schema-driven data objects',
    icon: Blocks,
    available: false,
  },
  {
    id: 'stream',
    label: 'Stream',
    description: 'Event or message stream descriptors',
    icon: RadioTower,
    available: false,
  },
];
