const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateManifest,
  findOwnerMatches,
  globToRegExp,
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

test('validateManifest passes when every tracked file has exactly one owner and a valid parent chain', () => {
  const result = validateManifest(manifest(), fixtureFiles);

  assert.deepEqual(result.errors, []);
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
