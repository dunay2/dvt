import type { ISqlJobFacetBuilder } from '../contracts.js';
import type { SqlJobFacet } from '../types.js';

export class SqlJobFacetBuilder implements ISqlJobFacetBuilder {
  fromSql(sqlText: string): SqlJobFacet {
    return {
      sql: {
        query: sqlText,
      },
    };
  }
}
