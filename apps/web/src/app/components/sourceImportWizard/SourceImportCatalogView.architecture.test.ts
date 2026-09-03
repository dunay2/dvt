import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CATALOG_VIEW_PATH = resolve(import.meta.dirname, 'SourceImportCatalogView.tsx');
const CATALOG_PRIMITIVES_PATH = resolve(import.meta.dirname, 'SourceImportCatalogPrimitives.tsx');
const OBJECTS_METADATA_PATH = resolve(import.meta.dirname, 'SourceImportObjectsMetadata.tsx');
const CATALOG_MODEL_PATH = resolve(import.meta.dirname, 'sourceImportCatalogModel.ts');
const WIZARD_MODEL_PATH = resolve(import.meta.dirname, 'sourceImportWizardModel.ts');
const WIZARD_FRAME_PATH = resolve(import.meta.dirname, 'SourceImportWizardFrame.tsx');

describe('SourceImportCatalogView architecture', () => {
  it('delegates Add Source catalog presentation to component primitives', () => {
    const source = readFileSync(CATALOG_VIEW_PATH, 'utf8');
    const primitives = readFileSync(CATALOG_PRIMITIVES_PATH, 'utf8');
    const objectsMetadata = readFileSync(OBJECTS_METADATA_PATH, 'utf8');

    expect(source).toContain("from './SourceImportCatalogPrimitives'");
    expect(source).not.toContain("from 'lucide-react'");
    expect(source).not.toContain("from '../ui/");
    expect(source).not.toContain('className=');

    expect(primitives).toContain('sourceImportCatalogClassNames');
    expect(primitives).toContain('SourceImportObjectCard');
    expect(primitives).toContain('SourceImportSchemaHeader');
    expect(primitives).not.toContain('SourceImportColumnPreviewList');
    expect(primitives).not.toContain('MetricEvidenceHotspot');
    expect(objectsMetadata).toContain('MetricEvidenceHotspot');
    expect(objectsMetadata).toContain('data-source-import-metadata-column');
  });

  it('keeps the catalog read model separate from wizard flow policy', () => {
    const catalogModel = readFileSync(CATALOG_MODEL_PATH, 'utf8');
    const wizardModel = readFileSync(WIZARD_MODEL_PATH, 'utf8');

    expect(catalogModel).toContain('SourceImportCatalogViewModel');
    expect(catalogModel).toContain('buildSourceImportCatalogViewModel');
    expect(catalogModel).toContain('formatSourceObjectMetricByteSize');
    expect(catalogModel).toContain('sourceObjectMetricEvidencePresentation');
    expect(catalogModel).not.toContain('function formatSourceImportByteSize');

    expect(wizardModel).not.toContain('SourceImportCatalogViewModel');
    expect(wizardModel).not.toContain('buildSourceImportCatalogViewModel');
    expect(wizardModel).not.toContain('formatSourceObjectMetricByteSize');
  });

  it('keeps wizard footer commands in the governed copy catalog', () => {
    const source = readFileSync(WIZARD_FRAME_PATH, 'utf8');

    expect(source).toContain('copy.footer');
    expect(source).not.toContain('>Done<');
    expect(source).not.toContain('>Cancel<');
    expect(source).not.toContain('Attaching...');
    expect(source).not.toContain('Attach sources to canvas');
  });
});
