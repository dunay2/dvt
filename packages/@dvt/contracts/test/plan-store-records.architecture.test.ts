/**
 * Owned concern: guard semantic architecture rules for scoped plan-store
 * records, ports, documentation, and Postgres ownership boundaries.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const CONTRACTS_SRC_ROOT = join(import.meta.dirname, '../src');
const ARTIFACTS_SRC_ROOT = join(REPO_ROOT, 'packages/@dvt/artifacts/src');
const ADAPTER_POSTGRES_SRC_ROOT = join(REPO_ROOT, 'packages/@dvt/adapter-postgres/src');

const PLAN_RECORD_SOURCE = join(CONTRACTS_SRC_ROOT, 'contracts/planner/PlanRecord.v1.ts');
const PLAN_EXECUTABILITY_SOURCE = join(
  CONTRACTS_SRC_ROOT,
  'contracts/planner/PlanExecutabilityRecord.v1.ts'
);
const PLAN_ADMISSION_SOURCE = join(CONTRACTS_SRC_ROOT, 'contracts/planner/PlanAdmissionLink.v1.ts');
const PLAN_RECORD_SCHEMA_PACK = join(CONTRACTS_SRC_ROOT, 'schema-packs/plan-records.ts');
const PLAN_STORE_READER_PORT = join(ARTIFACTS_SRC_ROOT, 'ports/IPlanStoreReader.ts');
const PLAN_STORE_WRITER_PORT = join(ARTIFACTS_SRC_ROOT, 'ports/IPlanStoreWriter.ts');
const STORED_PLAN_ARTIFACT_PORT = join(ARTIFACTS_SRC_ROOT, 'ports/IStoredPlanArtifactStore.ts');
const POSTGRES_PLAN_STORE_SOURCE = join(ADAPTER_POSTGRES_SRC_ROOT, 'PostgresPlanStore.ts');
const POSTGRES_PLAN_STORE_SQL = join(ADAPTER_POSTGRES_SRC_ROOT, 'PostgresPlanStore.sql.ts');
const POSTGRES_PLAN_STORE_MAPPERS = join(ADAPTER_POSTGRES_SRC_ROOT, 'PostgresPlanStore.mappers.ts');
const POSTGRES_PLAN_STORE_SCHEMA_MANAGER = join(
  ADAPTER_POSTGRES_SRC_ROOT,
  'PostgresPlanStore.schema-manager.ts'
);
const POSTGRES_PLAN_RECORD_REPOSITORY = join(
  ADAPTER_POSTGRES_SRC_ROOT,
  'PostgresPlanStore.plan-record-repository.ts'
);
const POSTGRES_PLAN_EXECUTABILITY_REPOSITORY = join(
  ADAPTER_POSTGRES_SRC_ROOT,
  'PostgresPlanStore.executability-repository.ts'
);
const POSTGRES_PLAN_ADMISSION_REPOSITORY = join(
  ADAPTER_POSTGRES_SRC_ROOT,
  'PostgresPlanStore.admission-repository.ts'
);
const POSTGRES_PLAN_EXECUTABLE_BLOB_REPOSITORY = join(
  ADAPTER_POSTGRES_SRC_ROOT,
  'PostgresPlanStore.executable-blob-repository.ts'
);
const ENGINE_PLAN_ARTIFACT_READER = join(
  REPO_ROOT,
  'packages/@dvt/engine/src/ports/IPlanArtifactReader.ts'
);
const PLANNER_LIFECYCLE_PORT = join(
  REPO_ROOT,
  'packages/@dvt/planner/src/contracts/PlanValidationLifecycle.ts'
);
const API_STORED_PLAN_PORT = join(REPO_ROOT, 'apps/api/src/application/ports/storedPlan.ts');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-store-records-component.md'
);
const USER_STORIES_DOC = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-store-records-user-stories.md'
);
const MAILBOX_REVIEW = join(
  REPO_ROOT,
  'buzon/20260509-codex-fowler-plan-store-scoped-records-analysis-and-remediation.md'
);
const SCOPED_RECORD_ADR = join(REPO_ROOT, 'docs/adr/ADR-0054-plan-store-scoped-record-identity.md');
const SYSTEM_OPERATIONS_INVENTORY = join(
  REPO_ROOT,
  'docs/planning/status/system-operations-inventory-20260501.md'
);

describe('Scoped plan-store records architecture', () => {
  it('documents the component with public API, invariants, transitions, consumers, diagrams, stories, and drift guards', () => {
    expect(existsSync(COMPONENT_GUIDE)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Component Map',
      '## Command And Query API',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(section);
    }
    for (const term of [
      'PlanStoreScope',
      'ScopedPlanId',
      'ScopedPlanRef',
      'IPlanStoreReader',
      'IPlanStoreWriter',
      'PostgresPlanStore',
      'getPlanRecord(input: ScopedPlanId)',
      'fetchStoredPlanArtifact(input: ScopedPlanRef)',
      'markStoredPlanArtifactValid(input: ScopedPlanRef)',
      'No compatibility shim',
      '```mermaid',
    ]) {
      expect(guide).toContain(term);
    }
  });

  it('saves the Fowler review in the mailbox with mature-system comparison and remediation rationale', () => {
    expect(existsSync(MAILBOX_REVIEW)).toBe(true);

    const review = readFileSync(MAILBOX_REVIEW, 'utf8');
    for (const section of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions',
      '## Drift',
      '## Future Lessons',
      '## Opportunities',
      '## Applied Fixes',
    ]) {
      expect(review).toContain(section);
    }
    expect(review).toContain('```mermaid');
  });

  it('records the no-backward-compatibility posture for unscoped records', () => {
    const adr = readFileSync(SCOPED_RECORD_ADR, 'utf8');
    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');

    for (const source of [adr, guide]) {
      expect(source).toContain('No compatibility shim');
      expect(source).toContain('unscoped plan-record');
      expect(source).toContain('fail fast');
    }
  });

  it('ships user stories for all scoped record command/query scenarios', () => {
    expect(existsSync(USER_STORIES_DOC)).toBe(true);

    const stories = readFileSync(USER_STORIES_DOC, 'utf8');
    for (const scenario of [
      'US-PSR-001',
      'US-PSR-002',
      'US-PSR-003',
      'US-PSR-004',
      'US-PSR-005',
      'US-PSR-006',
      'US-PSR-007',
      'US-PSR-008',
      'US-PSR-009',
      'US-PSR-010',
      'PS-C01',
      'PS-C08',
      'PS-Q01',
      'PS-Q08',
      'Given a missing scope tuple',
      'Given a mismatched canonical ownership tuple',
      'Given two tenants share the same content-derived plan id',
      'Given an admission link references another tenant',
    ]) {
      expect(stories).toContain(scenario);
    }
  });

  it('declares owned-concern docblocks on active scoped plan-store modules', () => {
    const expectedDocblocks = new Map([
      [PLAN_RECORD_SOURCE, 'Owned concern: publish tenant-owned plan-record contract shapes'],
      [
        PLAN_EXECUTABILITY_SOURCE,
        'Owned concern: publish tenant-owned adapter executability record shapes',
      ],
      [PLAN_ADMISSION_SOURCE, 'Owned concern: publish tenant-owned plan admission link shapes'],
      [PLAN_RECORD_SCHEMA_PACK, 'Owned concern: validate scoped plan-store record contracts'],
      [PLAN_STORE_READER_PORT, 'Owned concern: expose scoped plan-store query ports'],
      [PLAN_STORE_WRITER_PORT, 'Owned concern: expose scoped plan-store command ports'],
      [
        STORED_PLAN_ARTIFACT_PORT,
        'Owned concern: expose stored-plan artifact lifecycle and materialization ports',
      ],
      [
        POSTGRES_PLAN_STORE_SOURCE,
        'Owned concern: adapt scoped plan-store commands and queries to Postgres',
      ],
      [
        POSTGRES_PLAN_RECORD_REPOSITORY,
        'Owned concern: persist tenant-owned plan-record aggregate state',
      ],
      [POSTGRES_PLAN_STORE_SQL, 'Owned concern: define scoped plan-store Postgres DDL'],
      [POSTGRES_PLAN_STORE_MAPPERS, 'Owned concern: map scoped plan-store rows'],
      [
        POSTGRES_PLAN_STORE_SCHEMA_MANAGER,
        'Owned concern: migrate scoped plan-store tables and fail-fast legacy shapes',
      ],
      [
        POSTGRES_PLAN_EXECUTABILITY_REPOSITORY,
        'Owned concern: persist scoped adapter executability records',
      ],
      [POSTGRES_PLAN_ADMISSION_REPOSITORY, 'Owned concern: persist scoped plan admission links'],
      [
        POSTGRES_PLAN_EXECUTABLE_BLOB_REPOSITORY,
        'Owned concern: persist tenant-neutral stored-plan artifact blobs',
      ],
    ]);

    for (const [path, docblock] of expectedDocblocks) {
      expect(readFileSync(path, 'utf8'), path).toContain(docblock);
    }
  });

  it('keeps artifacts plan-store ports scoped and free of global planId query signatures', () => {
    const reader = readFileSync(PLAN_STORE_READER_PORT, 'utf8');
    const writer = readFileSync(PLAN_STORE_WRITER_PORT, 'utf8');

    expect(writer).toContain('PlanStoreScope');

    for (const source of [reader, writer]) {
      expect(source).toContain('ScopedPlanId');
    }

    expect(reader).toContain('ScopedPlanRef');
    expect(reader).not.toMatch(/getPlanRecord\(planId/u);
    expect(reader).not.toMatch(/getPlanRecordByRef\(planRef/u);
    expect(reader).not.toMatch(/listExecutabilityByAdapter\(\s*planId/u);
    expect(writer).not.toMatch(/markSuperseded\(\s*planId/u);
    expect(writer).not.toMatch(/archivePlan\(planId/u);
  });

  it('keeps stored-plan artifact ports canonical in @dvt/artifacts instead of planner, API, or engine duplicates', () => {
    expect(existsSync(STORED_PLAN_ARTIFACT_PORT)).toBe(true);

    const artifactPort = readFileSync(STORED_PLAN_ARTIFACT_PORT, 'utf8');
    for (const term of [
      'Owned concern: expose stored-plan artifact lifecycle and materialization ports',
      'StoredPlanArtifact',
      'IStoredPlanArtifactWriter',
      'IStoredPlanArtifactReader',
      'IStoredPlanArtifactStore',
      'storePlanArtifact',
      'fetchStoredPlanArtifact',
      'fetchStoredPlanArtifactForValidation',
      'ScopedPlanRef',
    ]) {
      expect(artifactPort).toContain(term);
    }

    expect(existsSync(PLANNER_LIFECYCLE_PORT)).toBe(false);
    expect(existsSync(API_STORED_PLAN_PORT)).toBe(false);

    if (existsSync(ENGINE_PLAN_ARTIFACT_READER)) {
      const enginePort = readFileSync(ENGINE_PLAN_ARTIFACT_READER, 'utf8');
      expect(enginePort).not.toContain('export interface IPlanFetcher');
      expect(enginePort).not.toContain('export interface StoredPlanArtifact');
    }

    const postgresPlanStore = readFileSync(POSTGRES_PLAN_STORE_SOURCE, 'utf8');
    expect(postgresPlanStore).toContain('IStoredPlanArtifactStore');
    expect(postgresPlanStore).not.toContain('IPlanValidationLifecycleStore');
    expect(postgresPlanStore).not.toContain('IPlanFetcher');
  });

  it('keeps Postgres tenant-owned record tables scoped instead of keyed by global plan_id only', () => {
    const sql = readFileSync(POSTGRES_PLAN_STORE_SQL, 'utf8');
    const planRecordsDdl = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_records'),
      sql.indexOf('export function sqlEnsurePlanRecordLineageConstraints')
    );

    for (const column of [
      'tenant_id TEXT NOT NULL',
      'project_id TEXT NOT NULL',
      'environment_id TEXT NOT NULL',
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain('PRIMARY KEY (tenant_id, project_id, environment_id, plan_id)');
    expect(sql).toContain(
      'REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id)'
    );
    expect(planRecordsDdl).not.toContain('plan_id TEXT PRIMARY KEY');
  });

  it('keeps the operations inventory aligned with the scoped plan-store API instead of legacy signatures', () => {
    const inventory = readFileSync(SYSTEM_OPERATIONS_INVENTORY, 'utf8');

    for (const currentSignature of [
      'IPlanStoreReader.getPlanRecord(input: ScopedPlanId)',
      'IPlanStoreReader.getPlanRecordByRef(input: ScopedPlanRef)',
      'IPlanStoreReader.listExecutabilityByAdapter(input: ScopedPlanExecutabilityQuery)',
      'IPlanStoreWriter.markSuperseded(input: MarkPlanSupersededInput)',
      'IStoredPlanArtifactReader.fetchStoredPlanArtifact(input: ScopedPlanRef)',
    ]) {
      expect(inventory).toContain(currentSignature);
    }

    for (const retiredSignature of [
      'IPlanStoreReader.getPlanRecord(planId)',
      'IPlanStoreReader.getPlanRecordByRef(planRef)',
      'IPlanStoreWriter.markSuperseded(planId, supersededByPlanId)',
      'IPlanStoreWriter.archivePlan(planId, archivedAtIso)',
      'Active drift: every method on `IPlanStoreReader`/`IPlanStoreWriter` is',
    ]) {
      expect(inventory).not.toContain(retiredSignature);
    }
  });
});
