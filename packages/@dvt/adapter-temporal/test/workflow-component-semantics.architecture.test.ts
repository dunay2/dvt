/**
 * Owned concern: verify the Temporal PlanRef workflow boundary keeps semantic
 * ownership, public API, invariants, transitions, and consumer documentation.
 *
 * @baseline ADR-0052: PlanRef Continuation Safety
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractComponentMapRows,
  extractStoryCoverageIds,
} from './helpers/workflowComponentGuideSupport.js';

const TEMPORAL_SRC_ROOT = join(import.meta.dirname, '../src');
const WORKFLOW_ROOT = join(TEMPORAL_SRC_ROOT, 'workflows');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const COMPONENT_GUIDE_PATH = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md'
);
const USER_STORIES_PATH = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary-user-stories.md'
);
const CAPACITY_SLA_PATH = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md'
);
const CAPACITY_POLICY_PATH = join(TEMPORAL_SRC_ROOT, 'temporalPlanRefCapacitySlaPolicy.ts');
const CAPACITY_MAILBOX_REVIEW_PATH = join(
  REPO_ROOT,
  'buzon/20260430-codex-fowler-ar-d2-temporal-capacity-sla-analysis-and-remediation.md'
);
const MAILBOX_REVIEW_PATH = join(
  REPO_ROOT,
  'buzon/20260430-codex-fowler-ar-d-continuation-safety-analysis-and-remediation.md'
);

describe('Temporal PlanRef workflow component semantics', () => {
  it('states the exact owned concern at the top of every documented component module', () => {
    const guide = readFileSync(COMPONENT_GUIDE_PATH, 'utf8');
    const concernsByModule = extractComponentMapRows(guide);

    for (const [fileName, concern] of concernsByModule.entries()) {
      const source = readComponentModuleSource(fileName);

      expect(source).toMatch(
        new RegExp(String.raw`^/\*\*[\s\S]*\* @ownedConcern ${escapeRegExp(concern)}[\s\S]*\*/`)
      );
    }
  });

  it('keeps component-map ownership in sync with the real component module set', () => {
    const guide = readFileSync(COMPONENT_GUIDE_PATH, 'utf8');
    const concernsByModule = extractComponentMapRows(guide);
    const documentedModules = [...concernsByModule.keys()].sort();

    expect(documentedModules).toEqual(listExpectedComponentModuleNames());
  });

  it('publishes the component API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(COMPONENT_GUIDE_PATH)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE_PATH, 'utf8');

    expect(guide).toContain('# Temporal PlanRef workflow boundary component');
    expect(guide).toContain('## Public API');
    expect(guide).toContain('## Invariants');
    expect(guide).toContain('## Transitions');
    expect(guide).toContain('## Consumers');
    expect(guide).toContain('## Component map');
    expect(guide).toContain('## Diagrams');
    expect(guide).toContain('```mermaid');
    expect(guide).toContain('RunPlanWorkflowInput');
    expect(guide).toContain('continueAsNewAfterLayerCount: number');
    expect(guide).toContain('PlanRef plus compact cursor');
    expect(guide).toContain('full `ExecutionPlan` MUST NOT cross');
    expect(guide).toContain('apps/api provider-adapter factory');
    expect(guide).toContain('apps/temporal-worker runtime host');
    expect(guide).toContain('ADR-0052');
    expect(guide).toContain('temporal-planref-workflow-boundary-user-stories.md');
    expect(guide).toContain(
      '20260430-codex-fowler-ar-d-continuation-safety-analysis-and-remediation.md'
    );
  });

  it('publishes user stories and branch mailbox analysis for continuation safety', () => {
    expect(existsSync(USER_STORIES_PATH)).toBe(true);
    expect(existsSync(MAILBOX_REVIEW_PATH)).toBe(true);

    const stories = readFileSync(USER_STORIES_PATH, 'utf8');
    const mailbox = readFileSync(MAILBOX_REVIEW_PATH, 'utf8');

    expect(stories).toContain('# Temporal PlanRef workflow boundary user stories');
    expect(stories).toContain('## Story coverage matrix');
    expect(stories).toContain('US-TPW-001');
    expect(stories).toContain('US-TPW-002');
    expect(stories).toContain('US-TPW-003');
    expect(stories).toContain('PLAN_REF_EXPIRED');
    expect(stories).toContain('PLAN_REF_UNAVAILABLE');
    expect(stories).toContain('CURSOR_OVERFLOW');
    expect(stories).toContain('```mermaid');

    expect(mailbox).toContain('# Fowler architecture analysis - AR-D continuation safety');
    expect(mailbox).toContain('## Fowler reading');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Remediation applied');
    expect(mailbox).toContain('## Future teachings');
  });

  it('publishes the AR-D2 capacity SLA and keeps it linked to PlanRef stories', () => {
    expect(existsSync(CAPACITY_SLA_PATH)).toBe(true);

    const sla = readFileSync(CAPACITY_SLA_PATH, 'utf8');
    const policy = readFileSync(CAPACITY_POLICY_PATH, 'utf8');
    const stories = readFileSync(USER_STORIES_PATH, 'utf8');

    expect(sla).toContain('# Temporal PlanRef capacity SLA');
    expect(sla).toContain('## Owned Concern');
    expect(sla).toContain('## Public API');
    expect(sla).toContain('## Invariants');
    expect(sla).toContain('## Transitions');
    expect(sla).toContain('## Consumers');
    expect(sla).toContain('## Production capacity profile');
    expect(sla).toContain('continueAsNewAfterLayerCount');
    expect(sla).toContain('maximum workflow history size');
    expect(sla).toContain('maximum segment count');
    expect(sla).toContain('PlanRef retention');
    expect(sla).toContain('```mermaid');
    expect(policy).toMatch(
      /^\/\*\*[\s\S]*\* @ownedConcern Evaluate Temporal PlanRef workflow budgets against governed production capacity SLAs[\s\S]*\*\//
    );
    expect(stories).toContain('US-TPW-006');
    expect(stories).toContain('US-TPW-007');
    expect(stories).toContain('temporal-planref-capacity-sla.md');
  });

  it('covers the governed user-story IDs as a complete semantic matrix', () => {
    const stories = readFileSync(USER_STORIES_PATH, 'utf8');
    expect(extractStoryCoverageIds(stories)).toEqual([
      'US-TPW-001',
      'US-TPW-002',
      'US-TPW-003',
      'US-TPW-004',
      'US-TPW-005',
      'US-TPW-006',
      'US-TPW-007',
    ]);
  });

  it('keeps Fowler AR-D2 capacity analysis in the mailbox with mature-system comparison', () => {
    expect(existsSync(CAPACITY_MAILBOX_REVIEW_PATH)).toBe(true);

    const mailbox = readFileSync(CAPACITY_MAILBOX_REVIEW_PATH, 'utf8');

    expect(mailbox).toContain('# Fowler architecture analysis - AR-D2 Temporal capacity SLA');
    expect(mailbox).toContain('## Fowler reading');
    expect(mailbox).toContain('## Mature-system comparison');
    expect(mailbox).toContain('## Improved patterns');
    expect(mailbox).toContain('## Antipatterns detected');
    expect(mailbox).toContain('## Drift and remediation');
    expect(mailbox).toContain('## Future teachings');
    expect(mailbox).toContain('## User stories covered');
    expect(mailbox).toContain('## ADR decision');
    expect(mailbox).toContain('```mermaid');
    expect(mailbox).toContain('temporalPlanRefCapacitySlaPolicy.ts');
    expect(mailbox).toContain('temporal-planref-capacity-sla.md');
  });

  it('keeps durable workflow input on PlanRef plus control budget, not full ExecutionPlan', () => {
    const typesSource = readWorkflowSource('runPlanWorkflow.types.ts');
    const inputInterface = extractInterface(typesSource, 'RunPlanWorkflowInput');

    expect(inputInterface).toContain('planRef: WorkflowPlanRef');
    expect(inputInterface).toContain('ctx: WorkflowCtx');
    expect(inputInterface).toContain('maxContinueAsNewPayloadBytes: number');
    expect(inputInterface).toContain('continueAsNewAfterLayerCount: number');
    expect(inputInterface).toContain('cursor?: WorkflowExecutionCursor');
    expect(inputInterface).not.toContain('ExecutionPlan');
    expect(inputInterface).not.toContain('steps:');
  });

  it('parses control input before resolving the first segment and uses the cursor layer', () => {
    const workflowSource = readWorkflowSource('RunPlanWorkflow.ts');
    const typesSource = readWorkflowSource('runPlanWorkflow.types.ts');

    const parseIndex = workflowSource.indexOf('const ctrl = parseWorkflowControlInput(input);');
    const firstResolveIndex = workflowSource.indexOf(
      'const firstSegment = await segmentActivities.resolveExecutionSegment({'
    );
    const cursorLayerIndex = workflowSource.indexOf('layerIndex: ctrl.nextLayerIndex');

    expect(parseIndex).toBeGreaterThanOrEqual(0);
    expect(firstResolveIndex).toBeGreaterThan(parseIndex);
    expect(cursorLayerIndex).toBeGreaterThan(firstResolveIndex);
    expect(typesSource).toContain('ctx: WorkflowCtx');
    expect(workflowSource).toContain('ctx: input.ctx');
  });

  it('routes segment resolution through the scoped engine-dispatch plan query', () => {
    const activityFactorySource = readFileSync(
      join(REPO_ROOT, 'packages/@dvt/adapter-temporal/src/activities/activityFactory.ts'),
      'utf8'
    );
    const activityTypesSource = readFileSync(
      join(REPO_ROOT, 'packages/@dvt/adapter-temporal/src/activities/activityTypes.ts'),
      'utf8'
    );

    expect(activityFactorySource).toContain('planArtifactReader.fetchForEngineDispatch');
    expect(activityTypesSource).toContain('planArtifactReader: TemporalPlanArtifactReader');
    expect(activityTypesSource).not.toContain('fetcher: IPlanFetcher');
  });
});

function readWorkflowSource(fileName: string): string {
  return readFileSync(join(WORKFLOW_ROOT, fileName), 'utf8');
}

function readComponentModuleSource(fileName: string): string {
  return readFileSync(resolveComponentModulePath(fileName), 'utf8');
}

function resolveComponentModulePath(fileName: string): string {
  if (fileName === 'temporalPlanRefCapacitySlaPolicy.ts') {
    return CAPACITY_POLICY_PATH;
  }

  return join(WORKFLOW_ROOT, fileName);
}

function listExpectedComponentModuleNames(): string[] {
  return [...listWorkflowModuleNames(), 'temporalPlanRefCapacitySlaPolicy.ts'].sort();
}

function listWorkflowModuleNames(): string[] {
  return readdirSync(WORKFLOW_ROOT)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort();
}

function extractInterface(source: string, interfaceName: string): string {
  const match = new RegExp(String.raw`export interface ${interfaceName} \{[\s\S]*?\n\}`).exec(
    source
  );
  if (match === null) {
    throw new Error(`Missing interface ${interfaceName}`);
  }

  return match[0];
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
