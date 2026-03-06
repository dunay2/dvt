import type { EventEnvelope } from '@dvt/contracts';

import { extractCompiledCodeRefFromPayload } from '../compiledCodeRef.js';
import type {
  ICompiledCodeResolver,
  ILineageStepEventMapper,
  ISqlJobFacetBuilder,
} from '../contracts.js';
import type { LineageJobFacets, LineageWarning } from '../types.js';

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
      const message = error instanceof Error ? error.message : String(error);
      return {
        jobFacets: baseFacets,
        warnings: [
          {
            code: 'COMPILED_CODE_RESOLUTION_FAILED',
            message,
          },
        ],
      };
    }
  }
}
