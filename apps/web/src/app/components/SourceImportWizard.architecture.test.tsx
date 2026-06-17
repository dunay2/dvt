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

describe('SourceImportWizard architecture', () => {
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
});
