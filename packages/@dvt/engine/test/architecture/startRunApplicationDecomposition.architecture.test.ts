import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const START_RUN_SOURCE = join(ENGINE_ROOT, 'services/startRun');
const require = createRequire(import.meta.url);
const { extractFeatureMechanizationManifests } = require(
  join(REPO_ROOT, 'scripts/lib/feature-mechanization-manifest.cjs')
) as {
  extractFeatureMechanizationManifests: (
    markdown: string,
    sourcePath: string
  ) => Array<{
    manifest?: {
      componentGuides?: readonly string[];
      commandQueryRails?: Array<{
        dddOwner?: string;
        name?: string;
        type?: string;
      }>;
      featureId?: string;
    } | null;
  }>;
};

describe('StartRun application decomposition architecture', () => {
  it('keeps StartRunApplicationService as phase orchestration rather than phase implementation', () => {
    const source = readEngineSource('application/StartRunApplicationService.ts');

    for (const expected of [
      'StartRunAdmissionService',
      'StartRunIntentService',
      'admissionService.admit',
      'intentService.createIntent',
      'executionService.executeStartRun',
      'failurePolicy.handleStartRunError',
    ]) {
      expect(source).toContain(expected);
    }

    for (const forbidden of [
      'private async createStartRunIntent',
      'planIntegrityValidator.fetchAndValidate',
      'toScopedPlanRef(',
      'intentStore.createIntent',
      'idempotency.startRunIntentId',
      'guard.resolveAdapter',
      'guard.assertExecutionPolicyAllowed',
    ]) {
      expect(source).not.toContain(forbidden);
    }

    expect(source.slice(0, 260)).toContain('@ownedConcern');
  });

  it('hosts each start-run phase in a module with an owned concern', () => {
    for (const moduleName of [
      'StartRunAdmissionService.ts',
      'StartRunIntentService.ts',
      'StartRunExecutionService.ts',
      'StartRunFailurePolicy.ts',
      'StartRunValidationPolicy.ts',
      'StartRunEventFactory.ts',
      'RunExecutionContextAdmissionPolicy.ts',
      'StartRunDomainConstants.ts',
      'StartRunTypes.ts',
    ]) {
      const moduleSource = readFileSync(join(START_RUN_SOURCE, moduleName), 'utf8');
      expect(moduleSource.slice(0, 260)).toContain('@ownedConcern');
    }

    const phaseSources = readStartRunPhaseSources();
    for (const expected of [
      'export class StartRunAdmissionService',
      'export interface StartRunAdmissionResult',
      'export class StartRunIntentService',
      'export interface StartRunIntentServiceDeps',
      'export class StartRunExecutionService',
      'export class StartRunFailurePolicy',
    ]) {
      expect(phaseSources).toContain(expected);
    }
  });

  it('keeps WE-HX-3 as the single active structured start-run decomposition feature', () => {
    const planPath =
      'docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md';
    const manifests = extractFeatureMechanizationManifests(
      readFileSync(join(REPO_ROOT, planPath), 'utf8'),
      planPath
    );
    const startRunDecompositionFeatureIds = manifests
      .map((entry) => entry.manifest?.featureId)
      .filter((featureId): featureId is string =>
        Boolean(featureId?.endsWith('START-RUN-DECOMPOSITION'))
      );
    const weHx3Manifest = manifests.find(
      (entry) => entry.manifest?.featureId === 'WE-HX-3-START-RUN-DECOMPOSITION'
    )?.manifest;

    expect(startRunDecompositionFeatureIds).toEqual(['WE-HX-3-START-RUN-DECOMPOSITION']);
    expect(weHx3Manifest?.commandQueryRails).toContainEqual(
      expect.objectContaining({
        dddOwner: 'StartRunApplicationFlow',
        name: 'IWorkflowEngine.startRun',
        type: 'command',
      })
    );
    expect(weHx3Manifest?.componentGuides).toEqual(
      expect.arrayContaining([
        'docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md',
        'docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md',
      ])
    );
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

function readStartRunPhaseSources(): string {
  return [
    'StartRunAdmissionService.ts',
    'StartRunIntentService.ts',
    'StartRunExecutionService.ts',
    'StartRunFailurePolicy.ts',
  ]
    .map((moduleName) => readFileSync(join(START_RUN_SOURCE, moduleName), 'utf8'))
    .join('\n');
}
