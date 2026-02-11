# Golden Hashes for Contract Tests

This directory contains baseline snapshot hashes for golden path contract tests.

## Purpose

The `hashes.json` file serves as a determinism verification baseline:

- **Contract testing**: CI compares execution hashes against baseline to detect non-determinism
- **Version tracking**: Documents which golden paths are implemented vs planned
- **Regression detection**: Hash mismatches indicate changes in execution semantics

## Structure

```json
{
  "version": "1.1.0",
  "paths": {
    "plan-minimal": {
      "hash": "pending",           // SHA256 of final StateStore snapshot
      "status": "implemented",     // implemented | not-implemented | deprecated
      "location": "examples/plan-minimal/",
      "metadata": { ... }
    }
  }
}
```

## Status Values

- **implemented**: Golden path exists in `examples/` directory with valid JSON files
- **not-implemented**: Golden path is planned but not yet created
- **deprecated**: Golden path has been replaced by a newer version

## Golden Paths (v1.1)

### Active Golden Paths

1. **plan-minimal** (`examples/plan-minimal/`)
   - Single echo step
   - Validates basic engine execution
   - Duration: < 5s
   - **Status**: ✅ Implemented

2. **plan-parallel** (`examples/plan-parallel/`)
   - 3 parallel steps + 1 fan-in merge
   - Validates parallel scheduling
   - Duration: < 15s
   - **Status**: ✅ Implemented

3. **plan-cancel-and-resume** (`examples/plan-cancel-and-resume/`)
   - 5 sequential steps with PAUSE/RESUME signals
   - Validates signal handling
   - Duration: Variable (depends on pause duration)
   - **Status**: ✅ Implemented

### Deprecated Golden Paths

- **hello-world**: Replaced by `plan-minimal`
- **pause-resume**: Replaced by `plan-cancel-and-resume`

### Future Golden Paths

- **retry**: Retry with failure injection (not yet implemented)

## Updating Hashes

When actual engine execution becomes available (after issues #5, #6 are resolved):

1. **Run golden paths**: Execute each plan against the engine
2. **Capture snapshot hash**: Hash the final StateStore projection
3. **Update hashes.json**: Replace "pending" with actual hash values
4. **Commit baseline**: Commit updated hashes.json to establish baseline

```bash
# Example workflow (not yet functional)
npm run test:contracts:hashes        # Execute golden paths, generate hashes
npm run test:contracts:hash-compare  # Compare against baseline
```

## CI Integration

The `.github/workflows/golden-paths.yml` workflow:

1. Validates JSON structure of all golden path files
2. Verifies schema versions (v1.1)
3. Checks that validation reports show "VALID" status
4. (Future) Executes plans and compares hashes against baseline

**Current CI behavior**: Validates file structure only (execution skipped until engine MVP is available)

## References

- <a>examples/</a> - Golden path implementations
- <a>scripts/run-golden-paths.js</a> - Execution script
- <a>scripts/compare-hashes.js</a> - Hash comparison script
- <a href="https://github.com/dunay2/dvt/issues/10">Issue #10</a> - Golden Paths implementation (completed)
- <a>ROADMAP.md</a> - Phase 1 MVP success criteria

## Version History

| Version | Date       | Change                                                 |
| ------- | ---------- | ------------------------------------------------------ |
| 1.0.0   | 2026-02-11 | Initial hashes file with 3 not-implemented paths       |
| 1.1.0   | 2026-02-11 | Added 3 implemented golden paths (issue #10 completed) |
