/**
 * Owned concern: verify tenant-configurable run-event retention keeps policy,
 * worker configuration, adapter eligibility, docs, and evidence semantically aligned.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Postgres run-event retention policy component semantics', () => {
  it('states the owned concern at the top of the AR-D5 runtime owner modules', () => {
    expect(
      readFileSync(
        join(
          import.meta.dirname,
          '../../../../packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts'
        ),
        'utf8'
      )
    ).toMatch(
      /^\/\*\*[\s\S]*@ownedConcern Owns run-event archive lifecycle policy contracts, tenant retention resolution, and archive runtime ports\.[\s\S]*\*\//
    );
    expect(
      readFileSync(join(import.meta.dirname, '../src/PostgresRunArchiveStore.ts'), 'utf8')
    ).toMatch(
      /^\/\*\*[\s\S]*@ownedConcern Owns PostgreSQL run-event archive-unit eligibility, export\/verification state transitions, restore writes, and hot-store deletion for the state-store adapter\.[\s\S]*\*\//
    );
    expect(
      readFileSync(
        join(import.meta.dirname, '../../../../apps/outbox-worker/src/plugins/env.ts'),
        'utf8'
      )
    ).toMatch(
      /^\/\*\*[\s\S]*@ownedConcern Owns outbox worker environment parsing and runtime configuration policy for active\/passive worker modes\.[\s\S]*\*\//
    );
  });

  it('documents public API, invariants, transitions, consumers, diagrams, and user scenarios', () => {
    const componentGuidePath = join(
      import.meta.dirname,
      '../../../../docs/architecture/components/engine/adapters/state-store/postgres/run-event-retention-policy-component.md'
    );
    const userStoriesPath = join(
      import.meta.dirname,
      '../../../../docs/architecture/components/engine/adapters/state-store/postgres/run-event-retention-policy-user-stories.md'
    );

    expect(existsSync(componentGuidePath)).toBe(true);
    expect(existsSync(userStoriesPath)).toBe(true);

    const guide = readFileSync(componentGuidePath, 'utf8');
    const stories = readFileSync(userStoriesPath, 'utf8');

    expect(guide).toContain('## Public API');
    expect(guide).toContain('## Invariants');
    expect(guide).toContain('## Transitions');
    expect(guide).toContain('## Consumers');
    expect(guide).toContain('## Diagrams');
    expect(guide).toContain('ConfigureRunEventRetentionPolicy');
    expect(guide).toContain('tenant-specific hot-retention');
    expect(guide).toContain('```mermaid');

    expect(stories).toContain('US-RER-001');
    expect(stories).toContain('US-RER-002');
    expect(stories).toContain('US-RER-003');
    expect(stories).toContain('US-RER-004');
    expect(stories).toContain('US-RER-005');
    expect(stories).toContain('```mermaid');
  });

  it('keeps the Fowler analysis, proposal, evidence, and risk entry tied to the same rail', () => {
    const mailboxPath = join(
      import.meta.dirname,
      '../../../../buzon/20260523-codex-fowler-ar-d5-tenant-retention-policy-analysis.md'
    );
    const proposalPath = join(
      import.meta.dirname,
      '../../../../docs/planning/proposals/mandatory/runtime-and-contracts/ar-d5-tenant-configurable-retention-policy-plan-20260522.md'
    );
    const evidencePath = join(
      import.meta.dirname,
      '../../../../docs/evidence/ed-20260522-ar-d5-tenant-retention-policy.md'
    );
    const riskPath = join(
      import.meta.dirname,
      '../../../../docs/risk-register/quality/R-20260522-AR-D5-TENANT-RETENTION-POLICY.yaml'
    );

    expect(existsSync(mailboxPath)).toBe(true);

    const mailbox = readFileSync(mailboxPath, 'utf8');
    const proposal = readFileSync(proposalPath, 'utf8');
    const evidence = readFileSync(evidencePath, 'utf8');
    const risk = readFileSync(riskPath, 'utf8');

    for (const content of [mailbox, proposal, evidence, risk]) {
      expect(content).toContain('ConfigureRunEventRetentionPolicy');
    }
    expect(mailbox).toContain('## Mature-system comparison');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Repetitions and drift fixed');
    expect(proposal).toContain('PostgresRunEventRetentionPolicy.architecture.test.ts');
  });

  it('keeps tenant-retention semantics in the policy object and adapter gateway, not env parsing', () => {
    const envSource = readFileSync(
      join(import.meta.dirname, '../../../../apps/outbox-worker/src/plugins/env.ts'),
      'utf8'
    );
    const policySource = readFileSync(
      join(
        import.meta.dirname,
        '../../../../packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts'
      ),
      'utf8'
    );
    const adapterSource = readFileSync(
      join(import.meta.dirname, '../src/PostgresRunArchiveStore.ts'),
      'utf8'
    );

    expect(envSource).toContain('DVT_RUN_EVENT_RETENTION_TENANT_HOT_RETENTION_DAYS');
    expect(envSource).not.toContain('computeCutoffIso');
    expect(policySource).toContain('resolveTenantHotRetentionDays');
    expect(policySource).toContain('validateRunEventRetentionPolicy');
    expect(adapterSource).toContain('resolveTenantHotRetentionDays(policy, row.tenant_id)');
    expect(adapterSource).toContain('candidate.hasTenantOutsideRetention');
  });
});
