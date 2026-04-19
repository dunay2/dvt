import type { EventEnvelope } from '@dvt/contracts';

import { extractCompiledCodeRefFromPayload } from '../compiledCodeRef.js';
import type {
  ICompiledCodeResolver,
  ILineageStepEventMapper,
  ISqlJobFacetBuilder,
} from '../contracts.js';
import {
  buildLineageFacetMetadata,
  DVT_DBT_DETAILS_JOB_FACET_SCHEMA_URL,
} from '../openlineageSchema.js';
import type { LineageJobFacets, LineageWarning } from '../types.js';

import { mapCompiledCodeResolutionWarning } from './mapCompiledCodeResolutionWarning.js';

export interface StepStartedLineageMapperDeps {
  compiledCodeResolver: ICompiledCodeResolver;
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

    const compiledCodeRef = extractCompiledCodeRefFromPayload(event.payload);
    if (compiledCodeRef === null) return { jobFacets: {}, warnings: [] };

    const baseFacets: LineageJobFacets = {
      dvt_dbt_details: {
        ...buildLineageFacetMetadata(DVT_DBT_DETAILS_JOB_FACET_SCHEMA_URL),
        compiledCodeRef,
      },
    };

    try {
      const compiled = await this.deps.compiledCodeResolver.resolve(compiledCodeRef);
      return {
        jobFacets: {
          ...baseFacets,
          sql: this.deps.sqlFacetBuilder.fromSql(compiled.sqlText),
        },
        warnings: [],
      };
    } catch (error) {
      return {
        jobFacets: baseFacets,
        warnings: [mapCompiledCodeResolutionWarning({ error, ref: compiledCodeRef })],
      };
    }
  }
}
