#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function resolveCommand(command) {
  if (process.platform === 'win32' && !command.endsWith('.cmd') && !command.endsWith('.exe')) {
    return `${command}.cmd`;
  }
  return command;
}

function quoteWindowsArg(arg) {
  if (!/[ \t"&()^<>|]/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function repoScriptPath(relativePath) {
  return path.resolve(__dirname, relativePath);
}

function shouldSpawnDirectly(command) {
  const resolved = resolveCommand(command);
  return path.isAbsolute(resolved) || resolved.endsWith('.exe');
}

function parseArgs(argv) {
  const options = {
    title: null,
    bodyFile: null,
    base: 'main',
    mode: 'full',
    dryRun: false,
    labels: [],
    reviewers: [],
    assignees: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--title') {
      options.title = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (current === '--body-file') {
      options.bodyFile = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (current === '--base') {
      options.base = argv[i + 1] || options.base;
      i += 1;
      continue;
    }
    if (current === '--mode') {
      options.mode = argv[i + 1] || options.mode;
      i += 1;
      continue;
    }
    if (current === '--label') {
      options.labels.push(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (current === '--reviewer') {
      options.reviewers.push(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (current === '--assignee') {
      options.assignees.push(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (current === '--dry-run') {
      options.dryRun = true;
      continue;
    }
  }

  if (!options.title) {
    throw new Error('Missing required --title');
  }
  if (!options.bodyFile) {
    throw new Error('Missing required --body-file');
  }
  if (!['fast', 'full'].includes(options.mode)) {
    throw new Error(`Unsupported --mode "${options.mode}". Use "fast" or "full".`);
  }

  options.labels = options.labels.filter(Boolean);
  options.reviewers = options.reviewers.filter(Boolean);
  options.assignees = options.assignees.filter(Boolean);
  return options;
}

function validateBodyFile(bodyFile) {
  const resolved = path.resolve(process.cwd(), bodyFile);
  if (!fs.existsSync(resolved)) {
    throw new Error(`PR body file not found: ${bodyFile}`);
  }
  const body = fs.readFileSync(resolved, 'utf8').trim();
  if (body.length < 50) {
    throw new Error(`PR body is too short (${body.length} chars). Minimum is 50.`);
  }
  return resolved;
}

function runCommand(command, args) {
  console.log(`> ${command} ${args.join(' ')}`.trim());
  const resolved = resolveCommand(command);
  const result =
    process.platform === 'win32' && !shouldSpawnDirectly(command)
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', [resolved, ...args].map(quoteWindowsArg).join(' ')],
          { stdio: 'inherit' },
        )
      : spawnSync(resolved, args, { stdio: 'inherit', shell: false });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function buildGhArgs(options, bodyFile) {
  const args = [
    'pr',
    'create',
    '--title',
    options.title,
    '--body-file',
    bodyFile,
    '--base',
    options.base,
  ];

  for (const label of options.labels) {
    args.push('--label', label);
  }
  for (const reviewer of options.reviewers) {
    args.push('--reviewer', reviewer);
  }
  for (const assignee of options.assignees) {
    args.push('--assignee', assignee);
  }

  return args;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const bodyFile = validateBodyFile(options.bodyFile);
  const commands = [
    [process.execPath, [repoScriptPath('docs-pr-local.cjs'), '--mode', options.mode]],
    [process.execPath, [repoScriptPath('validate-pr-title.cjs'), options.title]],
  ];
  const ghArgs = buildGhArgs(options, bodyFile);

  for (const [command, args] of commands) {
    runCommand(command, args);
  }

  if (options.dryRun) {
    console.log('Dry run complete. Commands skipped after local validation:');
    console.log('- git push');
    console.log(`- gh ${ghArgs.join(' ')}`);
    return;
  }

  runCommand('git', ['push']);
  runCommand('gh', ghArgs);
}

main();
