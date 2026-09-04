import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const contexts = registry.contexts ?? [];

if (!Array.isArray(contexts) || contexts.length === 0) {
  throw new Error('Context registry is empty');
}

const git = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trimEnd();

const baselineRef = registry.baselineRef || registry.baselineSha;
if (!baselineRef) throw new Error('Context registry must define baselineRef or baselineSha');
const baselineSha = git(['rev-parse', baselineRef]);
git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const previewDir = join(repoRoot, '.source-first-likec4-preview');
const evidenceDir = join(repoRoot, '.architecture-evidence');
rmSync(previewDir, { recursive: true, force: true });
rmSync(evidenceDir, { recursive: true, force: true });
mkdirSync(previewDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });
copyFileSync(join(architectureDir, 'specification.c4'), join(previewDir, 'specification.c4'));

for (const context of contexts) {
  const baselineConfigPath = join(contextsDir, `${context}-source-baseline.json`);
  const baselineConfig = JSON.parse(readFileSync(baselineConfigPath, 'utf8'));

  execFileSync(
    process.execPath,
    [join(architectureDir, 'tools', 'generate-source-first-context.mjs'), context],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, DVT_ARCH_BASELINE_SHA: baselineSha },
    },
  );

  const logicalSource = readFileSync(join(architectureDir, `${context}.c4`), 'utf8');
  writeFileSync(
    join(previewDir, `${context}.c4`),
    pinLogicalModel(logicalSource, baselineConfig.baselineSha, baselineSha),
  );
  copyFileSync(
    join(generatedDir, `${context}-source.c4`),
    join(previewDir, `${context}-source.c4`),
  );

  for (const suffix of ['inventory.json', 'source.c4']) {
    copyFileSync(
      join(generatedDir, `${context}-${suffix}`),
      join(evidenceDir, `${context}-${suffix}`),
    );
  }
  for (const suffix of ['components.json', 'source-baseline.json']) {
    copyFileSync(
      join(contextsDir, `${context}-${suffix}`),
      join(evidenceDir, `${context}-${suffix}`),
    );
  }
}

execFileSync(
  process.execPath,
  [join(architectureDir, 'tools', 'generate-context-dependency-landscape.mjs')],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DVT_ARCH_BASELINE_SHA: baselineSha },
  },
);
copyFileSync(
  join(generatedDir, 'context-dependencies.c4'),
  join(previewDir, 'context-dependencies.c4'),
);
copyFileSync(
  join(generatedDir, 'context-dependencies.json'),
  join(evidenceDir, 'context-dependencies.json'),
);
copyFileSync(join(contextsDir, 'registry.json'), join(evidenceDir, 'registry.json'));

writeFileSync(
  join(evidenceDir, 'resolved-baseline.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      baselineRef,
      baselineSha,
      previousValidatedSha: registry.lastValidatedSha ?? null,
      resolvedBy: 'git-rev-parse',
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(previewDir, 'likec4.config.json'),
  JSON.stringify(
    {
      $schema: 'https://likec4.dev/schemas/config.json',
      name: 'dvt-source-first-architecture-spike',
      title: 'DVT+ — Source-first architecture',
      metadata: {
        status: 'manual-spike',
        repository: 'dunay2/dvt',
        baselineRef,
        baselineSha,
        contexts: contexts.join(','),
      },
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `Prepared source-first preview: ${contexts.length} contexts @ ${baselineSha} (${baselineRef})`,
);

function pinLogicalModel(source, configuredSha, resolvedSha) {
  if (!configuredSha || configuredSha === resolvedSha) return source;

  return source
    .split(configuredSha)
    .join(resolvedSha)
    .split(configuredSha.slice(0, 8))
    .join(resolvedSha.slice(0, 8));
}
