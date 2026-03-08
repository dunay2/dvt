import type { ISqlJobFacetBuilder } from '../contracts.js';
import {
  buildLineageFacetMetadata,
  OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
} from '../openlineageSchema.js';
import type { SqlJobFacet } from '../types.js';

export class SqlJobFacetBuilder implements ISqlJobFacetBuilder {
  fromSql(sqlText: string): SqlJobFacet {
    return {
      ...buildLineageFacetMetadata(OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL),
      query: sqlText,
    };
  }
}
