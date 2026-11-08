/** Owned concern: keep one installed dismissal authority for composed Web overlays. */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageMetadata = {
  name: string;
  dependencies?: Record<string, string>;
};
type InstalledPackage = { directory: string; entry: string; metadata: PackageMetadata };

function readInstalledPackage(
  parentRequire: ReturnType<typeof createRequire>,
  name: string
): InstalledPackage {
  const entry = realpathSync(parentRequire.resolve(name));
  let directory = dirname(entry);
  while (directory !== dirname(directory)) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const metadata = JSON.parse(readFileSync(manifest, 'utf8')) as PackageMetadata;
      if (metadata.name === name) return { directory, entry, metadata };
    }
    directory = dirname(directory);
  }
  throw new Error(`Installed package metadata not found for ${name}`);
}

describe('Overlay primitive composition', () => {
  it('shares one physical dismissal layer across all declared Radix overlay consumers', () => {
    // Separate layer contexts let a closing Tooltip consume Escape before an active Dialog.
    const manifestUrl = new URL('../../package.json', import.meta.url);
    const web = JSON.parse(readFileSync(manifestUrl, 'utf8')) as PackageMetadata;
    const webRequire = createRequire(manifestUrl);
    const visited = new Set<string>();
    const layers = new Set<string>();
    const visit = (installed: InstalledPackage): void => {
      if (visited.has(installed.directory)) return;
      visited.add(installed.directory);
      if (installed.metadata.name === '@radix-ui/react-dismissable-layer') {
        layers.add(installed.directory);
        return;
      }
      const requireFromPackage = createRequire(installed.entry);
      for (const name of Object.keys(installed.metadata.dependencies ?? {})) {
        if (name.startsWith('@radix-ui/')) visit(readInstalledPackage(requireFromPackage, name));
      }
    };
    for (const name of Object.keys(web.dependencies ?? {})) {
      if (name.startsWith('@radix-ui/')) visit(readInstalledPackage(webRequire, name));
    }
    expect([...layers], 'Composed overlays require one shared layer ordering').toHaveLength(1);
  });
});
