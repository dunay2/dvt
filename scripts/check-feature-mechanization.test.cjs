const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractFeatureMechanizationManifests,
  FeatureMechanizationGitDiffReader,
  validateFeatureImplementationManifests,
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

test('validateFeatureImplementationManifests rejects changed files outside allowed implementation surfaces', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: validManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/unplannedCanvasShortcut.ts'],
    }
  );

  assert.match(result.errors.join('\n'), /outside allowedImplementationSurfaces/);
});

test('validateFeatureImplementationManifests rejects changed files on forbidden implementation surfaces', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/src/app/views/canvas/**',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/tokenRefreshShortcut.ts'],
    }
  );

  assert.match(result.errors.join('\n'), /matches forbiddenImplementationSurfaces/);
});

test('validateFeatureImplementationManifests applies forbidden surfaces only from the owning feature manifest', () => {
  const canvasFeatureManifest = {
    ...validManifest,
    featureId: 'TF-E2-M-C',
    allowedImplementationSurfaces: [
      'apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts',
    ],
    forbiddenImplementationSurfaces: ['apps/api/** backend authorization changes'],
  };
  const previousFeatureManifest = {
    ...validManifest,
    featureId: 'TF-E2-M-B',
    allowedImplementationSurfaces: ['apps/web/src/app/services/api/**'],
    forbiddenImplementationSurfaces: ['apps/web/src/app/views/canvas/** JWT decoding'],
  };

  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'previous-plan.md',
        manifest: previousFeatureManifest,
      },
      {
        sourcePath: 'current-plan.md',
        manifest: canvasFeatureManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts'],
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests rejects added exported code symbols missing from the manifest', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: validManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
      addedLinesByPath: {
        'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts': [
          'export function createUnplannedCanvasPosture() {',
          "  return 'unsafe';",
          '}',
        ],
      },
    }
  );

  assert.match(result.errors.join('\n'), /createUnplannedCanvasPosture/);
  assert.match(result.errors.join('\n'), /not declared in feature mechanization symbols/);
});

test('validateFeatureImplementationManifests accepts added exported code symbols declared in the manifest', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          forbiddenImplementationSurfaces: ['apps/web/src/app/services/api/** token refresh'],
          symbols: [
            ...validManifest.symbols,
            {
              ...validManifest.symbols[0],
              name: 'createPlannedCanvasPosture',
            },
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
      addedLinesByPath: {
        'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts': [
          'export function createPlannedCanvasPosture() {',
          "  return 'safe';",
          '}',
        ],
      },
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests rejects Cypress intercepts for workspace graph drafts', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts':
          "cy.intercept('GET', '/workspace/graph/draft', { fixture: 'draft.json' });",
      },
    }
  );

  assert.match(result.errors.join('\n'), /must not use cy\.intercept\(\).*workspace\/graph\/draft/);
});

test('validateFeatureImplementationManifests rejects Cypress direct PUT seeding for workspace graph drafts', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts':
          "cy.request('PUT', '/workspace/graph/draft', { nodes: [] });",
      },
    }
  );

  assert.match(result.errors.join('\n'), /must not issue direct PUT.*workspace\/graph\/draft/);
});

test('validateFeatureImplementationManifests allows Cypress draft GET preflight with unrelated PUT requests', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts': [
          "cy.request('GET', '/workspace/graph/draft');",
          "cy.request('PUT', '/workspace/session', { active: true });",
        ].join('\n'),
      },
    }
  );

  assert.deepEqual(result.errors, []);
});

test('FeatureMechanizationGitDiffReader excludes untracked scratch files from implementation diffs', () => {
  const reader = new FeatureMechanizationGitDiffReader({
    baseRef: 'origin/main',
    repoRootPath: process.cwd(),
  });
  const readGitCalls = [];

  reader.readGitLines = (args) => {
    readGitCalls.push(args.join(' '));

    if (args[0] === 'diff') {
      return ['apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts'];
    }

    if (args[0] === 'ls-files') {
      return ['scratch/local-note.md'];
    }

    return [];
  };

  const changedFiles = reader.readChangedFiles();

  assert.deepEqual(changedFiles, [
    'apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts',
  ]);
  assert.equal(
    readGitCalls.some((call) => call.startsWith('ls-files --others')),
    false
  );
});
