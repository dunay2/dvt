/** Owned concern: encode a deterministic POSIX tar.gz from an immutable DBT snapshot. */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';

const TAR_BLOCK_SIZE = 512;

type ArchiveFile = Readonly<{ relativePath: string; bytes: Buffer }>;

export async function createDbtProjectTarArchive(snapshotDirectory: string): Promise<
  Readonly<{
    bytes: Buffer;
    sha256: string;
  }>
> {
  const files = await listArchiveFiles(snapshotDirectory);
  const tarBytes = Buffer.concat([...createTarEntries(files), Buffer.alloc(TAR_BLOCK_SIZE * 2, 0)]);
  const bytes = await gzipDeterministically(tarBytes);
  return {
    bytes,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function listArchiveFiles(snapshotDirectory: string): Promise<readonly ArchiveFile[]> {
  const files: ArchiveFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        files.push({
          relativePath: path.relative(snapshotDirectory, absolutePath).replaceAll('\\', '/'),
          bytes: await readFile(absolutePath),
        });
      } else {
        throw new Error('The DBT source snapshot contains an unsupported file-system entry.');
      }
    }
  }

  await visit(snapshotDirectory);
  return files;
}

function createTarEntries(files: readonly ArchiveFile[]): readonly Buffer[] {
  const entries: Buffer[] = [];
  const directories = new Set<string>(['bundle/']);
  for (const file of files) {
    let current = 'bundle';
    for (const segment of path.posix.dirname(file.relativePath).split('/')) {
      if (segment === '.') continue;
      current = `${current}/${segment}`;
      directories.add(`${current}/`);
    }
  }

  for (const directory of [...directories].sort((left, right) => left.localeCompare(right))) {
    entries.push(createTarHeader(directory, 0, '5'));
  }
  for (const file of files) {
    entries.push(createTarHeader(`bundle/${file.relativePath}`, file.bytes.byteLength, '0'));
    entries.push(file.bytes);
    entries.push(Buffer.alloc(padToTarBlock(file.bytes.byteLength), 0));
  }
  return entries;
}

function createTarHeader(archivePath: string, size: number, type: '0' | '5'): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE, 0);
  const { name, prefix } = splitUstarPath(archivePath);
  writeTarString(header, name, 0, 100);
  writeTarOctal(header, type === '5' ? 0o755 : 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  writeTarString(header, type, 156, 1);
  writeTarString(header, 'ustar', 257, 6);
  writeTarString(header, '00', 263, 2);
  writeTarString(header, prefix, 345, 155);
  writeTarOctal(
    header,
    header.reduce((checksum, value) => checksum + value, 0),
    148,
    8
  );
  return header;
}

function splitUstarPath(archivePath: string): Readonly<{ name: string; prefix: string }> {
  if (Buffer.byteLength(archivePath, 'utf8') <= 100) {
    return { name: archivePath, prefix: '' };
  }
  for (let separator = archivePath.lastIndexOf('/'); separator > 0;) {
    const prefix = archivePath.slice(0, separator);
    const name = archivePath.slice(separator + 1);
    if (Buffer.byteLength(prefix, 'utf8') <= 155 && Buffer.byteLength(name, 'utf8') <= 100) {
      return { name, prefix };
    }
    separator = archivePath.lastIndexOf('/', separator - 1);
  }
  throw new Error('DBT project archive path exceeds the supported USTAR path length.');
}

function writeTarString(header: Buffer, value: string, offset: number, length: number): void {
  const rendered = Buffer.from(value, 'utf8');
  if (rendered.byteLength > length) {
    throw new Error('DBT project archive field exceeds the supported USTAR length.');
  }
  rendered.copy(header, offset);
}

function writeTarOctal(header: Buffer, value: number, offset: number, length: number): void {
  const rendered = `${value.toString(8).padStart(length - 2, '0')}\0 `;
  header.write(rendered.slice(0, length), offset, length, 'ascii');
}

function padToTarBlock(size: number): number {
  const remainder = size % TAR_BLOCK_SIZE;
  return remainder === 0 ? 0 : TAR_BLOCK_SIZE - remainder;
}

function gzipDeterministically(bytes: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    gzip(bytes, { level: 9 }, (error, compressed) => {
      if (error) reject(error);
      else resolve(compressed);
    });
  });
}
