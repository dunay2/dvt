import { describe, expect, test } from 'vitest';

import { sqlCreatePlanRecordsTable } from '../src/PostgresPlanStore.sql.js';

describe('PostgresPlanStore.sql lineage constraints', () => {
  test('plan_records DDL includes self-referencing lineage FKs', () => {
    const ddl = sqlCreatePlanRecordsTable('dvt');

    expect(ddl).toContain('tenant_id TEXT NOT NULL');
    expect(ddl).toContain('PRIMARY KEY (tenant_id, project_id, environment_id, plan_id)');
    expect(ddl).toContain('derived_from_plan_id TEXT');
    expect(ddl).toContain('supersedes_plan_id TEXT');
    expect(ddl).toContain('.plan_records(tenant_id, project_id, environment_id, plan_id)');
  });
});
