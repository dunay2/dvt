#!/usr/bin/env node
/**
 * Owned concern: assemble and validate the disposable documentation publication projection.
 * Command/query rails: `GeneratePlanningDerivedSurfaces`, `ReadArchitectureDesignAuthority`,
 * `QueryDocumentationConsultationPath`, and `ListDocumentationLifecycleFacts`.
 */
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs');
const { dirname, isAbsolute, join, relative, resolve, sep } = require('node:path');
const { Client } = require('pg');
const { dump: dumpYaml, load: loadYaml } = require('js-yaml');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readDocumentationLifecycleRows,
} = require('./planning-db/queries/documentation-lifecycle-query.cjs');

class DocumentationPublicationPolicy {
  constructor(options = {}) {
    this.repoRoot = resolve(options.repoRoot || resolve(__dirname, '..'));
    this.generatedRoot = resolve(this.repoRoot, '.generated-docs');
    this.policyPath = resolve(
      options.policyPath || join(this.repoRoot, 'docs', 'generated-docs-policy.json')
    );
    this.policy = options.policy || JSON.parse(readFileSync(this.policyPath, 'utf8'));
  }

  static toPosix(value) {
    return value.split(sep).join('/');
  }

  static walkFiles(root) {
    if (!existsSync(root)) return [];
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const absolutePath = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...DocumentationPublicationPolicy.walkFiles(absolutePath));
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
    return files;
  }

  static globToRegExp(pattern) {
    let expression = '^';
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index];
      if (character === '*' && pattern[index + 1] === '*') {
        expression += '.*';
        index += 1;
      } else if (character === '*') {
        expression += '[^/]*';
      } else if (character === '?') {
        expression += '[^/]';
      } else {
        expression += character.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
      }
    }
    return new RegExp(`${expression}$`, 'u');
  }

  static assertInside(root, candidate, label) {
    const relativePath = relative(root, candidate);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`${label} escapes ${DocumentationPublicationPolicy.toPosix(root)}.`);
    }
  }

  generatorCommands() {
    return [
      ...new Set(
        this.policy.artifactClasses
          .filter((artifactClass) => artifactClass.publication?.enabled === true)
          .map((artifactClass) => artifactClass.generatorCommand)
          .filter((command) => typeof command === 'string' && command.trim() !== '')
      ),
    ];
  }

  generatedSources() {
    const sources = [];
    for (const artifactClass of this.policy.artifactClasses || []) {
      if (artifactClass.publication?.enabled !== true) continue;
      if (artifactClass.tracking !== 'untracked') {
        throw new Error(
          `Published generated artifact class ${artifactClass.id} must remain untracked.`
        );
      }
      if (artifactClass.manualEditPolicy !== 'generator-owned') {
        throw new Error(
          `Published generated artifact class ${artifactClass.id} must be generator-owned.`
        );
      }

      for (const artifact of artifactClass.artifacts || []) {
        const normalizedArtifact = DocumentationPublicationPolicy.toPosix(String(artifact));
        const absolutePattern = resolve(this.repoRoot, normalizedArtifact);
        DocumentationPublicationPolicy.assertInside(
          this.generatedRoot,
          absolutePattern,
          `Generated artifact ${normalizedArtifact}`
        );
        const matcher = DocumentationPublicationPolicy.globToRegExp(normalizedArtifact);
        const candidates = /[*?]/u.test(normalizedArtifact)
          ? DocumentationPublicationPolicy.walkFiles(this.generatedRoot).filter((candidate) =>
              matcher.test(
                DocumentationPublicationPolicy.toPosix(relative(this.repoRoot, candidate))
              )
            )
          : [absolutePattern];

        if (candidates.length === 0 || candidates.some((candidate) => !existsSync(candidate))) {
          throw new Error(`Missing generated publication source ${normalizedArtifact}.`);
        }

        for (const absolutePath of candidates) {
          const sourcePath = DocumentationPublicationPolicy.toPosix(
            relative(this.repoRoot, absolutePath)
          );
          const route = sourcePath.replace(/^\.generated-docs\//u, '');
          if (!route.endsWith('.md')) continue;
          sources.push({
            artifactClassId: artifactClass.id,
            absolutePath,
            route,
            sourcePath,
          });
        }
      }
    }

    return sources.sort((left, right) => left.route.localeCompare(right.route, 'en'));
  }

  isNavigable(sourcePath, lifecycleRow = {}) {
    const normalized = DocumentationPublicationPolicy.toPosix(sourcePath).toLowerCase();
    if (
      normalized.startsWith('docs/archive/') ||
      normalized.startsWith('docs/planning/archive/') ||
      normalized.includes('/_archive/') ||
      normalized.includes('/disposable/')
    ) {
      return false;
    }
    const lifecycle = String(
      lifecycleRow.lifecycle_state || lifecycleRow.lifecycleState || lifecycleRow.status || ''
    ).toLowerCase();
    return !['archive', 'archived', 'superseded', 'retired'].includes(lifecycle);
  }

  isDefaultNavigationEntry(source, lifecycleRow = {}) {
    if (!this.isNavigable(source.sourcePath, lifecycleRow)) return false;
    return (
      Boolean(source.artifactClassId) ||
      source.route === 'index.md' ||
      source.route.endsWith('/index.md')
    );
  }
}

