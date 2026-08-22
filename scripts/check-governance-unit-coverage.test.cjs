const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Owned concern: guard the governance unit manifest semantics and prevent broad
 * root owners from hiding package-level component boundaries.
 */
const {
  validateManifest,
  buildOwnerMatcher,
  findOwnerMatches,
  globToRegExp,
  readManifest,
} = require('./check-governance-unit-coverage.cjs');

const fixtureFiles = [
  'apps/api/src/server.ts',
  'apps/web/src/app/views/AdminView.tsx',
  'packages/@dvt/contracts/src/index.ts',
  'docs/planning/status/system-governance-unit-index-20260501.md',
  'package.json',
];

function manifest(overrides = {}) {
  return {
    version: 1,
    rootUnit: 'SYS-DVT',
    units: [
      {
        id: 'SYS-DVT',
        level: 'system',
        status: 'review',
        owns: [],
        childrenRequired: true,
      },
      {
        id: 'SYS-API',
        parent: 'SYS-DVT',
        level: 'workspace',
        status: 'coverage-required',
        owns: [],
        childrenRequired: true,
      },
      {
        id: 'SYS-API-ROOT',
        parent: 'SYS-API',
        level: 'component',
        status: 'coverage-required',
        owns: ['apps/api/**'],
        childrenRequired: true,
      },
      {
        id: 'SYS-WEB',
        parent: 'SYS-DVT',
        level: 'workspace',
        status: 'coverage-required',
        owns: [],
        childrenRequired: true,
      },
      {
        id: 'SYS-WEB-ROOT',
        parent: 'SYS-WEB',
        level: 'component',
        status: 'coverage-required',
        owns: ['apps/web/**'],
        childrenRequired: true,
      },
      {
        id: 'SYS-CONTRACTS',
        parent: 'SYS-DVT',
        level: 'workspace',
        status: 'coverage-required',
        owns: [],
        childrenRequired: true,
      },
      {
        id: 'SYS-CONTRACTS-ROOT',
        parent: 'SYS-CONTRACTS',
        level: 'component',
        status: 'coverage-required',
        owns: ['packages/@dvt/contracts/**'],
        childrenRequired: true,
      },
      {
        id: 'SYS-DOCS-GOVERNANCE',
        parent: 'SYS-DVT',
        level: 'workspace',
        status: 'coverage-required',
        owns: [],
        childrenRequired: true,
      },
      {
        id: 'SYS-DOCS-GOVERNANCE-ROOT',
        parent: 'SYS-DOCS-GOVERNANCE',
        level: 'component',
        status: 'coverage-required',
        owns: ['docs/**'],
        childrenRequired: true,
      },
      {
        id: 'SYS-REPO-METADATA',
        parent: 'SYS-DVT',
        level: 'workspace',
        status: 'canonical',
        owns: [],
        childrenRequired: false,
      },
      {
        id: 'SYS-REPO-METADATA-ROOT',
        parent: 'SYS-REPO-METADATA',
        level: 'component',
        status: 'canonical',
        owns: ['package.json'],
        childrenRequired: false,
        ownedConcern: 'Repository package metadata ownership.',
        publicApi: ['package metadata reviewed through repository governance checks'],
        invariants: ['package metadata has one governance owner'],
        transitions: ['repository metadata change -> governance validation'],
        consumers: ['repository validation gates'],
      },
    ],
    ...overrides,
  };
}

test('globToRegExp matches recursive owned paths without crossing unrelated roots', () => {
  const regex = globToRegExp('apps/web/**');

  assert.equal(regex.test('apps/web/src/app/views/AdminView.tsx'), true);
  assert.equal(regex.test('apps/api/src/server.ts'), false);
});

test('findOwnerMatches returns the single owning unit for a tracked file', () => {
  const matches = findOwnerMatches('apps/api/src/server.ts', manifest().units);

  assert.deepEqual(
    matches.map((unit) => unit.id),
    ['SYS-API-ROOT']
  );
});

test('findOwnerMatches honors excludes before reporting ownership', () => {
  const units = [
    {
      id: 'SYS-API-ROOT',
      owns: ['apps/api/**'],
      excludes: ['apps/api/src/infrastructure/startRun/**'],
    },
    {
      id: 'SYS-PLANSTORE-API-COMPOSITION',
      owns: ['apps/api/src/infrastructure/startRun/**'],
    },
  ];

  const matches = findOwnerMatches(
    'apps/api/src/infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.ts',
    units
  );

  assert.deepEqual(
    matches.map((unit) => unit.id),
    ['SYS-PLANSTORE-API-COMPOSITION']
  );
});

