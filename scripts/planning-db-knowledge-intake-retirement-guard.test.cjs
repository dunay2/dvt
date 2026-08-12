const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createKnowledgeIntakeRetirementGuardComponent,
} = require('./planning-db/knowledge-intake-retirement-guard.cjs');

function createComponent(changedFiles, committedFiles = changedFiles) {
  return createKnowledgeIntakeRetirementGuardComponent({
    gitLocalChanges: {
      listLocalChangedFiles(options) {
        assert.equal(options.diffFilter, 'AR');
        return changedFiles;
      },
      listCommittedChangedFiles(options) {
        assert.equal(options.diffFilter, 'AR');
        return committedFiles;
      },
      toPosix(filePath) {
        return filePath.replace(/\\/g, '/');
      },
    },
    path: require('node:path'),
  });
}

test('knowledge intake retirement guard reports only new or renamed buzon markdown files', () => {
  const component = createComponent([
    'buzon/new-fowler-analysis.md',
    'docs/planning/status/example.md',
    'buzon/nested/not-intake.md',
    'buzon/not-markdown.txt',
    'buzon/staged.md',
  ]);

  assert.deepEqual(component.listNewBuzonIntakeFiles(), [
    'buzon/new-fowler-analysis.md',
    'buzon/staged.md',
  ]);
});

test('knowledge intake retirement guard ignores modified existing intake documents', () => {
  const component = createComponent([]);

  assert.deepEqual(component.listNewBuzonIntakeFiles(), []);
  assert.equal(component.main({ logger: { log() {} } }), 0);
});

test('knowledge intake retirement guard reads the exact committed diff when requested', () => {
  const component = createComponent([], ['buzon/committed-intake.md']);

  assert.deepEqual(component.listNewBuzonIntakeFiles({ committed: true }), [
    'buzon/committed-intake.md',
  ]);
});

test('knowledge intake retirement message points agents to DB-first rails', () => {
  const component = createComponent([]);
  const message = component.buildBuzonIntakeRetirementMessage(['buzon/new.md']);

  assert.match(message, /New or renamed buzon Markdown intake files are retired/);
  assert.match(message, /buzon\/new\.md/);
  assert.match(message, /pnpm planning:db:query knowledge-intake/);
  assert.match(message, /Planning DB/);
});

test('knowledge intake retirement guard exposes its canonical command rail', () => {
  const railName = ['Check', 'Buzon', 'Intake', 'Retirement'].join('');
  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, 'planning-db/knowledge-intake-retirement-guard.cjs'),
    'utf8'
  );
  const ownSource = require('node:fs').readFileSync(__filename, 'utf8');

  assert.doesNotMatch(
    ownSource,
    new RegExp(`\\b${railName}\\b`),
    'the guard test must not be indexed as a rail implementation surface'
  );
  assert.match(source, new RegExp(`\\b${railName}\\b`));
});
