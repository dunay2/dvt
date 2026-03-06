import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { CompiledCodeRef } from '@dvt/contracts';

import { sha256HexUtf8 } from '../compiledCodeRef.js';
import type { ICompiledCodeReader } from '../contracts.js';
import { CompiledCodeReaderError, CompiledCodeUnsupportedSchemeError } from '../errors.js';
import type { CompiledCodeBlob } from '../types.js';

export class FileUriCompiledCodeReader implements ICompiledCodeReader {
  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    if (!ref.storageUri.startsWith('file://')) {
      throw new CompiledCodeUnsupportedSchemeError(
        `FileUriCompiledCodeReader only supports file:// URIs: ${ref.storageUri}`
      );
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
      const message = error instanceof Error ? error.message : String(error);
      throw new CompiledCodeReaderError(
        `Failed to read compiled code from URI ${ref.storageUri}: ${message}`
      );
    }
  }
}
