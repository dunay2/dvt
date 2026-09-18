/**
 * @ownedConcern Express permanent DVT PostgreSQL execution rejections without Temporal coupling.
 * @baseline ADR-0066: Stable PostgreSQL table publication
 */
export class DvtPostgresExecutionRejectedError extends Error {
  public constructor(readonly code: string) {
    super(code);
    this.name = 'DvtPostgresExecutionRejectedError';
  }
}
