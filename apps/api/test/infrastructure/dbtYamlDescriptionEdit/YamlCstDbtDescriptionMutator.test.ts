import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';

import {
  DbtYamlDescriptionDocumentInvalidError,
  DbtYamlDescriptionResourceAmbiguousError,
  DbtYamlDescriptionResourceNotFoundError,
} from '../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { YamlCstDbtDescriptionMutator } from '../../../src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';

const mutator = new YamlCstDbtDescriptionMutator();
const MODEL_RESOURCE = {
  uniqueId: 'model.shop.orders',
  resourceType: 'model',
  name: 'orders',
  packageName: 'shop',
} as const;
const SOURCE_RESOURCE = {
  uniqueId: 'source.shop.raw.orders',
  resourceType: 'source',
  sourceName: 'raw',
  name: 'orders',
  packageName: 'shop',
} as const;

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
      resource: MODEL_RESOURCE,
      nextDescription: 'Canonical order facts',
    });

    expect(result.previousDescription).toBe('Old description');
    expect(result.content).toBe(
      content.replace(
        "    description: 'Old description' # replaced target comment\n",
        "    description: 'Canonical order facts' # replaced target comment\n"
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
      resource: MODEL_RESOURCE,
      nextDescription: 'Canonical order facts',
    });

    expect(result.previousDescription).toBeNull();
    expect(result.content).toBe(
      content.replace(
        '  - name: orders\n',
        '  - name: orders\n    description: Canonical order facts\n'
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
      resource: SOURCE_RESOURCE,
      nextDescription: 'Raw order records',
    });

    expect(result.content).toContain('    description: Source description remains');
    expect(result.content).toContain('        description: Raw order records');
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
      resource: MODEL_RESOURCE,
      nextDescription: null,
    });

    expect(result.previousDescription).toBe('Temporary description');
    expect(result.content).toBe(content.replace('    description: "Temporary description"\n', ''));
  });

  it('encodes multiline descriptions as valid YAML without changing unrelated bytes', () => {
    const content = [
      'version: 2',
      'models:',
      '  - name: orders',
      '    description: Old description',
      '    tags: [finance, daily] # preserve',
      '',
    ].join('\n');

    const result = mutator.mutate({
      content,
      resource: MODEL_RESOURCE,
      nextDescription: 'Canonical orders.\nIncludes settled and pending records.',
    });

    const parsed = parseDocument(result.content, { strict: true, uniqueKeys: true });
    expect(parsed.errors).toEqual([]);
    expect(parsed.getIn(['models', 0, 'description'])).toBe(
      'Canonical orders.\nIncludes settled and pending records.'
    );
    expect(result.content).toContain('    tags: [finance, daily] # preserve');
  });

  it('fails closed instead of structurally editing a flow-style resource map', () => {
    const content = 'version: 2\nmodels: [{ name: orders, tags: [finance] }]\n';

    expect(() =>
      mutator.mutate({
        content,
        resource: MODEL_RESOURCE,
        nextDescription: 'Canonical orders',
      })
    ).toThrow(DbtYamlDescriptionDocumentInvalidError);
    expect(parseDocument(content).errors).toEqual([]);
  });

  it('rejects missing and duplicate resource identities', () => {
    const missing = 'version: 2\nmodels:\n  - name: customers\n';
    expect(() =>
      mutator.mutate({
        content: missing,
        resource: MODEL_RESOURCE,
        nextDescription: 'Orders',
      })
    ).toThrow(DbtYamlDescriptionResourceNotFoundError);

    const duplicate = 'version: 2\nmodels:\n  - name: orders\n  - name: orders\n';
    expect(() =>
      mutator.mutate({
        content: duplicate,
        resource: MODEL_RESOURCE,
        nextDescription: 'Orders',
      })
    ).toThrow(DbtYamlDescriptionResourceAmbiguousError);
  });
});
