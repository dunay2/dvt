import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { collectAdapterCanonicalContractFindings } from './check-architecture-dependencies.mjs';
import verifyPrepush from '../../scripts/verify-prepush.cjs';

const DEPCRUISE_CONFIG = resolve('.dependency-cruiser.cjs');
const REQUIRED_ARCH_DEPENDENCY_RULES = [
  'no-contracts-to-dvt-runtime',
  'no-planner-to-engine-or-adapters',
  'no-engine-to-concrete-adapters',
  'no-adapters-to-contract-internals',
  'no-web-to-backend-adapters',
  'no-presentation-to-infrastructure',
  'no-domain-to-framework-or-infrastructure',
  'no-dvt-package-cycles',
  'no-cross-package-deep-imports',
  'no-runtime-packages-to-scripts-or-tools',
];
const REQUIRED_SEMANTIC_ARCHITECTURE_RULES = ['no-adapters-own-canonical-contracts'];
const REQUIRED_ARCH_DEPENDENCY_COMMANDS = ['pnpm arch:deps'];
const DEPCRUISE_BIN = resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs');

const DEPENDENCY_RULE_FIXTURES = [
  {
    ruleName: 'no-contracts-to-dvt-runtime',
    files: {
      'packages/@dvt/contracts/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-planner-to-engine-or-adapters',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-engine-to-concrete-adapters',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import adapter from '../../adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-adapters-to-contract-internals',
    files: {
      'packages/@dvt/adapter-postgres/src/index.ts':
        "import internalContract from '../../contracts/src/internal.js'; export default internalContract;\n",
      'packages/@dvt/contracts/src/internal.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-web-to-backend-adapters',
    files: {
      'apps/web/src/index.ts':
        "import adapter from '../../../packages/@dvt/adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-presentation-to-infrastructure',
    files: {
      'apps/web/src/capability/presentation/view.ts':
        "import client from '../infrastructure/client.js'; export default client;\n",
      'apps/web/src/capability/infrastructure/client.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-domain-to-framework-or-infrastructure',
    files: {
      'apps/web/src/capability/domain/model.ts':
        "import { readFileSync } from 'node:fs'; export default readFileSync;\n",
    },
  },
  {
    ruleName: 'no-dvt-package-cycles',
    files: {
      'packages/@dvt/engine/src/a.ts': "import b from './b.js'; export default b;\n",
      'packages/@dvt/engine/src/b.ts': "import a from './a.js'; export default a;\n",
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '@dvt/contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '../../contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-runtime-packages-to-scripts-or-tools',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import tool from '../../../../tools/runtime-helper.js'; export default tool;\n",
      'tools/runtime-helper.js': 'export default 1;\n',
    },
  },
];

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readCruiserConfig() {
  return createRequire(import.meta.url)('../../.dependency-cruiser.cjs');
}

function extractForbiddenRuleNames(config) {
  return new Set((config.forbidden ?? []).map((rule) => rule.name));
}

function writeFixtureFiles(root, files) {
  for (const [filePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }
}

function writeTsConfig(root) {
  writeFixtureFiles(root, {
    'tsconfig.json': `${JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@dvt/*': ['packages/@dvt/*'],
          '@dvt/*/*': ['packages/@dvt/*/*'],
        },
      },
    })}\n`,
  });
}

function collectDependencyViolations(files) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-architecture-deps-'));
  try {
    for (const target of ['apps', 'packages', 'tools']) {
      mkdirSync(join(fixtureRoot, target), { recursive: true });
    }
    writeTsConfig(fixtureRoot);
    writeFixtureFiles(fixtureRoot, files);

    const result = spawnSync(
      process.execPath,
      [
        DEPCRUISE_BIN,
        'apps',
        'packages',
        'tools',
        '--config',
        DEPCRUISE_CONFIG,
        '--output-type',
        'json',
      ],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );

    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);

    return JSON.parse(result.stdout).summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('root package exposes the architecture dependency guard', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.devDependencies?.['dependency-cruiser'], '17.3.9');
  assert.equal(pkg.scripts?.['arch:deps'], 'node tools/ci/check-architecture-dependencies.mjs');
  assert.equal(pkg.scripts?.['verify:prepush'], 'node scripts/verify-prepush.cjs');
  assert.ok(
    verifyPrepush
      .buildPrepushPlan(['apps/web/src/main.tsx'])
      .some((step) => step.id === 'arch-deps')
  );
  assert.match(pkg.scripts?.['ci:code'] ?? '', /pnpm arch:deps/);
});

test('PR quality gate runs the architecture dependency guard remotely', () => {
  const workflow = readText('.github/workflows/pr-quality-gate.yml');

  for (const command of REQUIRED_ARCH_DEPENDENCY_COMMANDS) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('root dependency-cruiser config declares the initial Fowler boundary rules', () => {
  const ruleNames = extractForbiddenRuleNames(readCruiserConfig());

  for (const ruleName of REQUIRED_ARCH_DEPENDENCY_RULES) {
    assert.ok(ruleNames.has(ruleName), `missing architecture dependency rule: ${ruleName}`);
  }
});

test('dependency-cruiser boundary rules fail for representative negative imports', () => {
  for (const fixture of DEPENDENCY_RULE_FIXTURES) {
    const violations = collectDependencyViolations(fixture.files);
    assert.ok(
      violations.includes(fixture.ruleName),
      `expected ${fixture.ruleName} to fail; got ${violations.join(', ')}`
    );
  }
});

test('semantic architecture guard rejects adapter-owned canonical contract definitions', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-adapter-contracts-'));
  try {
    writeFixtureFiles(fixtureRoot, {
      'packages/@dvt/adapter-postgres/src/contracts/PostgresRunCommand.v1.ts':
        'export interface PostgresRunCommandV1 { readonly runId: string; }\n',
      'packages/@dvt/adapter-postgres/src/PostgresRunSchema.v1.ts':
        'export const PostgresRunSchemaV1 = {};\n',
    });

    const findings = collectAdapterCanonicalContractFindings(fixtureRoot);

    assert.deepEqual(
      new Set(findings.map((finding) => finding.ruleName)),
      new Set(REQUIRED_SEMANTIC_ARCHITECTURE_RULES)
    );
    assert.equal(findings.length, 2);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('repository adapters do not own canonical contract definitions', () => {
  assert.deepEqual(collectAdapterCanonicalContractFindings(process.cwd()), []);
});
