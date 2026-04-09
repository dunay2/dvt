#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function resolveCommand(command) {
  if (
    process.platform === 'win32' &&
    ['pnpm', 'npm', 'npx'].includes(command) &&
    !command.endsWith('.cmd') &&
    !command.endsWith('.exe')
  ) {
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
  return path.isAbsolute(resolved) || !resolved.endsWith('.cmd');
}

function parseArgs(argv) {
  const args = {
    mode: 'fast',
    title: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--mode') {
      args.mode = argv[i + 1] || args.mode;
      i += 1;
      continue;
    }
    if (current === '--title') {
      args.title = argv[i + 1] || null;
      i += 1;
    }
  }

  if (!['fast', 'full'].includes(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use "fast" or "full".`);
  }

  return args;
}

function runCommand(command, args) {
  console.log(`> ${command} ${args.join(' ')}`.trim());
  const resolved = resolveCommand(command);
  const result =
    process.platform === 'win32' && !shouldSpawnDirectly(command)
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', [resolved, ...args].map(quoteWindowsArg).join(' ')],
          { stdio: 'inherit' }
        )
      : spawnSync(resolved, args, { stdio: 'inherit', shell: false });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const { mode, title } = parseArgs(process.argv.slice(2));

  const commands = [
    ['pnpm', ['verify:prepush']],
    ['pnpm', ['docs:workboard:check']],
    ['pnpm', ['docs:sync:check']],
  ];

  if (mode === 'full') {
    commands.push(['pnpm', ['docs:quality:check']]);
    commands.push(['pnpm', ['docs:doctor']]);
    commands.push(['pnpm', ['docs:canonical:check']]);
    commands.push(['pnpm', ['docs:status:check']]);
    commands.push(['pnpm', ['docs:capability:check']]);
  }

  if (title) {
    commands.push([process.execPath, [repoScriptPath('validate-pr-title.cjs'), title]]);
  }

  for (const [command, args] of commands) {
    runCommand(command, args);
  }
}

main();
