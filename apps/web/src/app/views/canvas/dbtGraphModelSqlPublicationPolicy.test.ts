import { describe, expect, it } from 'vitest';

import {
  classifyGraphModelSqlPublication,
  createGraphDraftMarkedDbtModelSql,
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
  it('creates a deterministic graph-draft divergence marker', () => {
    const marked = createGraphDraftMarkedDbtModelSql(FIRST_GRAPH_SQL);

    expect(marked).toMatch(/^-- dvt:graph-draft-content-sha256=[a-f0-9]{64}\n/);
    expect(createGraphDraftMarkedDbtModelSql(FIRST_GRAPH_SQL)).toBe(marked);
    expect(marked.endsWith(FIRST_GRAPH_SQL)).toBe(true);
  });

  it('classifies absent, unchanged, and marked replacement files', () => {
    const firstMarked = createGraphDraftMarkedDbtModelSql(FIRST_GRAPH_SQL);
    const nextMarked = createGraphDraftMarkedDbtModelSql(NEXT_GRAPH_SQL);

    expect(
      classifyGraphModelSqlPublication({ proposedContent: firstMarked, currentFile: undefined })
    ).toMatchObject({ kind: 'create', expectedRevision: { kind: 'absent' } });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: firstMarked,
        currentFile: currentFile(firstMarked),
      })
    ).toMatchObject({
      kind: 'unchanged',
      expectedRevision: { kind: 'content_sha256', value: 'a'.repeat(64) },
    });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: nextMarked,
        currentFile: currentFile(firstMarked),
      })
    ).toMatchObject({ kind: 'replace_marked' });
  });

  it('never adopts an unmarked file even when its payload matches exactly', () => {
    const proposedContent = createGraphDraftMarkedDbtModelSql(FIRST_GRAPH_SQL);

    expect(
      classifyGraphModelSqlPublication({
        proposedContent,
        currentFile: currentFile(FIRST_GRAPH_SQL),
      })
    ).toEqual({ kind: 'conflict', reason: 'unmarked' });
  });

  it('rejects unmarked edits and tampered graph-draft marker payloads', () => {
    const marked = createGraphDraftMarkedDbtModelSql(FIRST_GRAPH_SQL);
    const tampered = marked.replace('select 1', 'select 999');

    expect(
      classifyGraphModelSqlPublication({
        proposedContent: marked,
        currentFile: currentFile('select customer_secret from external_edit'),
      })
    ).toMatchObject({ kind: 'conflict', reason: 'unmarked' });
    expect(
      classifyGraphModelSqlPublication({
        proposedContent: marked,
        currentFile: currentFile(tampered),
      })
    ).toMatchObject({ kind: 'conflict', reason: 'invalid_marker' });
  });
});
