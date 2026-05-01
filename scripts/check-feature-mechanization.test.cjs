const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractFeatureMechanizationManifests,
  validateFeatureMechanizationManifest,
  validateFeatureMechanizationDocs,
} = require('./check-feature-mechanization.cjs');

const validManifest = {
  version: 1,
  featureId: 'TF-E2-M-B',
  mechanizationStatus: 'closed',
  noHumanDecisionsRemaining: true,
  implementationPlan:
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md',
  componentGuides: [
    'docs/architecture/components/web/graph/canvas-draft-access-posture-component.md',
  ],
  userStories: [
    'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
  ],
  governingSources: [
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
  ],
  allowedImplementationSurfaces: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
  forbiddenImplementationSurfaces: ['apps/web/src/app/views/canvas/** token refresh'],
  commandQueryRails: [
    {
      name: 'GetWorkspaceGraphDraft',
      type: 'query',
      dddOwner: 'WorkspaceGraphDraft read boundary',
    },
  ],
  domainObjects: [
    {
      name: 'CanvasDraftAccessPosture',
      type: 'presentation model',
      owner: 'Canvas draft access posture component',
    },
  ],
  fowlerSignals: ['boundary drift'],
  architectureGuards: [
    {
      name: 'canvasStartupAndDraftRecovery.architecture.test.ts',
      command: 'pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts',
    },
  ],
  cypressFlows: [
    {
      name: 'canvas-draft-access-posture.cy.ts',
      command:
        'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
    },
  ],
  redGreenCycles: [
    {
      id: 'auth-transport-posture',
      redTest: 'pnpm --filter @dvt/web test -- canvasDraftAuthTransportPosture.test.ts',
      expectedFailure: 'canvasDraftAuthTransportPosture.ts does not exist',
      patchSurfaces: ['apps/web/src/app/views/canvas/canvasDraftAuthTransportPosture.ts'],
      greenTest: 'pnpm --filter @dvt/web test -- canvasDraftAuthTransportPosture.test.ts',
    },
  ],
  symbols: [
    {
      name: 'CanvasDraftAccessPosture',
      path: 'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
      dddOwner: 'Canvas draft access posture component',
      cqRails: ['GetWorkspaceGraphDraft'],
      fowlerSignals: ['boundary drift'],
      architectureGuard: 'canvasStartupAndDraftRecovery.architecture.test.ts',
      cypressCoverage: 'canvas-draft-access-posture.cy.ts',
      unitTests: ['canvasDraftAccessPostureModel.test.ts'],
    },
  ],
  completionGate: ['pnpm --filter @dvt/web typecheck', 'pnpm verify:prepush'],
};

function markdownWithManifest(manifest = validManifest) {
  return [
    '# TF-E2-M-B',
    '',
    '```feature-mechanization',
    JSON.stringify(manifest, null, 2),
    '```',
    '',
  ].join('\n');
}

test('extractFeatureMechanizationManifests reads feature-mechanization fenced blocks', () => {
  const manifests = extractFeatureMechanizationManifests(markdownWithManifest(), 'plan.md');

  assert.equal(manifests.length, 1);
  assert.equal(manifests[0].manifest.featureId, 'TF-E2-M-B');
  assert.equal(manifests[0].sourcePath, 'plan.md');
});

test('validateFeatureMechanizationManifest accepts a closed mechanical feature contract', () => {
  const result = validateFeatureMechanizationManifest(validManifest, 'plan.md');

  assert.deepEqual(result.errors, []);
});

test('validateFeatureMechanizationManifest rejects open human decisions', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      noHumanDecisionsRemaining: false,
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /must set noHumanDecisionsRemaining to true/);
});

test('validateFeatureMechanizationManifest rejects red-green cycles without expected failure', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      redGreenCycles: [
        {
          ...validManifest.redGreenCycles[0],
          expectedFailure: '',
        },
      ],
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /expectedFailure/);
});

test('validateFeatureMechanizationManifest rejects symbols without C&Q, DDD, Fowler, architecture, Cypress, and unit tests', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      symbols: [
        {
          name: 'CanvasDraftAccessPosture',
          path: 'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
        },
      ],
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /missing dddOwner/);
  assert.match(result.errors.join('\n'), /missing cqRails/);
  assert.match(result.errors.join('\n'), /missing fowlerSignals/);
  assert.match(result.errors.join('\n'), /missing architectureGuard/);
  assert.match(result.errors.join('\n'), /missing cypressCoverage/);
  assert.match(result.errors.join('\n'), /missing unitTests/);
});

test('validateFeatureMechanizationDocs requires requested feature manifests to exist', () => {
  const result = validateFeatureMechanizationDocs(
    [
      {
        path: 'plan.md',
        content: markdownWithManifest(),
      },
    ],
    {
      requiredFeatureIds: ['TF-E2-MISSING'],
    }
  );

  assert.match(
    result.errors.join('\n'),
    /Required feature TF-E2-MISSING has no feature mechanization manifest/
  );
});

test('validateFeatureMechanizationDocs accepts requested closed feature manifests', () => {
  const result = validateFeatureMechanizationDocs(
    [
      {
        path: 'plan.md',
        content: markdownWithManifest(),
      },
    ],
    {
      requiredFeatureIds: ['TF-E2-M-B'],
    }
  );

  assert.deepEqual(result.errors, []);
});
