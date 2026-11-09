/** Owned concern: a literal catalog label cannot admit an unrelated fuzzy command. */
import { describe, expect, it } from 'vitest';
import { matchesCanvasCatalogQuery } from './canvasCatalogSearch';

describe('shared Canvas catalog search', () => {
  it.each([
    ['Filter', 'Filter', true],
    ['filter Filter Transform', '  FILTER ', true],
    ['full_outer_join FULL OUTER JOIN Combine', 'Filter', false],
    ['inner_join INNER JOIN Combine', 'join', true],
    ['filter Filtrar Transformar', 'filtrar', true],
    ['filter Filtrar Transformar', 'transformar', true],
    ['field_transform Transformar campo', 'field_transform', true],
    ['postgres Source Conexión', 'conexión', true],
    ['any actual item', '   ', true],
    ['any actual item', 'not-present', false],
  ])('matches %j against %j as %s', (text, query, expected) => {
    // Group-first fuzzy scoring previously selected FULL OUTER JOIN for the exact Filter label.
    expect(matchesCanvasCatalogQuery(text, query)).toBe(expected);
  });
});
