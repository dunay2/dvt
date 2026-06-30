import type { WizardStep } from './types';

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
