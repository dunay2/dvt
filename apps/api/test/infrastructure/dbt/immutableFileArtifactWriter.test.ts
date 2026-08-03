import { link, mkdir, mkdtemp, open, readFile, rm, stat, unlink } from 'node:fs/promises';
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

  it('publishes the final path only after the complete artifact is durable', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-immutable-artifact-'));
    const artifactPath = path.join(root, 'contexts', 'run.json');
    const bytes = Buffer.from('{"trusted":true}', 'utf8');
    const publishedPaths: string[] = [];
    const atomicIo: ImmutableFileArtifactIo = {
      mkdir,
      readFile,
      unlink,
      open: (async (...args: Parameters<typeof open>) => {
        expect(args[0]).not.toBe(artifactPath);
        return open(...args);
      }) as typeof open,
      link: (async (...args: Parameters<typeof link>) => {
        const [temporaryPath, destinationPath] = args;
        expect(destinationPath).toBe(artifactPath);
        await expect(readFile(temporaryPath)).resolves.toEqual(bytes);
        await expect(stat(destinationPath)).rejects.toMatchObject({ code: 'ENOENT' });
        await link(...args);
        publishedPaths.push(String(destinationPath));
      }) as typeof link,
    };

    await writeImmutableFileArtifact(artifactPath, bytes, atomicIo);

    expect(publishedPaths).toEqual([artifactPath]);
    await expect(readFile(artifactPath)).resolves.toEqual(bytes);
  });

  it('accepts an existing immutable artifact only when its content is identical', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-immutable-artifact-'));
    const artifactPath = path.join(root, 'contexts', 'run.json');
    const bytes = Buffer.from('{"trusted":true}', 'utf8');

    await writeImmutableFileArtifact(artifactPath, bytes);

    await expect(writeImmutableFileArtifact(artifactPath, bytes)).resolves.toBeUndefined();
    await expect(
      writeImmutableFileArtifact(artifactPath, Buffer.from('{"trusted":false}', 'utf8'))
    ).rejects.toThrow('already exists with different content');
    await expect(readFile(artifactPath)).resolves.toEqual(bytes);
  });

  it('removes a partial destination created by a failed write so the retry can succeed', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-immutable-artifact-'));
    const artifactPath = path.join(root, 'contexts', 'run.json');
    const bytes = Buffer.from('{"trusted":true}', 'utf8');
    const failingIo: ImmutableFileArtifactIo = {
      link,
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
          sync: () => handle.sync(),
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
