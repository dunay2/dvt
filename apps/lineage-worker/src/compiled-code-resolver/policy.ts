import { URL } from 'node:url';

import type { CompiledCodeRef } from '@dvt/contracts';
import {
  CompiledCodeReaderError,
  FileUriCompiledCodeReader,
  type CompiledCodeBlob,
  type ICompiledCodeReader,
  LINEAGE_ERROR_REASON_CODE,
} from '@dvt/traceability-service';

import type { Env } from '../env.js';

import type {
  CompiledCodeResolverBackend,
  CompiledCodeResolverEnv,
  S3ResolverEnv,
} from './types.js';

export function createFileUriCompiledCodeReader(
  env: Pick<Env, 'NODE_ENV'>,
  delegate: ICompiledCodeReader = new FileUriCompiledCodeReader()
): ICompiledCodeReader {
  return new ProductionGuardedFileUriCompiledCodeReader(env.NODE_ENV, delegate);
}

export function validateCompiledCodeResolverConfiguration(
  env: CompiledCodeResolverEnv,
  backend: CompiledCodeResolverBackend,
  hasS3ReaderOverride: boolean
): void {
  if (backend === 'file') {
    if (env.NODE_ENV === 'production') {
      throw createProductionFileBackendProhibitedError();
    }

    return;
  }

  if (backend !== 's3') return;

  const hasS3Region = resolveS3Region(env) !== null;
  if (hasS3Region || hasS3ReaderOverride) return;

  throw new CompiledCodeReaderError({
    reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION,
    reason:
      'Missing S3 region for compiled code resolver. Set DVT_COMPILED_CODE_RESOLVER_S3_REGION, AWS_REGION, or AWS_DEFAULT_REGION.',
  });
}

export function resolveS3Region(env: S3ResolverEnv): string | null {
  return (
    env.DVT_COMPILED_CODE_RESOLVER_S3_REGION ??
    process.env['AWS_REGION'] ??
    process.env['AWS_DEFAULT_REGION'] ??
    null
  );
}

class ProductionGuardedFileUriCompiledCodeReader implements ICompiledCodeReader {
  constructor(
    private readonly nodeEnv: Env['NODE_ENV'],
    private readonly delegate: ICompiledCodeReader
  ) {}

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    if (this.nodeEnv === 'production' && isFileUri(ref.storageUri)) {
      throw createProductionFileUriProhibitedError(ref.storageUri);
    }

    return this.delegate.read(ref);
  }
}

function createProductionFileBackendProhibitedError(): CompiledCodeReaderError {
  return new CompiledCodeReaderError({
    reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_FILE_URI_PROHIBITED,
    reason:
      'Configured compiled-code backend "file" is not allowed in production. Use the s3 backend for deployed lineage workers.',
  });
}

function createProductionFileUriProhibitedError(storageUri: string): CompiledCodeReaderError {
  return new CompiledCodeReaderError({
    reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_FILE_URI_PROHIBITED,
    reason:
      'file:// compiled-code URIs are not allowed in production. Publish compiled code to object storage and resolve it through s3://.',
    sourceUri: storageUri,
  });
}

function isFileUri(uri: string): boolean {
  try {
    return new URL(uri).protocol === 'file:';
  } catch {
    return false;
  }
}
