import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { CompiledCodeRef } from '@dvt/contracts';

import { sha256HexUtf8 } from '../compiledCodeRef.js';
import type { ICompiledCodeReader } from '../contracts.js';
import { LINEAGE_ERROR_REASON_CODE } from '../errorContract.js';
import {
  CompiledCodeNotFoundError,
  CompiledCodeReaderError,
  CompiledCodeUnsupportedSchemeError,
} from '../errors.js';
import type { CompiledCodeBlob } from '../types.js';

export class FileUriCompiledCodeReader implements ICompiledCodeReader {
  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    if (!ref.storageUri.startsWith('file://')) {
      throw new CompiledCodeUnsupportedSchemeError({
        actualScheme: getUriScheme(ref.storageUri),
        expectedScheme: 'file',
        storageUri: ref.storageUri,
      });
    }

    try {
      const absolutePath = fileURLToPath(ref.storageUri);
      const sqlText = await readFile(absolutePath, { encoding: 'utf8' });
      return {
        sourceUri: ref.storageUri,
        sqlText,
        sha256: sha256HexUtf8(sqlText),
        sizeBytes: Buffer.byteLength(sqlText, 'utf8'),
        encoding: 'utf-8',
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new CompiledCodeNotFoundError({
          cause: error,
          storageUri: ref.storageUri,
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new CompiledCodeReaderError({
        cause: error,
        reason: message,
        reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
        sourceUri: ref.storageUri,
      });
    }
  }
}

function getUriScheme(uri: string): string {
  const separator = uri.indexOf(':');
  if (separator <= 0) return 'unknown';
  return uri.slice(0, separator).toLowerCase();
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ((error as Error & { code?: unknown }).code === 'ENOENT' ||
      (error as Error & { code?: unknown }).code === 'ENOTDIR')
  );
}
