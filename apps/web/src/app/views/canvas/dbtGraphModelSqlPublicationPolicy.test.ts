import { describe, expect, it } from 'vitest';

import {
  classifyGraphModelSqlPublication,
  createGraphManagedDbtModelSql,
} from './dbtGraphModelSqlPublicationPolicy';

const FIRST_GRAPH_SQL = "{{ config(materialized='view') }}\n\nselect 1 as order_id\n";
const NEXT_GRAPH_SQL = "{{ config(materialized='table') }}\n\nselect 2 as order_id\n";

function currentFile(
  content: string,
  contentSha256 = 'a'.repeat(64)
): Readonly<{ content: string; contentSha256: string }> {
  return { content, contentSha256 };
}

describe('DBT graph model SQL publication policy', () => {
  it('creates a deterministic self-verifying graph-managed representation', () => {
    const managed = createGraphManagedDbtModelSql(FIRST_GRAPH_SQL);

    expect(managed).toMatch(/^-- dvt:graph-draft-content-sha256=[a-f0-9]{64}\n/);
    expect(createGraphManagedDbtModelSql(FIRST_GRAPH_SQL)).toBe(managed);
    expect(managed.endsWith(FIRST_GRAPH_SQL)).toBe(true);
  });

  it('classifies absent, unchanged, managed replacement, and legacy-equivalent files', () => {
    const firstManaged = createGraphManagedDbtModelSql(FIRST_GRAPH_SQL);
    const nextManaged = createGraphManagedDbtModelSql(NEXT_GRAPH_SQL);

    expect(
      classifyGraphModelSqlPublication({ proposedContent: firstManaged, currentFile: undefined })
    ).toMatchObject({ kind: 'create', expectedRevision: { kind: 'absent' } });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: firstManaged,
        currentFile: currentFile(firstManaged),
      })
    ).toMatchObject({
      kind: 'unchanged',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: nextManaged,
        currentFile: currentFile(firstManaged),
      })
    ).toMatchObject({ kind: 'replace_managed' });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: firstManaged,
        currentFile: currentFile(FIRST_GRAPH_SQL),
      })
    ).toMatchObject({ kind: 'adopt_legacy_equivalent' });
  });

  it('rejects unmarked edits and tampered graph-managed payloads', () => {
    const managed = createGraphManagedDbtModelSql(FIRST_GRAPH_SQL);
    const tampered = managed.replace('select 1', 'select 999');

    expect(
      classifyGraphModelSqlPublication({
        proposedContent: managed,
        currentFile: currentFile('select customer_secret from external_edit'),
      })
    ).toMatchObject({ kind: 'conflict' });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: managed,
        currentFile: currentFile(tampered),
      })
    ).toMatchObject({ kind: 'conflict' });
  });
});
