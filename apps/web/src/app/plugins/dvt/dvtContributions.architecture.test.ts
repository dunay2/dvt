import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DVT_CONTRIBUTIONS_SOURCE = readFileSync('src/app/plugins/dvt/dvtContributions.ts', 'utf8');

describe('dvtContributions architecture', () => {
  it('does not depend on DBT renderer or DBT node catalog modules', () => {
    expect(DVT_CONTRIBUTIONS_SOURCE).not.toContain('../dbt/');
    expect(DVT_CONTRIBUTIONS_SOURCE).not.toContain('../nodeTypeCatalog.dbt');
  });
});
