const node = {
  assert: require('node:assert/strict'),
  fs: require('node:fs'),
  os: require('node:os'),
  path: require('node:path'),
  test: require('node:test'),
};

const {
  GovernanceDbExportRunner,
  exportedGovernanceArtifactPaths,
} = require('./governance-db-export.cjs');

node.test('governance DB export parses check and output options', () => {
  const runner = new GovernanceDbExportRunner();

  const options = runner.parseArgs([
    '--check',
    '--output-root',
    '.generated-docs/governance-db-export',
    '--database-url',
    'postgres://example/planning',
  ]);

  node.assert.equal(options.check, true);
  node.assert.equal(options.databaseUrl, 'postgres://example/planning');
  node.assert.match(options.outputRoot, /\.generated-docs[\\/]governance-db-export$/);
});

node.test('governance DB export writes raw source documents from database rows', () => {
  const runner = new GovernanceDbExportRunner();
  const outputRoot = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'governance-db-export-'));

  try {
    const rows = [
      {
        sourcePath: '.generated-docs/planning/status/system-governance-file-index.files.yaml',
        rawSourceText: 'zLast: true\nversion: 1\nfileCount: 1\nshards: []\n',
        rawSource: {
          version: 1,
          fileCount: 1,
          shards: [],
        },
      },
    ];

    runner.writeSourceDocuments(rows, outputRoot);

    const written = node.fs.readFileSync(
      node.path.join(
        outputRoot,
        '.generated-docs/planning/status/system-governance-file-index.files.yaml'
      ),
      'utf8'
    );
    node.assert.equal(written, 'zLast: true\nversion: 1\nfileCount: 1\nshards: []\n');
  } finally {
    node.fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

node.test('governance DB export compares only canonical governance generated artifacts', () => {
  const runner = new GovernanceDbExportRunner();
  const root = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'governance-db-compare-'));
  const expectedRoot = node.path.join(root, 'expected');
  const actualRoot = node.path.join(root, 'actual');

  try {
    for (const artifactPath of exportedGovernanceArtifactPaths) {
      const expectedPath = node.path.join(expectedRoot, artifactPath);
      const actualPath = node.path.join(actualRoot, artifactPath);
      node.fs.mkdirSync(node.path.dirname(expectedPath), { recursive: true });
      node.fs.mkdirSync(node.path.dirname(actualPath), { recursive: true });
      node.fs.writeFileSync(expectedPath, `${artifactPath}\n`, 'utf8');
      node.fs.writeFileSync(actualPath, `${artifactPath}\n`, 'utf8');
    }

    const okReport = runner.compareGeneratedArtifacts({ expectedRoot, actualRoot });
    node.assert.equal(okReport.ok, true);

    node.fs.writeFileSync(
      node.path.join(actualRoot, exportedGovernanceArtifactPaths[0]),
      'changed\n',
      'utf8'
    );

    const driftReport = runner.compareGeneratedArtifacts({ expectedRoot, actualRoot });
    node.assert.equal(driftReport.ok, false);
    node.assert.deepEqual(driftReport.changed, [exportedGovernanceArtifactPaths[0]]);
  } finally {
    node.fs.rmSync(root, { recursive: true, force: true });
  }
});