class DocumentationPublicationAssembler {
  constructor(options = {}) {
    this.repoRoot = resolve(options.repoRoot || resolve(__dirname, '..'));
    this.docsRoot = resolve(options.docsRoot || join(this.repoRoot, 'docs'));
    this.generatedRoot = resolve(options.generatedRoot || join(this.repoRoot, '.generated-docs'));
    this.outputRoot = resolve(options.outputRoot || join(this.generatedRoot, 'publication'));
    this.configPath = resolve(options.configPath || join(this.generatedRoot, 'zensical.yml'));
    this.manifestPath = resolve(
      options.manifestPath || join(this.generatedRoot, 'documentation-publication-manifest.json')
    );
    this.canonicalConfigPath = resolve(
      options.canonicalConfigPath || join(this.repoRoot, 'zensical.yml')
    );
    this.lifecycleRows = options.lifecycleRows;
    this.runCommand = options.runCommand;
    this.policy =
      options.policy ||
      new DocumentationPublicationPolicy({
        repoRoot: this.repoRoot,
        policyPath: options.policyPath,
      });

    DocumentationPublicationPolicy.assertInside(
      this.generatedRoot,
      this.outputRoot,
      'Publication destination'
    );
  }

  run(command) {
    if (this.runCommand) return this.runCommand(command);
    const result = spawnSync(command, {
      cwd: this.repoRoot,
      encoding: 'utf8',
      shell: true,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Documentation publication command failed (${result.status}): ${command}`);
    }
    return undefined;
  }

  async resolveLifecycleRows() {
    if (Array.isArray(this.lifecycleRows)) return this.lifecycleRows;
    const client = new Client({
      connectionString: process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl,
    });
    try {
      await client.connect();
      return await readDocumentationLifecycleRows(client, { limit: 100000 });
    } finally {
      await client.end();
    }
  }

  authoredMarkdownSources() {
    return DocumentationPublicationPolicy.walkFiles(this.docsRoot)
      .filter((absolutePath) => absolutePath.endsWith('.md'))
      .map((absolutePath) => ({
        absolutePath,
        route: DocumentationPublicationPolicy.toPosix(relative(this.docsRoot, absolutePath)),
        sourcePath: DocumentationPublicationPolicy.toPosix(relative(this.repoRoot, absolutePath)),
      }))
      .sort((left, right) => left.route.localeCompare(right.route, 'en'));
  }

  static hashFiles(root) {
    const hash = createHash('sha256');
    const files = DocumentationPublicationPolicy.walkFiles(root).sort((left, right) =>
      left.localeCompare(right, 'en')
    );
    for (const absolutePath of files) {
      hash.update(DocumentationPublicationPolicy.toPosix(relative(root, absolutePath)));
      hash.update('\0');
      hash.update(readFileSync(absolutePath));
      hash.update('\0');
    }
    return hash.digest('hex');
  }

  async assemble(options = {}) {
    if (options.runGenerators !== false) {
      await this.run('pnpm planning:db:import --if-stale');
      for (const command of this.policy.generatorCommands()) {
        await this.run(command);
      }
    }

    const lifecycleRows = await this.resolveLifecycleRows();
    const lifecycleByPath = new Map(
      lifecycleRows.map((row) => [row.document_path || row.documentPath, row])
    );
    const authoredSources = this.authoredMarkdownSources();
    const generatedSources = this.policy.generatedSources();
    const routeOwners = new Map();
    for (const source of [...authoredSources, ...generatedSources]) {
      const existing = routeOwners.get(source.route);
      if (existing) {
        throw new Error(
          `Duplicate publication route ${source.route}: ${existing.sourcePath} and ${source.sourcePath}.`
        );
      }
      routeOwners.set(source.route, source);
    }

    rmSync(this.outputRoot, { recursive: true, force: true });
    mkdirSync(this.outputRoot, { recursive: true });
    cpSync(this.docsRoot, this.outputRoot, { recursive: true });
    for (const source of generatedSources) {
      const destination = resolve(this.outputRoot, source.route);
      DocumentationPublicationPolicy.assertInside(
        this.outputRoot,
        destination,
        `Publication route ${source.route}`
      );
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source.absolutePath, destination);
    }

    const navigableRoutes = [...routeOwners.values()]
      .filter((source) =>
        this.policy.isDefaultNavigationEntry(source, lifecycleByPath.get(source.sourcePath))
      )
      .map((source) => source.route)
      .sort((left, right) => {
        if (left === 'index.md') return -1;
        if (right === 'index.md') return 1;
        return left.localeCompare(right, 'en');
      });
    const canonicalConfig = loadYaml(readFileSync(this.canonicalConfigPath, 'utf8')) || {};
    const generatedConfig = {
      ...canonicalConfig,
      docs_dir: 'publication',
      nav: navigableRoutes,
    };
    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(
      this.configPath,
      dumpYaml(generatedConfig, { lineWidth: 100, noRefs: true, sortKeys: false }),
      'utf8'
    );

    const treeDigest = DocumentationPublicationAssembler.hashFiles(this.outputRoot);
    const receipt = {
      version: 1,
      commandRail: 'GeneratePlanningDerivedSurfaces',
      architectureQuery: 'ReadArchitectureDesignAuthority',
      consultationQuery: 'QueryDocumentationConsultationPath',
      lifecycleQuery: 'ListDocumentationLifecycleFacts',
      routeCount: routeOwners.size,
      navigableRouteCount: navigableRoutes.length,
      treeDigest,
      publicationRoot: DocumentationPublicationPolicy.toPosix(
        relative(this.repoRoot, this.outputRoot)
      ),
      configPath: DocumentationPublicationPolicy.toPosix(relative(this.repoRoot, this.configPath)),
      routes: [...routeOwners.keys()].sort((left, right) => left.localeCompare(right, 'en')),
    };
    writeFileSync(this.manifestPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    return receipt;
  }

  async check() {
    if (
      !existsSync(this.outputRoot) ||
      !existsSync(this.configPath) ||
      !existsSync(this.manifestPath)
    ) {
      throw new Error(
        'Documentation publication is absent. Run `pnpm docs:publish` explicitly before serve or build.'
      );
    }
    const receipt = JSON.parse(readFileSync(this.manifestPath, 'utf8'));
    const actualDigest = DocumentationPublicationAssembler.hashFiles(this.outputRoot);
    if (receipt.treeDigest !== actualDigest) {
      throw new Error(
        `Documentation publication digest mismatch: expected ${receipt.treeDigest}, received ${actualDigest}. Run \`pnpm docs:publish\` explicitly.`
      );
    }
    if (statSync(this.outputRoot).isDirectory() !== true) {
      throw new Error('Documentation publication root is not a directory.');
    }
    const config = loadYaml(readFileSync(this.configPath, 'utf8')) || {};
    if (config.docs_dir !== 'publication') {
      throw new Error('Generated Zensical config must consume the disposable publication tree.');
    }
    return receipt;
  }
}

async function runDocumentationPublicationCli(argv = process.argv.slice(2)) {
  const allowed = new Set(['--assemble', '--check']);
  for (const argument of argv) {
    if (!allowed.has(argument)) {
      throw new Error(`Unknown documentation publication option ${argument}.`);
    }
  }
  if (argv.length !== 1) {
    throw new Error('Choose exactly one of --assemble or --check.');
  }
  const assembler = new DocumentationPublicationAssembler();
  const receipt = argv.includes('--assemble')
    ? await assembler.assemble()
    : await assembler.check();
  console.log(
    `[docs:publication] ${argv.includes('--assemble') ? 'assembled' : 'valid'} routes=${receipt.routeCount} digest=${receipt.treeDigest}`
  );
  return receipt;
}

if (require.main === module) {
  runDocumentationPublicationCli().catch((error) => {
    console.error(`[docs:publication] ${error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DocumentationPublicationAssembler,
  DocumentationPublicationPolicy,
  runDocumentationPublicationCli,
};
