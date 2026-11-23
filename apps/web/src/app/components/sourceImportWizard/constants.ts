import type { SourceImportWizardEntry, WizardStep } from './types';

export const DEFAULT_SOURCE_IMPORT_ENTRY: SourceImportWizardEntry = Object.freeze({
  intent: 'import-sources',
});

export const WIZARD_STEPS: WizardStep[] = [
  'connection',
  'selection',
  'grouping',
  'options',
  'review',
  'result',
];

export const WIZARD_PROGRESS_STEPS: Exclude<WizardStep, 'result'>[] = [
  'connection',
  'selection',
  'grouping',
  'options',
  'review',
];
