import { describe, expect, it } from 'vitest';

import {
  DbtYamlDescriptionResourceAmbiguousError,
  DbtYamlDescriptionResourceNotFoundError,
} from '../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { YamlCstDbtDescriptionMutator } from '../../../src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';

const mutator = new YamlCstDbtDescriptionMutator();

describe('YamlCstDbtDescriptionMutator', () => {
  it('changes only an existing model description and preserves unrelated bytes', () => {
    const content = [
      'version: 2',
      '# project documentation',
      'models:',
      '  - name: orders # identity comment',
      "    description: 'Old description' # replaced target comment",
      '    tags: [finance, daily]',
      '    columns:',
      '      - name: order_id',
      '        tests: [not_null, unique]',
      '',
    ].join('\n');

    const result = mutator.mutate({
      content,
      resource: {
        uniqueId: 'model.shop.orders',
        resourceType: 'model',
        name: 'orders',
      },
      nextDescription: 'Canonical order facts',
    });

    expect(result.previousDescription).toBe('Old description');
    expect(result.content).toBe(
      content.replace(
        "    description: 'Old description' # replaced target comment\n",
        '    description: "Canonical order facts"\n'
      )
    );
  });

  it('adds a missing description immediately after the resource identity', () => {
    const content = [
      'version: 2',
      'models:',
      '  - name: orders',
      '    config:',
      '      materialized: table',
      '',
    ].join('\n');

    const result = mutator.mutate({
      content,
      resource: {
        uniqueId: 'model.shop.orders',
        resourceType: 'model',
        name: 'orders',
      },
      nextDescription: 'Canonical order facts',
    });

    expect(result.previousDescription).toBeNull();
    expect(result.content).toBe(
      content.replace(
        '  - name: orders\n',
        '  - name: orders\n    description: "Canonical order facts"\n'
      )
    );
  });

  it('resolves a source table through both source and table identity', () => {
    const content = [
      'version: 2',
      'sources:',
      '  - name: raw',
      '    description: Source description remains',
      '    tables:',
      '      - name: orders',
      '        description: Old table description',
      '      - name: customers',
      '        description: Customer description remains',
      '',
    ].join('\n');

    const result = mutator.mutate({
      content,
      resource: {
        uniqueId: 'source.shop.raw.orders',
        resourceType: 'source',
        sourceName: 'raw',
        name: 'orders',
      },
      nextDescription: 'Raw order records',
    });

    expect(result.content).toContain('    description: Source description remains');
    expect(result.content).toContain('        description: "Raw order records"');
    expect(result.content).toContain('        description: Customer description remains');
  });

  it('removes only the description created by a previous edit', () => {
    const content = [
      'version: 2',
      'models:',
      '  - name: orders',
      '    description: "Temporary description"',
      '    columns: []',
      '',
    ].join('\n');

    const result = mutator.mutate({
      content,
      resource: {
        uniqueId: 'model.shop.orders',
        resourceType: 'model',
        name: 'orders',
      },
      nextDescription: null,
    });

    expect(result.previousDescription).toBe('Temporary description');
    expect(result.content).toBe(content.replace('    description: "Temporary description"\n', ''));
  });

  it('rejects missing and duplicate resource identities', () => {
    const missing = 'version: 2\nmodels:\n  - name: customers\n';
    expect(() =>
      mutator.mutate({
        content: missing,
        resource: {
          uniqueId: 'model.shop.orders',
          resourceType: 'model',
          name: 'orders',
        },
        nextDescription: 'Orders',
      })
    ).toThrow(DbtYamlDescriptionResourceNotFoundError);

    const duplicate = 'version: 2\nmodels:\n  - name: orders\n  - name: orders\n';
    expect(() =>
      mutator.mutate({
        content: duplicate,
        resource: {
          uniqueId: 'model.shop.orders',
          resourceType: 'model',
          name: 'orders',
        },
        nextDescription: 'Orders',
      })
    ).toThrow(DbtYamlDescriptionResourceAmbiguousError);
  });
});
