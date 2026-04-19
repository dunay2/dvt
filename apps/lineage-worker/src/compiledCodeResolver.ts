import {
  CachedRetryCompiledCodeResolver,
  CompositeCompiledCodeReader,
  InMemoryCompiledCodeCache,
  SqlJobFacetBuilder,
  StepStartedLineageMapper,
  type ICompiledCodeReader,
  type ICompiledCodeResolver,
} from '@dvt/traceability-service';

import { createFileUriCompiledCodeReader, validateCompiledCodeResolverConfiguration } from './compiled-code-resolver/policy.js';
import { createS3UriCompiledCodeReader } from './compiled-code-resolver/S3UriCompiledCodeReader.js';
import type {
  CompiledCodeResolverEnv,
  CompiledCodeResolverOptions,
} from './compiled-code-resolver/types.js';

export type { CompiledCodeResolverBackend, CompiledCodeResolverOptions } from './compiled-code-resolver/types.js';

export function createCompiledCodeResolver(
  env: CompiledCodeResolverEnv,
  options: CompiledCodeResolverOptions = {}
): ICompiledCodeResolver {
  const reader = createCompiledCodeReader(env, options);
  const cache = options.cache ?? new InMemoryCompiledCodeCache();

  return new CachedRetryCompiledCodeResolver({
    reader,
    cache,
    ...(options.retryPolicy ? { retryPolicy: options.retryPolicy } : {}),
  });
}

export function createStepStartedLineageMapper(
  env: CompiledCodeResolverEnv,
  options: CompiledCodeResolverOptions = {}
): StepStartedLineageMapper {
  return new StepStartedLineageMapper({
    compiledCodeResolver: createCompiledCodeResolver(env, options),
    sqlFacetBuilder: new SqlJobFacetBuilder(),
  });
}

function createCompiledCodeReader(
  env: CompiledCodeResolverEnv,
  options: CompiledCodeResolverOptions
): ICompiledCodeReader {
  const backend = options.backend ?? env.DVT_COMPILED_CODE_RESOLVER_BACKEND;
  validateCompiledCodeResolverConfiguration(
    env,
    backend,
    options.readerOverrides?.has('s3') ?? false
  );
  const fileReader = createFileUriCompiledCodeReader(env, options.readerOverrides?.get('file'));
  const s3Reader = options.readerOverrides?.get('s3') ?? createS3UriCompiledCodeReader(env);

  if (backend === 'file') return fileReader;
  if (backend === 's3') return s3Reader;

  const readersByScheme = new Map<string, ICompiledCodeReader>([
    ['file', fileReader],
    ['s3', s3Reader],
  ]);

  for (const [scheme, reader] of options.readerOverrides ?? []) {
    if (!readersByScheme.has(scheme)) {
      readersByScheme.set(scheme, reader);
    }
  }

  return new CompositeCompiledCodeReader(readersByScheme);
}
