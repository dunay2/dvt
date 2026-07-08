import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = import.meta.dirname;
const SOURCE_IMPORT_WIZARD_SOURCE = readFileSync(
  resolve(COMPONENT_ROOT, 'SourceImportWizard.tsx'),
  'utf8'
);
const SOURCE_IMPORT_WIZARD_FRAME_PATH = resolve(
  COMPONENT_ROOT,
  'sourceImportWizard',
  'SourceImportWizardFrame.tsx'
);
const SOURCE_IMPORT_WIZARD_FRAME_SOURCE = existsSync(SOURCE_IMPORT_WIZARD_FRAME_PATH)
  ? readFileSync(SOURCE_IMPORT_WIZARD_FRAME_PATH, 'utf8')
  : '';
const SOURCE_IMPORT_SECTION_TABS_PATH = resolve(
  COMPONENT_ROOT,
  'sourceImportWizard',
  'SourceImportSectionTabs.tsx'
);
const SOURCE_IMPORT_SECTION_TABS_SOURCE = existsSync(SOURCE_IMPORT_SECTION_TABS_PATH)
  ? readFileSync(SOURCE_IMPORT_SECTION_TABS_PATH, 'utf8')
  : '';
const SOURCE_IMPORT_REVIEW_STEP_PATH = resolve(
  COMPONENT_ROOT,
  'sourceImportWizard',
  'ReviewStep.tsx'
);
const SOURCE_IMPORT_REVIEW_STEP_SOURCE = readFileSync(SOURCE_IMPORT_REVIEW_STEP_PATH, 'utf8');
const SOURCE_IMPORT_REVIEW_VIEW_PATH = resolve(
  COMPONENT_ROOT,
  'sourceImportWizard',
  'SourceImportReviewView.tsx'
);
const SOURCE_IMPORT_REVIEW_VIEW_SOURCE = existsSync(SOURCE_IMPORT_REVIEW_VIEW_PATH)
  ? readFileSync(SOURCE_IMPORT_REVIEW_VIEW_PATH, 'utf8')
  : '';
const SOURCE_IMPORT_CONNECTION_FORM_PATH = resolve(
  COMPONENT_ROOT,
  'sourceImportWizard',
  'WarehouseConnectionCreateForm.tsx'
);
const SOURCE_IMPORT_CONNECTION_FORM_SOURCE = readFileSync(
  SOURCE_IMPORT_CONNECTION_FORM_PATH,
  'utf8'
);
const WORKSPACE_PORT_SOURCE = readFileSync(
  resolve(COMPONENT_ROOT, '..', 'ports', 'workspace.ts'),
  'utf8'
);

describe('SourceImportWizard architecture', () => {
  it('drives create-connection provider options from the supported provider catalog', () => {
    expect(WORKSPACE_PORT_SOURCE).toContain('SUPPORTED_WAREHOUSE_CONNECTION_TYPES');
    expect(WORKSPACE_PORT_SOURCE).toContain("['postgres'] as const");
    expect(WORKSPACE_PORT_SOURCE).not.toContain(
      "type: 'snowflake' | 'bigquery' | 'redshift' | 'postgres'"
    );
    expect(SOURCE_IMPORT_CONNECTION_FORM_SOURCE).toContain('SUPPORTED_WAREHOUSE_CONNECTION_TYPES');
    expect(SOURCE_IMPORT_CONNECTION_FORM_SOURCE).not.toContain(
      'const supportedWarehouseConnectionTypes'
    );
  });

  it('keeps the Add Source modal frame in presentation primitives', () => {
    expect(existsSync(SOURCE_IMPORT_WIZARD_FRAME_PATH)).toBe(true);
    expect(SOURCE_IMPORT_WIZARD_SOURCE).toContain(
      "from './sourceImportWizard/SourceImportWizardFrame'"
    );
    expect(SOURCE_IMPORT_WIZARD_SOURCE).toContain('SourceImportWizardFrame');
    expect(SOURCE_IMPORT_WIZARD_SOURCE).not.toContain('DialogContent');
    expect(SOURCE_IMPORT_WIZARD_SOURCE).not.toContain('DialogHeader');
    expect(SOURCE_IMPORT_WIZARD_SOURCE).not.toContain('DialogFooter');
    expect(SOURCE_IMPORT_WIZARD_SOURCE).not.toContain('ScrollArea');
    expect(SOURCE_IMPORT_WIZARD_SOURCE).not.toContain('max-h-[90vh]');
    expect(SOURCE_IMPORT_WIZARD_FRAME_SOURCE).toContain('SourceImportWizardFooter');
    expect(SOURCE_IMPORT_WIZARD_FRAME_SOURCE).toContain('DialogContent');
    expect(SOURCE_IMPORT_WIZARD_FRAME_SOURCE).toContain('ScrollArea');
    expect(SOURCE_IMPORT_WIZARD_FRAME_SOURCE).not.toContain('useSourceImportWizard');
  });

  it('keeps Add Source section tabs inside a presentation template', () => {
    expect(existsSync(SOURCE_IMPORT_SECTION_TABS_PATH)).toBe(true);
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).toContain('function SourceImportSectionTabList');
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).toContain('function SourceImportSectionTab');
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).toContain('sourceImportSectionTabClassNames');
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).toContain('data-slot="source-import-section-tab"');
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).toContain(
      'className={sourceImportSectionTabClassNames.list}'
    );
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).not.toContain('className="mb-4 grid');
    expect(SOURCE_IMPORT_SECTION_TABS_SOURCE).not.toContain('className="border-r');
  });

  it('keeps selected-source review presentation in a dedicated template', () => {
    expect(existsSync(SOURCE_IMPORT_REVIEW_VIEW_PATH)).toBe(true);
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).toContain("from './SourceImportReviewView'");
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).toContain('SourceImportReviewView');
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).not.toContain("from '../ui/card'");
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).not.toContain("from '../ui/scroll-area'");
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).not.toContain("from '../ui/separator'");
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).not.toContain('Destination is configured');
    expect(SOURCE_IMPORT_REVIEW_STEP_SOURCE).not.toContain('Tables Selected');

    expect(SOURCE_IMPORT_REVIEW_VIEW_SOURCE).toContain('sourceImportReviewViewClassNames');
    expect(SOURCE_IMPORT_REVIEW_VIEW_SOURCE).toContain('SourceImportReviewSummaryCard');
    expect(SOURCE_IMPORT_REVIEW_VIEW_SOURCE).toContain('SourceImportAttachmentPreview');
    expect(SOURCE_IMPORT_REVIEW_VIEW_SOURCE).toContain('SourceImportSelectionBasket');
  });
});
