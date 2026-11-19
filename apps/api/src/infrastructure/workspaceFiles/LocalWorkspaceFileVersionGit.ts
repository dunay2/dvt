/** Owned concern: execute Git against one managed bare archive. */
import { execFile } from 'node:child_process';
import { lstat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const options = { windowsHide: true, maxBuffer: 2_000_000, timeout: 15_000 };

function gitEnvironment(directory: string): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))
    ),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(directory, 'global-config'),
  };
}

function hasErrorCode(error: unknown, code: string | number): boolean {
  return typeof error === 'object' && error != null && 'code' in error && error.code === code;
}

export class LocalWorkspaceFileVersionGit {
  public constructor(private readonly directory: string) {}

  public async exists(): Promise<boolean> {
    try {
      return (await lstat(path.join(this.directory, 'HEAD'))).isFile();
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) return false;
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    if (await this.exists()) return;
    await mkdir(path.dirname(this.directory), { recursive: true });
    await exec('git', ['init', '--bare', '--template=', this.directory], {
      ...options,
      env: gitEnvironment(this.directory),
    });
  }

  public run(args: readonly string[], input?: string, author?: string): Promise<string> {
    const label = author?.replace(/[\p{Cc}<>]/gu, ' ').trim() || 'DVT';
    const environment = {
      ...gitEnvironment(this.directory),
      GIT_AUTHOR_NAME: label,
      GIT_AUTHOR_EMAIL: 'workspace@dvt.local',
      GIT_COMMITTER_NAME: 'DVT',
      GIT_COMMITTER_EMAIL: 'workspace@dvt.local',
    };
    return new Promise<string>((resolve, reject) => {
      const subprocess = execFile(
        'git',
        [`--git-dir=${this.directory}`, ...args],
        { ...options, env: environment },
        (error, stdout) => (error == null ? resolve(stdout) : reject(error))
      );
      if (input !== undefined) {
        subprocess.stdin?.on('error', reject);
        subprocess.stdin?.end(input, 'utf8');
      }
    });
  }

  public async readRef(ref: string): Promise<string | null> {
    try {
      return (await this.run(['rev-parse', '--verify', '--quiet', ref])).trim();
    } catch (error) {
      if (hasErrorCode(error, 1)) return null;
      throw error;
    }
  }

  public async contains(tip: string, revision: string): Promise<boolean> {
    const object = await this.readRef(`${revision}^{commit}`);
    if (object !== revision) return false;
    try {
      await this.run(['merge-base', '--is-ancestor', revision, tip]);
      return true;
    } catch (error) {
      if (hasErrorCode(error, 1)) return false;
      throw error;
    }
  }
}
