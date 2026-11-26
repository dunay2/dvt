/** Prove request identities cannot overwrite a newer buffer or publish old results. */
import { expect, it } from 'vitest';
import { buildSqlWorksheetTestResponse } from './sqlWorksheet.test-fixtures';
import { createSqlWorksheetState, reduceSqlWorksheetState } from './sqlWorksheetState';

it('starts with an empty buffer and no connection rather than executing a seeded query', () => {
  expect(createSqlWorksheetState()).toMatchObject({
    sql: '',
    connectionId: null,
    pending: null,
    execution: null,
    result: null,
  });
});

it('ignores an obsolete completed request after a new request starts', () => {
  const first = reduceSqlWorksheetState(createSqlWorksheetState(), {
    type: 'request-start',
    id: 1,
    kind: 'execute',
  });
  const current = reduceSqlWorksheetState(first, { type: 'request-start', id: 2, kind: 'execute' });
  expect(
    reduceSqlWorksheetState(current, {
      type: 'request-finished',
      id: 1,
      outcome: { kind: 'result', response: buildSqlWorksheetTestResponse() },
    })
  ).toBe(current);
});

it('keeps edited SQL when an earlier explicit execution completes', () => {
  const pending = reduceSqlWorksheetState(createSqlWorksheetState(), {
    type: 'request-start',
    id: 1,
    kind: 'execute',
  });
  const edited = reduceSqlWorksheetState(pending, { type: 'text', sql: 'SELECT 2' });
  const response = buildSqlWorksheetTestResponse();
  const completed = reduceSqlWorksheetState(edited, {
    type: 'request-finished',
    id: 1,
    outcome: { kind: 'result', response },
  });
  expect(completed.sql).toBe('SELECT 2');
  expect(completed.execution).toEqual(response.execution);
  expect(completed.result).toEqual(response.result);
});

it('restores exact history SQL and connection without inventing saved rows', () => {
  const pending = reduceSqlWorksheetState(createSqlWorksheetState(), {
    type: 'request-start',
    id: 1,
    kind: 'restore',
  });
  const execution = buildSqlWorksheetTestResponse().execution;
  const restored = reduceSqlWorksheetState(pending, {
    type: 'request-finished',
    id: 1,
    outcome: { kind: 'restored', execution },
  });
  expect(restored.sql).toBe(execution.sql);
  expect(restored.connectionId).toBe(execution.connectionRef.connectionId);
  expect(restored.execution).toEqual(execution);
  expect(restored.result).toBeNull();
  expect(restored.pending).toBeNull();
});

it('does not replace a buffer edited while history retrieval was pending', () => {
  const pending = reduceSqlWorksheetState(createSqlWorksheetState(), {
    type: 'request-start',
    id: 1,
    kind: 'restore',
  });
  const edited = reduceSqlWorksheetState(pending, { type: 'text', sql: 'SELECT 2' });
  expect(
    reduceSqlWorksheetState(edited, {
      type: 'request-finished',
      id: 1,
      outcome: { kind: 'restored', execution: buildSqlWorksheetTestResponse().execution },
    })
  ).toBe(edited);
});

it('clears connection-bound data when the selected connection changes', () => {
  const pending = reduceSqlWorksheetState(createSqlWorksheetState(), {
    type: 'request-start',
    id: 1,
    kind: 'execute',
  });
  const completed = reduceSqlWorksheetState(pending, {
    type: 'request-finished',
    id: 1,
    outcome: { kind: 'result', response: buildSqlWorksheetTestResponse() },
  });
  expect(reduceSqlWorksheetState(completed, { type: 'connection', id: 'other' })).toMatchObject({
    connectionId: 'other',
    execution: null,
    result: null,
    pending: null,
  });
});
