/**
 * @ownedConcern Map StepStarted generic artifact references to lineage facets without owning artifact I/O.
 */
import { readVerifiedArtifactBytes, type ArtifactReadRuntimeOptions } from '@dvt/artifacts';
import { StepArtifactRefSchema, type EventEnvelope, type StepArtifactRef } from '@dvt/contracts';

import type { ILineageStepEventMapper, ISqlJobFacetBuilder } from '../contracts.js';
import type { LineageJobFacets, LineageWarning } from '../types.js';

import { mapArtifactReadWarning } from './mapArtifactReadWarning.js';

const COMPILED_SQL_ARTIFACT_KIND = 'compiled-sql';

export interface StepStartedLineageMapperDeps {
  artifactReadOptions?: ArtifactReadRuntimeOptions;
  sqlFacetBuilder: ISqlJobFacetBuilder;
}

export class StepStartedLineageMapper implements ILineageStepEventMapper {
  constructor(private readonly deps: StepStartedLineageMapperDeps) {}

  supports(event: EventEnvelope): boolean {
    return event.eventType === 'StepStarted';
  }

  async map(
    event: EventEnvelope
  ): Promise<{ jobFacets: LineageJobFacets; warnings: LineageWarning[] }> {
    if (!this.supports(event)) return { jobFacets: {}, warnings: [] };

    const artifactRef = extractStepArtifactRef(event.payload);
    if (artifactRef === null || artifactRef.artifactKind !== COMPILED_SQL_ARTIFACT_KIND) {
      return { jobFacets: {}, warnings: [] };
    }

    try {
      const bytes = await readVerifiedArtifactBytes(artifactRef, {
        artifactLabel: 'lineage source',
        uriLabel: 'stepArtifactRef.storageUri',
        ...this.deps.artifactReadOptions,
      });
      return {
        jobFacets: {
          sql: this.deps.sqlFacetBuilder.fromSql(Buffer.from(bytes).toString('utf8')),
        },
        warnings: [],
      };
    } catch (error) {
      return {
        jobFacets: {},
        warnings: [mapArtifactReadWarning({ error, ref: artifactRef })],
      };
    }
  }
}

function extractStepArtifactRef(
  payload: Record<string, unknown> | undefined
): StepArtifactRef | null {
  const candidate = payload?.['stepArtifactRef'];
  const parsed = StepArtifactRefSchema.safeParse(candidate);
  if (!parsed.success) return null;

  const { encoding, ...requiredRef } = parsed.data;
  return {
    ...requiredRef,
    ...(encoding === undefined ? {} : { encoding }),
  };
}
