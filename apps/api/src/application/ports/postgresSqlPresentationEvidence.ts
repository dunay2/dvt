/** Read bounded native source evidence; this internal port grants no SQL or row execution. */
export type SqlPresentationRelation = Readonly<{ schema: string; table: string; catalog?: string }>;
export type PostgresSqlPresentationEvidence = Readonly<{
  currentDatabase: string;
  resolvedColumns: readonly (SqlPresentationRelation &
    Readonly<{ columns: readonly string[]; scalarColumns?: readonly string[] }>)[];
  scalarSemantics?: 'pg_catalog';
  viewDefinitions?: readonly Readonly<{ schema: string; table: string; sql: string }>[];
}>;

export interface IPostgresSqlPresentationEvidenceReader {
  read(
    input: Readonly<{
      credentialRef: string;
      database: string;
      relations: readonly SqlPresentationRelation[];
    }>
  ): Promise<PostgresSqlPresentationEvidence | null>;
}
