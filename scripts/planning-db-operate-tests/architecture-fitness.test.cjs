const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseArgs } = require('../planning-db-operate.cjs');
const {
  planArchitectureFitnessScanOperation,
  writePlannedArchitectureFitnessScanOperation,
} = require('../planning-db-operate.cjs');
const { runArchitectureFitnessScan } = require('../planning-db/architecture-fitness/scan.cjs');

test('parseArgs builds an architecture fitness scan command', () => {
  const command = parseArgs([
    'architecture-fitness',
    'scan',
    '--design',
    'design-21-component-architecture-fitness-dbfirst',
    '--scan',
    'scan-feature-21',
    '--root',
    '.',
    '--source-ref',
    'agent-prompt:21-component-architecture-fitness-dbfirst',
    '--source-content-sha256',
    'f'.repeat(64),
    '--actor',
    'codex',
  ]);

  assert.equal(command.kind, 'architecture_fitness_scan');
  assert.equal(command.designId, 'design-21-component-architecture-fitness-dbfirst');
  assert.equal(command.scanId, 'scan-feature-21');
  assert.equal(command.root, '.');
});

test('runArchitectureFitnessScan extracts imports and maps paths to existing components', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-architecture-fitness-'));
  fs.mkdirSync(path.join(rootDir, 'apps/web/src/app'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'packages/@dvt/contracts/src'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/package.json'),
    JSON.stringify({ name: '@dvt/web' })
  );
  fs.writeFileSync(
    path.join(rootDir, 'packages/@dvt/contracts/package.json'),
    JSON.stringify({ name: '@dvt/contracts' })
  );
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/src/app/App.ts'),
    [
      "import { ContractThing } from '@dvt/contracts';",
      "import { localValue } from './localValue';",
      'export const app = [ContractThing, localValue];',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/src/app/localValue.ts'),
    'export const localValue = 1;'
  );
  fs.writeFileSync(
    path.join(rootDir, 'packages/@dvt/contracts/src/index.ts'),
    'export const ContractThing = 1;'
  );

  const scan = runArchitectureFitnessScan({
    rootDir,
    scanId: 'scan-feature-21',
    designId: 'design-21-component-architecture-fitness-dbfirst',
    components: [
      {
        component_id: 'SYS-WEB',
        repo_path: 'apps/web/src',
      },
      {
        component_id: 'SYS-CONTRACTS',
        repo_path: 'packages/@dvt/contracts/src',
      },
    ],
    relations: [
      {
        relation_id: 'REL-WEB-CONTRACTS',
        source_component_id: 'SYS-WEB',
        target_component_id: 'SYS-CONTRACTS',
        relation_type: 'depends_on',
        status: 'approved',
      },
    ],
  });

  assert.equal(scan.observations.length, 2);
  assert.equal(
    scan.evaluations.some((evaluation) => evaluation.fitnessRuleId === 'DVT-ARCH-003'),
    true
  );
  assert.deepEqual(
    scan.observations.map((observation) => [
      observation.importLiteral,
      observation.sourceComponentId,
      observation.targetComponentId,
      observation.targetMappingState,
    ]),
    [
      ['@dvt/contracts', 'SYS-WEB', 'SYS-CONTRACTS', 'mapped'],
      ['./localValue', 'SYS-WEB', 'SYS-WEB', 'mapped'],
    ]
  );
});

test('runArchitectureFitnessScan keeps repeated imports as distinct observations', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-architecture-fitness-'));
  fs.mkdirSync(path.join(rootDir, 'apps/web/src/app'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'packages/@dvt/contracts/src'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'packages/@dvt/contracts/package.json'),
    JSON.stringify({ name: '@dvt/contracts' })
  );
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/src/app/App.ts'),
    [
      "import { ContractThing } from '@dvt/contracts';",
      "const lazy = () => import('@dvt/contracts');",
      'export const app = [ContractThing, lazy];',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(rootDir, 'packages/@dvt/contracts/src/index.ts'),
    'export const ContractThing = 1;'
  );

  const scan = runArchitectureFitnessScan({
    rootDir,
    scanId: 'scan-feature-21',
    designId: 'design-21-component-architecture-fitness-dbfirst',
    components: [
      {
        component_id: 'SYS-WEB',
        repo_path: 'apps/web/src',
      },
      {
        component_id: 'SYS-CONTRACTS',
        repo_path: 'packages/@dvt/contracts/src',
      },
    ],
    relations: [],
  });
  const observationIds = scan.observations.map((observation) => observation.observationId);

  assert.equal(scan.observations.length, 2);
  assert.equal(new Set(observationIds).size, observationIds.length);
});

