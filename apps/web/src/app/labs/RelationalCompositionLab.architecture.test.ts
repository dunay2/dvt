import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LAB_COMPONENT_PATH = join(import.meta.dirname, 'RelationalCompositionLab.tsx');
const LAB_DOCUMENT_PATH = join(
  import.meta.dirname,
  '../../../../../docs/planning/proposals/mandatory/frontend-and-ux/relational-composition-lab-20260916.md'
);

describe('RelationalCompositionLab architecture', () => {
  it('does not present an unadmitted relational operation as canonical', () => {
    const source = readFileSync(LAB_COMPONENT_PATH, 'utf8');
    const profile = readFileSync(LAB_DOCUMENT_PATH, 'utf8');

    expect(profile).toContain('Offer only `UNION ALL`');
    expect(source).not.toContain("label: 'LEFT JOIN'");
    expect(source).not.toContain("label: 'WINDOW'");
    expect(source).toContain("label: 'ROW_NUMBER'");
  });

  it('remains a synthetic presentation without Canvas mutation authority', () => {
    const source = readFileSync(LAB_COMPONENT_PATH, 'utf8');

    expect(source).toContain('synthetic presentation only');
    expect(source).not.toContain("from '../views/canvas/");
    expect(source).not.toContain('ConfigureCanvasDvtNode');
  });
});
