import { describe, expect, test } from 'vitest';

import { sqlCreatePlanRecordsTable } from '../src/PostgresPlanStore.sql.js';

describe('PostgresPlanStore.sql lineage constraints', () => {
  test('plan_records DDL includes self-referencing lineage FKs', () => {
    const ddl = sqlCreatePlanRecordsTable('dvt');

    expect(ddl).toContain('derived_from_plan_id TEXT REFERENCES');
    expect(ddl).toContain('supersedes_plan_id TEXT REFERENCES');
    expect(ddl).toContain('.plan_records(plan_id)');
  });
});