test('runArchitectureFitnessScan ignores non-operational literature and prototype source copies', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-architecture-fitness-'));
  fs.mkdirSync(path.join(rootDir, 'apps/web/src/app'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'docs/archive/planning/snapshot'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'buzon'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'infra/prototypes/api/src'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/src/app/App.ts'),
    ["import { liveValue } from './liveValue';", 'export const app = liveValue;'].join('\n')
  );
  fs.writeFileSync(
    path.join(rootDir, 'apps/web/src/app/liveValue.ts'),
    'export const liveValue = 1;'
  );
  fs.writeFileSync(
    path.join(rootDir, 'docs/archive/planning/snapshot/Archived.ts'),
    "import { archived } from './ArchivedDependency';\nexport const value = archived;"
  );
  fs.writeFileSync(
    path.join(
      rootDir,
      'buzon/20260421-codex-fowler-branch-analysis-http-error-translation-stack.ts'
    ),
    "import { intake } from './IntakeDependency';\nexport const value = intake;"
  );
  fs.writeFileSync(
    path.join(rootDir, 'infra/prototypes/api/src/catchup.ts'),
    "import { prototype } from './prototypeDependency';\nexport const value = prototype;"
  );

  const scan = runArchitectureFitnessScan({
    rootDir,
    scanId: 'scan-feature-21',
    designId: 'design-21-component-architecture-fitness-dbfirst',
    components: [
      {
        component_id: 'SYS-WEB',
        repo_path: 'apps/web/src',
      },
    ],
    relations: [],
  });

  assert.deepEqual(
    scan.observations.map((observation) => observation.sourcePath),
    ['apps/web/src/app/App.ts']
  );
});

test('architecture fitness planner and writer persist scan facts with audit', async () => {
  const now = new Date('2026-06-10T12:00:00.000Z');
  const command = parseArgs([
    'architecture-fitness',
    'scan',
    '--design',
    'design-21-component-architecture-fitness-dbfirst',
    '--scan',
    'scan-feature-21',
    '--root',
    '.',
    '--source-ref',
    'agent-prompt:21-component-architecture-fitness-dbfirst',
    '--source-content-sha256',
    'f'.repeat(64),
    '--actor',
    'codex',
  ]);

  const planned = planArchitectureFitnessScanOperation({
    command,
    design: { design_id: command.designId, status: 'review' },
    scanResult: {
      scan: {
        scanId: command.scanId,
        designId: command.designId,
        scannerVersion: 'component-architecture-fitness-v1',
        scanState: 'evaluated',
      },
      observations: [
        {
          observationId: 'obs-web-contracts',
          scanId: command.scanId,
          sourcePath: 'apps/web/src/app/App.ts',
          targetPath: 'packages/@dvt/contracts/src/index.ts',
          importLiteral: '@dvt/contracts',
          workspaceName: '@dvt/web',
          packageName: '@dvt/contracts',
          sourceContentSha256: 'a'.repeat(64),
          isTest: false,
          sourceComponentId: 'SYS-WEB',
          targetComponentId: 'SYS-CONTRACTS',
          sourceMappingState: 'mapped',
          targetMappingState: 'mapped',
          mappingConfidence: 1,
          mappingReason: 'fixture maps both endpoints.',
          relationType: 'depends_on',
          metadata: { position: 1 },
        },
      ],
      evaluations: [
        {
          evaluationId: 'scan-feature-21-DVT-ARCH-003',
          scanId: command.scanId,
          fitnessRuleId: 'DVT-ARCH-003',
          subjectKind: 'scan',
          subjectId: command.scanId,
          resultState: 'pass',
          severity: 'info',
          reason: 'Fixture dependency is declared.',
          evidence: {},
        },
      ],
    },
    operationId: 'op-architecture-fitness-scan',
    now,
  });
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };

  await writePlannedArchitectureFitnessScanOperation(client, planned);

  assert.equal(planned.scan.scanId, 'scan-feature-21');
  assert.equal(planned.audit.operationType, 'architecture_fitness_scan');
  assert.ok(queries.some((query) => query.sql.includes('architecture.component_dependency_scan')));
  assert.ok(
    queries.some((query) => query.sql.includes('architecture.component_dependency_observation'))
  );
  assert.ok(
    queries.some((query) => query.sql.includes('architecture.component_fitness_evaluation'))
  );
  assert.ok(queries.some((query) => query.sql.includes('architecture.design_operations')));
});
