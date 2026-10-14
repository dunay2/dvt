/** Owned concern: preserve independent risk identities when their source documents are colocated. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { extractColocatedRiskRecords } = require('../../scripts/lib/risk-document-records.cjs');
const { buildRiskDebtSnapshot } = require('../../scripts/planning-db-import.cjs');
const ownerPath = 'docs/risk-register/quality/R-OWNER.md';
const source = (id, status = 'Open') =>
  `---\nid: ${id}\ntitle: ${id} remains independent\nstatus: ${status}\nowners: [Architecture]\nseverity: High\nprobability: Medium\n---\n\n## Mitigation\nKeep the actual obligation.\n\n\`\`\`sql\nselect 1;\n\`\`\`\n`;
const section = (raw, id) =>
  `<a id="risk-${id.toLowerCase()}"></a>\n\n\`\`\`\`risk-record-v1\n${raw}\`\`\`\`\n`;
const governance = (path) => ({
  path,
  componentUnit: 'SYS-DOCS',
  rootUnit: 'SYS-DVT',
  domainUnit: 'SYS-DVT',
  dddOwner: 'Docs',
  cqRails: 'QueryRiskDebt',
});
const collect = (docs) =>
  buildRiskDebtSnapshot({
    riskDocuments: docs,
    governanceFiles: docs.map((d) => governance(d.sourcePath)),
  }).riskDebtItems;

test('risk colocation preserves complete raw records and explicit current anchors', () => {
  const raw = source('R-CHILD');
  const records = extractColocatedRiskRecords(
    source('R-OWNER') + '\n' + section(raw, 'R-CHILD'),
    ownerPath
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].raw, raw);
  assert.equal(records[0].frontmatter.id, 'R-CHILD');
  assert.equal(records[0].sourceFragment, 'risk-r-child');
  assert.deepEqual(extractColocatedRiskRecords(source('R-OWNER'), ownerPath), []);
});

for (const [name, text] of [
  ['unknown version', section(source('R-A'), 'R-A').replace('risk-record-v1', 'risk-record-v2')],
  [
    'malformed opener',
    section(source('R-A'), 'R-A').replace('risk-record-v1', 'risk-record-v1 extra'),
  ],
  ['unclosed fence', section(source('R-A'), 'R-A').replace(/````\n$/, '')],
  ['missing id', section(source('R-A').replace('id: R-A\n', ''), 'R-A')],
  ['missing status', section(source('R-A').replace('status: Open\n', ''), 'R-A')],
  ['empty status', section(source('R-A').replace('status: Open', 'status: ""'), 'R-A')],
  ['missing title', section(source('R-A').replace('title: R-A remains independent\n', ''), 'R-A')],
  [
    'malformed metadata',
    section(source('R-A').replace('owners: [Architecture]', 'owners: [broken'), 'R-A'),
  ],
  ['missing metadata boundary', section(source('R-A').slice(4), 'R-A')],
  ['missing anchor', section(source('R-A'), 'R-A').replace('<a id="risk-r-a"></a>', '')],
  ['duplicated anchor', section(source('R-A'), 'R-A') + '<a id="risk-r-a"></a>'],
])
  test(`risk colocation rejects ${name}`, () =>
    assert.throws(() => extractColocatedRiskRecords(text, ownerPath)));

test('existing risk collector emits every identity without changing logical fields', () => {
  const standalone = collect([
    { sourcePath: ownerPath, raw: source('R-OWNER') },
    { sourcePath: 'docs/risk-register/quality/R-CHILD.md', raw: source('R-CHILD', 'Mitigated') },
  ]);
  const together = collect([
    {
      sourcePath: ownerPath,
      raw: source('R-OWNER') + '\n' + section(source('R-CHILD', 'Mitigated'), 'R-CHILD'),
    },
  ]);
  const logical = (rows) =>
    rows
      .map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(
            ([key]) => !['sourcePath', 'sourceContentSha256', 'rawDebt'].includes(key)
          )
        )
      )
      .sort((a, b) => a.riskId.localeCompare(b.riskId));
  assert.deepEqual(logical(together), logical(standalone));
  assert.equal(together.find((r) => r.riskId === 'R-CHILD').rawDebt.sourceFragment, 'risk-r-child');
  assert.equal(together.find((r) => r.riskId === 'R-CHILD').sourcePath, ownerPath);
});

test('duplicate identities and missing physical ownership remain hard failures', () => {
  const raw = source('R-OWNER') + '\n' + section(source('R-CHILD'), 'R-CHILD');
  assert.throws(
    () =>
      collect([
        { sourcePath: ownerPath, raw },
        { sourcePath: 'docs/risk-register/quality/R-CHILD.md', raw: source('R-CHILD') },
      ]),
    /Duplicate risk debt id/
  );
  assert.throws(
    () =>
      buildRiskDebtSnapshot({
        riskDocuments: [{ sourcePath: ownerPath, raw }],
        governanceFiles: [],
      }),
    /missing from governance_files/
  );
});

test('formatter-normalized three-backtick sections remain independently readable', () => {
  const raw = source('R-FORMATTED').split('\n\n\x60\x60\x60sql')[0] + '\n';
  const text = section(raw, 'R-FORMATTED').replaceAll('\x60\x60\x60\x60', '\x60\x60\x60');
  assert.equal(extractColocatedRiskRecords(text, ownerPath)[0].frontmatter.id, 'R-FORMATTED');
});

test('risk record parser participates in the existing documentation governance catalog', async () => {
  const { classifyScriptFilePath } = await import('./repository-command-catalog.mjs');
  assert.equal(
    classifyScriptFilePath('scripts/lib/risk-document-records.cjs').domain,
    'docs-governance'
  );
});
