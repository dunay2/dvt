import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isDbtParseReuseEligible } from '../../../src/infrastructure/dbt/dbtParseReuseEligibility.js';
import { hashProjectContent } from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';
import { DEFAULT_DBT_PROJECT_SOURCE_LIMITS } from '../../../src/infrastructure/dbt/dbtProjectSourceSnapshot.js';

const ESCAPED_YAML_CASES = [
  ['Unicode escape', 'dbt_project.yml', 'name: "\\u007b\\u007b invocation_id \\u007d\\u007d"'],
  [
    'long Unicode escape',
    'models/schema.yaml',
    'description: "\\U0000007B\\U0000007B invocation_id \\U0000007D\\U0000007D"',
  ],
  [
    'hexadecimal escape in a key',
    'models/schema.YML',
    '"\\x7b\\x7b invocation_id \\x7d\\x7d": value',
  ],
  [
    'mixed literal and escaped delimiters',
    'models/schema.YAML',
    'description: "{\\u007b invocation_id }\\u007d"',
  ],
  ['other backslash escape', 'dbt_packages/helper/schema.yml', 'description: "line\\nbreak"'],
] as const;

describe('dbt parse reuse eligibility', () => {
  let snapshotDirectory: string;

  beforeEach(async () => {
    snapshotDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-reuse-eligibility-'));
  });

  afterEach(async () => {
    await rm(snapshotDirectory, { recursive: true, force: true });
  });

  async function eligible(
    files: Readonly<Record<string, string>>,
    profileContents: readonly string[] = ['analytics:\n  target: analysis\n']
  ): Promise<boolean> {
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(snapshotDirectory, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, 'utf8');
    }
    const contentRevision = await hashProjectContent(
      snapshotDirectory,
      DEFAULT_DBT_PROJECT_SOURCE_LIMITS
    );
    return isDbtParseReuseEligible({ snapshotDirectory, contentRevision, profileContents });
  }

  it('admits plain content and literal model/source references without requiring manifest owners', async () => {
    await expect(
      eligible({
        'dbt_project.yml': 'name: analytics\nmodel-paths: [models]\n',
        'models/plain.sql': 'select 1 as id\n',
        'models/join.SQL':
          "select * from {{ ref(\"clients\") }} join {{ ref('package', 'orders') }} on true\n",
        'models/source.sql': "select * from {{ source('raw', 'clients') }}\n",
        'models/schema.yml': 'version: 2\nmodels: []\n',
        'models/other.YAML': 'version: 2\nmodels: []\n',
      })
    ).resolves.toBe(true);
  });

  it.each(ESCAPED_YAML_CASES)(
    'bypasses reuse for YAML %s',
    async (_description, relativePath, content) => {
      await expect(eligible({ [relativePath]: content })).resolves.toBe(false);
    }
  );

  it.each(ESCAPED_YAML_CASES)(
    'bypasses reuse for managed profile %s',
    async (_description, _relativePath, content) => {
      await expect(
        eligible({ 'models/plain.sql': 'select 1' }, ['plain: true', content])
      ).resolves.toBe(false);
    }
  );

  it.each([
    ['Python model', 'models/model.py', 'def model(dbt, session): return None\n'],
    ['Python dependency', 'dbt_packages/helper/helper.PY', 'value = 1\n'],
    ['dynamic reference', 'models/model.sql', "select * from {{ ref(var('model')) }}"],
    ['volatile context', 'models/model.sql', "select '{{ invocation_id }}'"],
    ['environment context', 'models/model.sql', "select '{{ env_var('PATH') }}'"],
    ['unknown macro', 'models/model.sql', 'select {{ custom_expression() }}'],
    ['statement block', 'models/model.sql', '{% if true %}select 1{% endif %}'],
    ['comment block', 'models/model.sql', '{# annotation #}select 1'],
    ['incomplete expression', 'models/model.sql', "select * from {{ ref('clients')"],
    ['incomplete statement', 'models/model.sql', '{% set name = 1'],
    ['incomplete comment', 'models/model.sql', '{# annotation'],
    ['unmatched closing marker', 'models/model.sql', 'select 1 }}'],
    ['residue after a reference', 'models/model.sql', "{{ ref('clients') }} {%"],
    ['unsupported whitespace control', 'models/model.sql', "{{- ref('clients') -}}"],
    ['project configuration Jinja', 'dbt_project.yml', 'name: "{{ ref(\'clients\') }}"'],
    ['schema Jinja', 'models/schema.yml', 'description: "{{ ref(\'clients\') }}"'],
    ['seed Jinja', 'seeds/data.csv', 'id,value\n1,{{ source("raw", "clients") }}\n'],
    [
      'ownerless dependency macro',
      'dbt_packages/custom/macros/ref.sql',
      '{% macro ref(name) %}{{ run_started_at }}{% endmacro %}',
    ],
  ])('bypasses reuse for %s', async (_description, relativePath, content) => {
    await expect(eligible({ [relativePath]: content })).resolves.toBe(false);
  });

  it.each([
    'analytics:\n  target: "{{ env_var(\'DBT_TARGET\') }}"\n',
    'analytics:\n  target: "{{ ref(\'clients\') }}"\n',
    '{# incomplete',
    'analysis %}',
  ])('bypasses reuse when any managed profile contains Jinja markers', async (profile) => {
    await expect(
      eligible({ 'models/plain.sql': 'select 1' }, ['plain: true', profile])
    ).resolves.toBe(false);
  });
});
