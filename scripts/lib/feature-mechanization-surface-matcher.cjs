/** Owned concern: match the existing admitted surface grammar for one manifest snapshot.
 * Why: every file must reuse compiled patterns instead of rebuilding admission rules.
 * Corner: raw order, all specificity ties and invocation-local results remain exact.
 */
class FeatureMechanizationSurfaceMatcher {
  constructor(manifestEntries) {
    this.manifestEntries = manifestEntries;
    this.expressions = new Map();
    this.paths = new Map();
    this.mostSpecific = new Map();
    this.byManifest = new Map();
    this.globalPatterns = {
      allowedImplementationSurfaces: [],
      forbiddenImplementationSurfaces: [],
    };
    for (const entry of manifestEntries) {
      const prepared = {};
      for (const field of Object.keys(this.globalPatterns)) {
        prepared[field] = [];
        for (const raw of entry.manifest[field] || []) {
          const normalized = this.normalizeSurfacePattern(raw);
          if (!normalized) continue;
          if (!this.expressions.has(normalized))
            this.expressions.set(
              normalized,
              new RegExp(`^${this.globPatternToRegex(normalized.replace(/^\.\//, ''))}$`)
            );
          const pattern = {
            raw,
            normalized,
            regex: this.expressions.get(normalized),
            specificity: normalized.replace(/\*\*/g, '').replace(/\*/g, '').length,
          };
          prepared[field].push(pattern);
          this.globalPatterns[field].push(pattern);
        }
      }
      this.byManifest.set(entry, prepared);
    }
  }

  collectSurfacePatterns(field, manifestEntries = this.manifestEntries) {
    if (manifestEntries === this.manifestEntries) return this.globalPatterns[field];
    return manifestEntries.flatMap((entry) => this.byManifest.get(entry)[field]);
  }

  normalizeSurfacePattern(rawPattern) {
    if (typeof rawPattern !== 'string' || rawPattern.trim().length === 0) return null;
    return rawPattern.trim().split(/\s+/)[0].replace(/\\/g, '/').replace(/^\.\//, '');
  }

  normalizeFilePath(filePath) {
    if (!this.paths.has(filePath))
      this.paths.set(filePath, filePath.replace(/\\/g, '/').replace(/^\.\//, ''));
    return this.paths.get(filePath);
  }

  matchesSurface(filePath, pattern) {
    return pattern.regex.test(this.normalizeFilePath(filePath));
  }

  findMostSpecificManifestEntriesAllowingFile(filePath) {
    const normalizedPath = this.normalizeFilePath(filePath);
    if (this.mostSpecific.has(normalizedPath)) return this.mostSpecific.get(normalizedPath);
    let highest = -1;
    const matches = [];
    for (const entry of this.manifestEntries) {
      let specificity = -1;
      for (const pattern of this.byManifest.get(entry).allowedImplementationSurfaces)
        if (pattern.regex.test(normalizedPath))
          specificity = Math.max(specificity, pattern.specificity);
      if (specificity < 0) continue;
      if (specificity > highest) {
        highest = specificity;
        matches.length = 0;
      }
      if (specificity === highest) matches.push(entry);
    }
    this.mostSpecific.set(normalizedPath, matches);
    return matches;
  }

  globPatternToRegex(pattern) {
    let regex = '';
    for (let index = 0; index < pattern.length; index++) {
      const char = pattern[index];
      if (char === '*' && pattern[index + 1] === '*') {
        regex += '.*';
        index++;
      } else if (char === '*') regex += '[^/]*';
      else regex += char.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }
    return regex;
  }
}

module.exports = { FeatureMechanizationSurfaceMatcher };
