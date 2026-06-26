import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CATALOG_VIEW_PATH = resolve(import.meta.dirname, 'SourceImportCatalogView.tsx');
const CATALOG_PRIMITIVES_PATH = resolve(import.meta.dirname, 'SourceImportCatalogPrimitives.tsx');

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
});
