import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const registry = JSON.parse(readFileSync(join(architectureDir, 'contexts', 'registry.json'), 'utf8'));
const contexts = registry.contexts ?? [];
if (!Array.isArray(contexts) || contexts.length === 0) throw new Error('Context registry is empty');

const previewDir = join(repoRoot, '.source-first-likec4-preview');
const evidenceDir = join(repoRoot, '.architecture-evidence');
rmSync(previewDir, { recursive: true, force: true });
rmSync(evidenceDir, { recursive: true, force: true });
mkdirSync(previewDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });
copyFileSync(join(architectureDir, 'specification.c4'), join(previewDir, 'specification.c4'));

for (const context of contexts) {
  execFileSync(process.execPath, [join(architectureDir, 'tools', 'generate-source-first-context.mjs'), context], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  copyFileSync(join(architectureDir, `${context}.c4`), join(previewDir, `${context}.c4`));
  copyFileSync(join(architectureDir, 'generated', `${context}-source.c4`), join(previewDir, `${context}-source.c4`));
  for (const suffix of ['inventory.json', 'source.c4']) {
    copyFileSync(join(architectureDir, 'generated', `${context}-${suffix}`), join(evidenceDir, `${context}-${suffix}`));
  }
  for (const suffix of ['components.json', 'source-baseline.json']) {
    copyFileSync(join(architectureDir, 'contexts', `${context}-${suffix}`), join(evidenceDir, `${context}-${suffix}`));
  }

  const baseline = JSON.parse(readFileSync(join(architectureDir, 'contexts', `${context}-source-baseline.json`), 'utf8'));
  if (baseline.baselineSha !== registry.baselineSha) {
    throw new Error(`${context} baseline ${baseline.baselineSha} differs from registry baseline ${registry.baselineSha}`);
  }
}

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
        baselineSha: registry.baselineSha,
        contexts: contexts.join(','),
      },
    },
    null,
    2,
  ) + '\n',
);

console.log(`Prepared source-first preview: ${contexts.length} contexts @ ${registry.baselineSha}`);
