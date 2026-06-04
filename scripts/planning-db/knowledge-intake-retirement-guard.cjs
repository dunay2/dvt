#!/usr/bin/env node
/** Owned concern: guard DB-first knowledge intake retirement for changed slices. */
function createKnowledgeIntakeRetirementGuardComponent(deps = {}) {
  const path = deps.path || require('node:path');
  const git = deps.gitLocalChanges || require('../git-local-changes.cjs');
  const repoRoot = deps.repoRoot || path.resolve(__dirname, '..', '..');

  function isBuzonMarkdownIntake(filePath) {
    return /^buzon\/[^/]+\.md$/u.test(git.toPosix(filePath));
  }

  function listNewBuzonIntakeFiles(options = {}) {
    return git
      .listLocalChangedFiles({
        ...options,
        diffFilter: 'AR',
        includeUntracked: options.includeUntracked !== false,
        repoRootPath: options.repoRootPath || repoRoot,
      })
      .filter(isBuzonMarkdownIntake);
  }

  function buildBuzonIntakeRetirementMessage(files) {
    return [
      '[buzon-retirement] New or renamed buzon Markdown intake files are retired.',
      '',
      'Blocked files:',
      ...files.map((filePath) => `- ${filePath}`),
      '',
      'Use the Planning DB-first rails instead:',
      '- pnpm planning:db:query knowledge-intake --state unclassified --limit 30',
      '- pnpm planning:db:query knowledge-intake --path <existing-buzon-path> --limit 5',
      '- pnpm docs:knowledge-intake:generate',
      '',
      'For new Fowler analysis, create or update the governed docs/planning surface,',
      'then let governance:refresh/import project it into the Planning DB.',
    ].join('\n');
  }

  function main(options = {}) {
    const files = listNewBuzonIntakeFiles(options);
    if (files.length === 0) {
      (options.logger || console).log('[buzon-retirement] OK: no new buzon intake files.');
      return 0;
    }

    (options.errorLogger || console).error(buildBuzonIntakeRetirementMessage(files));
    return 1;
  }

  return {
    buildBuzonIntakeRetirementMessage,
    isBuzonMarkdownIntake,
    listNewBuzonIntakeFiles,
    main,
  };
}

if (require.main === module) {
  process.exitCode = createKnowledgeIntakeRetirementGuardComponent().main();
}

module.exports = createKnowledgeIntakeRetirementGuardComponent();
module.exports.createKnowledgeIntakeRetirementGuardComponent =
  createKnowledgeIntakeRetirementGuardComponent;