test('buildOwnerMatcher returns reusable ownership matches and honors excludes', () => {
  const units = [
    {
      id: 'SYS-API-ROOT',
      owns: ['apps/api/**'],
      excludes: ['apps/api/src/infrastructure/startRun/**'],
    },
    {
      id: 'SYS-PLANSTORE-API-COMPOSITION',
      owns: ['apps/api/src/infrastructure/startRun/**'],
    },
  ];

  const ownerMatcher = buildOwnerMatcher(units);

  assert.deepEqual(
    ownerMatcher('apps/api/src/main.ts').map((unit) => unit.id),
    ['SYS-API-ROOT']
  );
  assert.deepEqual(
    ownerMatcher('apps/api/src/infrastructure/startRun/resolver.ts').map((unit) => unit.id),
    ['SYS-PLANSTORE-API-COMPOSITION']
  );
});

test('validateManifest passes when every tracked file has exactly one owner and a valid parent chain', () => {
  const result = validateManifest(manifest(), fixtureFiles);

  assert.deepEqual(result.errors, []);
});

test('validateManifest allows component assemblies to contain child components', () => {
  const result = validateManifest(
    manifest({
      units: [
        ...manifest().units.map((unit) =>
          unit.id === 'SYS-API-ROOT' ? { ...unit, owns: [], childrenRequired: true } : unit
        ),
        {
          id: 'SYS-API-HTTP-ENTRYPOINTS',
          parent: 'SYS-API-ROOT',
          level: 'component',
          status: 'coverage-required',
          owns: ['apps/api/src/server.ts'],
          childrenRequired: false,
        },
      ],
    }),
    fixtureFiles
  );

  assert.deepEqual(result.errors, []);
});

test('validateManifest fails when a canonical component lacks semantic metadata', () => {
  const result = validateManifest(
    manifest({
      units: [
        ...manifest().units,
        {
          id: 'SYS-EXAMPLE-LEAF',
          name: 'Example leaf',
          parent: 'SYS-DVT',
          level: 'component',
          status: 'canonical',
          owns: [],
          childrenRequired: false,
        },
      ],
    }),
    fixtureFiles
  );

  assert.match(result.errors.join('\n'), /SYS-EXAMPLE-LEAF is canonical but missing ownedConcern/);
});

test('validateManifest fails when a tracked file has no owning unit', () => {
  const result = validateManifest(manifest(), [...fixtureFiles, 'apps/unknown/src/index.ts']);

  assert.match(result.errors.join('\n'), /has no owning governance unit/);
});

test('validateManifest fails when ownership patterns overlap', () => {
  const result = validateManifest(
    manifest({
      units: [
        ...manifest().units,
        {
          id: 'SYS-API-DUPLICATE',
          parent: 'SYS-DVT',
          level: 'workspace',
          status: 'review',
          owns: ['apps/api/src/**'],
          childrenRequired: true,
        },
      ],
    }),
    fixtureFiles
  );

  assert.match(result.errors.join('\n'), /has multiple owning governance units/);
});

test('validateManifest fails when excludes are declared without ownership', () => {
  const result = validateManifest(
    manifest({
      units: [
        ...manifest().units,
        {
          id: 'SYS-API-EXCLUDE-ONLY',
          parent: 'SYS-API',
          level: 'component',
          status: 'review',
          excludes: ['apps/api/**'],
          childrenRequired: false,
        },
      ],
    }),
    fixtureFiles
  );

  assert.match(result.errors.join('\n'), /excludes files but has no owns patterns/);
});

test('validateManifest fails when a child unit has no valid parent', () => {
  const broken = manifest({
    units: manifest().units.map((unit) =>
      unit.id === 'SYS-API' ? { ...unit, parent: 'SYS-MISSING' } : unit
    ),
  });

  const result = validateManifest(broken, fixtureFiles);

  assert.match(result.errors.join('\n'), /SYS-API references missing parent SYS-MISSING/);
});

test('validateManifest reports invalid unit levels without throwing', () => {
  const broken = manifest({
    units: manifest().units.map((unit) =>
      unit.id === 'SYS-API' ? { ...unit, level: 'not-a-level' } : unit
    ),
  });

  assert.doesNotThrow(() => validateManifest(broken, fixtureFiles));

  const result = validateManifest(broken, fixtureFiles);

  assert.match(result.errors.join('\n'), /Unit SYS-API has invalid level not-a-level/);
});

