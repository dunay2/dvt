import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CATALOG_VIEW_PATH = resolve(import.meta.dirname, 'SourceImportCatalogView.tsx');
const CATALOG_PRIMITIVES_PATH = resolve(import.meta.dirname, 'SourceImportCatalogPrimitives.tsx');
const CATALOG_MODEL_PATH = resolve(import.meta.dirname, 'sourceImportCatalogModel.ts');
const WIZARD_MODEL_PATH = resolve(import.meta.dirname, 'sourceImportWizardModel.ts');

describe('SourceImportCatalogView architecture', () => {
  it('delegates Add Source catalog presentation to component primitives', () => {
    const source = readFileSync(CATALOG_VIEW_PATH, 'utf8');
    const primitives = readFileSync(CATALOG_PRIMITIVES_PATH, 'utf8');

    expect(source).toContain("from './SourceImportCatalogPrimitives'");
    expect(source).not.toContain("from 'lucide-react'");
    expect(source).not.toContain("from '../ui/");
    expect(source).not.toContain('className=');

    expect(primitives).toContain('sourceImportCatalogClassNames');
    expect(primitives).toContain('SourceImportTableCard');
    expect(primitives).toContain('SourceImportSchemaHeader');
    expect(primitives).toContain('SourceImportColumnPreviewList');
  });

  it('keeps the catalog read model separate from wizard flow policy', () => {
    const catalogModel = readFileSync(CATALOG_MODEL_PATH, 'utf8');
    const wizardModel = readFileSync(WIZARD_MODEL_PATH, 'utf8');

    expect(catalogModel).toContain('SourceImportCatalogViewModel');
    expect(catalogModel).toContain('buildSourceImportCatalogViewModel');
    expect(catalogModel).toContain('formatSourceImportByteSize');

    expect(wizardModel).not.toContain('SourceImportCatalogViewModel');
    expect(wizardModel).not.toContain('buildSourceImportCatalogViewModel');
    expect(wizardModel).not.toContain('formatSourceImportByteSize');
  });
});
