# Golden Paths Baseline Hashes

This directory contains baseline snapshot hashes for golden path contract tests.

## Files

### `hashes.json`

Baseline snapshot hashes for the 3 required golden paths from ROADMAP.md:

1. **hello-world**: 3 steps linear plan completes in < 30s
2. **pause-resume**: Pause after step 1, resume, same final snapshot hash
3. **retry**: Fail step 2 once, retry, same snapshot hash

**Format:**

```json
{
  "version": "1.0.0",
  "paths": {
    "hello-world": {
      "description": "...",
      "hash": "pending | <sha256-hash>",
      "status": "not-implemented | implemented",
      "metadata": { ... }
    }
  }
}
```

**Status Values:**

- `not-implemented`: Golden path not yet created (blocked by issue #10)
- `implemented`: Golden path exists and hash is valid

**Hash Values:**

- `pending`: Placeholder until golden path implementation is complete
- `<sha256-hash>`: 16-character hex string from snapshot hash

## Updating Hashes

When golden path implementations are added (issue #10):

1. Run the golden path: `npm run test:contracts:hashes`
2. Inspect the generated hash in `test/contracts/results/golden-paths-run.json`
3. Update `hashes.json` with the new baseline hash
4. Change status from `not-implemented` to `implemented`
5. Commit the updated `hashes.json` to the repository

**Important:** Once a hash is set to a real value (not "pending"), the CI will fail if:

- The hash changes (indicates non-determinism)
- The golden path execution fails

## CI Behavior

### Stub Mode (Current)

- Status: `not-implemented`
- Hash: `pending`
- CI Result: ✅ PASS (lenient mode)

### Production Mode (After issue #10)

- Status: `implemented`
- Hash: `<actual-hash>`
- CI Result: ✅ PASS if hash matches, ❌ FAIL if mismatch

## References

- [ROADMAP.md](../ROADMAP.md) - Golden Path Success Criteria
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths examples
- [Issue #17](https://github.com/dunay2/dvt/issues/17) - CI contract testing pipeline
- [scripts/README.md](../scripts/README.md) - Script documentation