test('validateManifest fails when source units skip the component parent level', () => {
  const result = validateManifest(
    manifest({
      units: [
        ...manifest().units,
        {
          id: 'SYS-WEB-ADMIN-VIEW-SOURCE',
          parent: 'SYS-WEB',
          level: 'source',
          status: 'review',
          owns: [],
          childrenRequired: false,
        },
      ],
    }),
    fixtureFiles
  );

  assert.match(
    result.errors.join('\n'),
    /source unit SYS-WEB-ADMIN-VIEW-SOURCE must have a component parent/
  );
});

test('real manifest subdivides API files below the API root module', () => {
  const realManifest = readManifest();
  const units = realManifest.units;
  const apiRoot = units.find((unit) => unit.id === 'SYS-API-ROOT');

  assert.equal(apiRoot.level, 'module');
  assert.deepEqual(apiRoot.owns || [], []);

  assert.deepEqual(
    findOwnerMatches('apps/api/src/entrypoints/http/startRunRoute.ts', units).map(
      (unit) => unit.id
    ),
    ['SYS-API-HTTP-ENTRYPOINTS']
  );
  assert.deepEqual(
    findOwnerMatches('apps/api/src/application/services/cancelRunUseCase.ts', units).map(
      (unit) => unit.id
    ),
    ['SYS-API-APPLICATION-SERVICES']
  );
  assert.deepEqual(
    findOwnerMatches('apps/api/test/entrypoints/http/startRunRoute.test.ts', units).map(
      (unit) => unit.id
    ),
    ['SYS-API-HTTP-ENTRYPOINT-TESTS']
  );
});

test('real manifest keeps API route registrars under planned API components', () => {
  const realManifest = readManifest();
  const units = realManifest.units;
  const routeRegistrationPlan =
    'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md';

  const operationalOwner = findOwnerMatches(
    'apps/api/src/routes/registerOperationalRoutes.ts',
    units
  )[0];
  const operationalParent = units.find((unit) => unit.id === operationalOwner.parent);
  const protectedRuntimeOwner = findOwnerMatches(
    'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts',
    units
  )[0];

  assert.equal(operationalOwner.id, 'SYS-API-OPS-HEALTH');
  assert.equal(operationalParent.id, 'SYS-API-OPS-ROUTES');
  assert.equal(protectedRuntimeOwner.id, 'SYS-API-HTTP-ENTRYPOINTS');
  assert.match(operationalOwner.name, /routes/i);
  assert.match(operationalParent.name, /routes/i);
  assert.match(protectedRuntimeOwner.name, /entrypoints/i);
  assert.ok(operationalParent.governance.includes(routeRegistrationPlan));
  assert.ok(protectedRuntimeOwner.governance.includes(routeRegistrationPlan));
});

test('real manifest subdivides runtime package files below the runtime root module', () => {
  const realManifest = readManifest();
  const units = realManifest.units;
  const runtimeRoot = units.find((unit) => unit.id === 'SYS-RUNTIME-ROOT');

  assert.equal(runtimeRoot.level, 'module');
  assert.deepEqual(runtimeRoot.owns || [], []);

  assert.deepEqual(
    findOwnerMatches('packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts', units).map(
      (unit) => unit.id
    ),
    ['SYS-RUNTIME-ENGINE-CORE-LIFECYCLE']
  );
  assert.deepEqual(
    findOwnerMatches(
      'packages/@dvt/engine/src/application/StartRunApplicationService.ts',
      units
    ).map((unit) => unit.id),
    ['SYS-RUNTIME-ENGINE-APPLICATION']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/state-store/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-STATE-STORE']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/delivery/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-DELIVERY']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/run-domain/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-RUN-DOMAIN']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/plan-interpreter/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-PLAN-INTERPRETATION']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/plan-verifier/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-PLAN-VERIFICATION']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/crypto/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-DETERMINISM-UTILITIES']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/dsl/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-DSL']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/cli/src/index.ts', units).map((unit) => unit.id),
    ['SYS-RUNTIME-CLI-VALIDATION']
  );
  assert.deepEqual(
    findOwnerMatches('packages/@dvt/engine/src/security/planRefPolicy.ts', units).map(
      (unit) => unit.id
    ),
    ['SYS-PLANSTORE-ENGINE-FETCH']
  );
});
