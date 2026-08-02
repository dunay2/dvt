import { mkdir, mkdtemp, open, readFile, rm, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  writeImmutableFileArtifact,
  type ImmutableFileArtifactIo,
} from '../../../src/infrastructure/dbt/immutableFileArtifactWriter.js';

let root: string | undefined;

describe('writeImmutableFileArtifact', () => {
  afterEach(async () => {
    if (root !== undefined) await rm(root, { recursive: true, force: true });
    root = undefined;
  });

  it('removes a partial destination created by a failed write so the retry can succeed', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-immutable-artifact-'));
    const artifactPath = path.join(root, 'contexts', 'run.json');
    const bytes = Buffer.from('{"trusted":true}', 'utf8');
    const failingIo: ImmutableFileArtifactIo = {
      mkdir,
      readFile,
      unlink,
      open: (async (...args: Parameters<typeof open>) => {
        const handle = await open(...args);
        return {
          async write(buffer: Buffer, offset: number) {
            await handle.write(buffer, offset, 1, null);
            throw new Error('simulated write failure');
          },
          close: () => handle.close(),
        } as unknown as Awaited<ReturnType<typeof open>>;
      }) as typeof open,
    };

    await expect(writeImmutableFileArtifact(artifactPath, bytes, failingIo)).rejects.toThrow(
      'simulated write failure'
    );
    await expect(stat(artifactPath)).rejects.toMatchObject({ code: 'ENOENT' });

    await expect(writeImmutableFileArtifact(artifactPath, bytes)).resolves.toBeUndefined();
    await expect(readFile(artifactPath)).resolves.toEqual(bytes);
  });
});
