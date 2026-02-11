# Rollback Instructions: Partition PR

**Document Version**: 1.0  
**Last Updated**: 2026-02-11  
**Severity Level**: P3 (Low Risk - structural only, no semantic changes)  
**Rollback Owner**: DevOps Team + Architecture Team  

---

## 🎯 When to Rollback

### Criteria for Rollback

Execute rollback if **ANY** of the following occur within 7 days post-merge:

1. **Critical broken links** (P1):
   - External high-traffic pages (e.g., public docs, blogs) pointing to deprecated URLs show >10% 404 rate
   - Internal tools/dashboards breaking due to hardcoded paths

2. **CI gate failures** (P2):
   - False positive rate >20% (blocking legitimate PRs)
   - Performance degradation (CI jobs taking >10 min vs baseline 2 min)

3. **Team productivity impact** (P2):
   - >5 teams report inability to find documentation
   - >10 support tickets filed related to migration in first week

4. **Unforeseen dependencies** (P1):
   - Build pipelines breaking due to undocumented `WORKFLOW_ENGINE.md` references
   - Automated tooling (doc generators, linters) failing

### Criteria for Keeping Changes (No Rollback)

Do NOT rollback if:

- ✅ Individual broken links (fixable with 301 redirects)
- ✅ Minor CI gate tuning needed (adjust `.markdownlint.json`)
- ✅ <5 support tickets (document confusion expected during transition)

---

## 🔙 Rollback Procedures

### Option A: Full Revert (Recommended)

**Use case**: Critical issues affecting >3 teams or P1 production impact

**Steps**:

1. **Identify merge commit**:

   ```bash
   git log --oneline --grep="Partition WORKFLOW_ENGINE" -n 1
   # Output: abc1234 Partition WORKFLOW_ENGINE.md + Separate Storage/Engine Adapters
   ```

2. **Create revert branch**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b rollback/partition-pr
   ```

3. **Revert commit**:

   ```bash
   git revert abc1234 --no-edit
   ```

4. **Verify revert**:

   ```bash
   # Check WORKFLOW_ENGINE.md restored
   ls -lh docs/architecture/engine/WORKFLOW_ENGINE.md
   
   # Check new files removed
   [ ! -f docs/architecture/engine/contracts/state-store/README.md ] && echo "✅ State Store Contract removed"
   [ ! -f docs/architecture/engine/adapters/temporal/EnginePolicies.md ] && echo "✅ Temporal EnginePolicies removed"
   
   # Check ExecutionSemantics.v1.md reverted to v1.0.1
   grep "Version.*1.0.1" docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md && echo "✅ ExecutionSemantics restored"
   ```

5. **Test locally**:

   ```bash
   # Validate Markdown
   markdownlint-cli2 "docs/**/*.md"
   
   # Check links
   markdown-link-check docs/architecture/engine/WORKFLOW_ENGINE.md
   
   # CI gate test (if workflows restored)
   bash .github/workflows/markdown_lint.yml || echo "⚠️ CI workflows reverted"
   ```

6. **Push and create PR**:

   ```bash
   git push origin rollback/partition-pr
   gh pr create --title "Rollback: Partition WORKFLOW_ENGINE.md" \
     --body "Rolling back PR #XYZ due to [issue]. See ROLLBACK.md for details." \
     --base main \
     --label "rollback,P1"
   ```

7. **Fast-track approval**:
   - Tag `@architecture-team`, `@devops-team` for emergency review
   - Require only 1 approval (vs normal 2)
   - Merge immediately upon approval

8. **Post-rollback communication**:
   - Slack announcement (#engineering, #architecture):
     > "🔴 ROLLED BACK: Partition PR due to [critical issue]. WORKFLOW_ENGINE.md restored temporarily. New partition target date: TBD. Questions → #architecture."
   - Update PR with rollback reason
   - File post-mortem issue

---

### Option B: Partial Rollback (Selective)

**Use case**: Only CI gates causing issues, but partition structure is fine

**Steps**:

1. **Identify problematic component**:

   ```bash
   # Example: CI gate false positives
   git log --oneline .github/workflows/markdown_lint.yml
   ```

2. **Revert specific file(s)**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/ci-gate-tuning
   
   # Revert only CI workflow
   git checkout <previous-commit> -- .github/workflows/markdown_lint.yml
   
   # OR: Adjust config
   vim .markdownlint.json  # Disable problematic rules
   ```

3. **Test fix**:

   ```bash
   bash .github/workflows/markdown_lint.yml
   ```

4. **Push and merge**:

   ```bash
   git add .github/workflows/markdown_lint.yml
   git commit -m "fix: tune CI gate Markdown linting (reduce false positives)"
   git push origin fix/ci-gate-tuning
   gh pr create --title "Fix: Tune CI Gate Markdown Linting" --base main
   ```

---

### Option C: Forward Fix (Preferred for Minor Issues)

**Use case**: Broken links, minor documentation gaps

**Steps**:

1. **Identify specific issue**:

   ```bash
   # Example: Broken link in INDEX.md
   markdown-link-check docs/architecture/engine/INDEX.md
   # Output: [✖] docs/architecture/engine/contracts/state-store/README.md (404)
   ```

2. **Fix directly**:

   ```bash
   git checkout -b fix/broken-link-state-store
   
   # Fix link
   vim docs/architecture/engine/INDEX.md
   
   # Verify fix
   markdown-link-check docs/architecture/engine/INDEX.md
   ```

3. **Push and merge**:

   ```bash
   git add docs/architecture/engine/INDEX.md
   git commit -m "fix: correct State Store Contract link in INDEX.md"
   git push origin fix/broken-link-state-store
   gh pr create --title "Fix: Broken Link in INDEX.md" --base main
   ```

---

## 🧪 Post-Rollback Validation

After executing rollback, verify:

### 1. File Structure Restored

```bash
# Check WORKFLOW_ENGINE.md present
[ -f docs/architecture/engine/WORKFLOW_ENGINE.md ] && echo "✅ WORKFLOW_ENGINE.md restored"

# Check new files removed (if full revert)
[ ! -f docs/architecture/engine/contracts/state-store/README.md ] && echo "✅ Partition removed"

# Check ExecutionSemantics version
grep "^**Version**:" docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md
# Expected: Version: 1.0.1 (if full revert)
```

### 2. Links Working

```bash
# Test WORKFLOW_ENGINE.md links
markdown-link-check docs/architecture/engine/WORKFLOW_ENGINE.md

# Test README.md
markdown-link-check README.md
```

### 3. CI Passing

```bash
# Run CI locally
bash .github/workflows/validate_contracts.yml  # If exists
bash .github/workflows/markdown_lint.yml       # If added in partition PR
```

### 4. No Merge Conflicts

```bash
# Check open PRs for conflicts
gh pr list --state open --json number,title,mergeable
# If mergeable=false, notify PR authors to rebase
```

---

## 📞 Communication Templates

### Slack Announcement (Rollback)

```
🔴 **ROLLBACK EXECUTED**: Partition WORKFLOW_ENGINE.md PR

**What happened**: [Brief issue description, e.g., "CI gates false positive rate >30%, blocking 8 PRs"]

**Action taken**: Rolled back to pre-partition state. WORKFLOW_ENGINE.md restored.

**Impact**: 
- ✅ Partition structure reverted
- ✅ WORKFLOW_ENGINE.md available again
- ❌ New CI gates disabled (will be re-introduced after tuning)

**Next steps**:
1. Root cause analysis (ETA: 24h)
2. Fix CI gate config offline
3. Re-introduce partition PR (ETA: 1 week)

**Questions**: Ping @architecture-team in #architecture

**Tracking issue**: https://github.com/your-org/your-repo/issues/XYZ
```

### GitHub PR Comment (Rollback Reason)

```markdown
## Rollback Executed

**Reason**: [Specific reason, e.g., "CI gate Markdown linting false positive rate exceeded 20% threshold"]

**Impact Assessment**:
- Blocked PRs: 8
- Teams affected: SDK team, SRE team
- Severity: P2 (blocking work, but no production impact)

**Root Cause** (preliminary):
- `.markdownlint.json` config too strict
- `MD013` (line-length) rule triggered on code blocks (false positive)
- Did not reproduce in local testing (Windows/Linux environment difference)

**Resolution Plan**:
1. ✅ Rollback executed (this PR)
2. 🔄 Tune `.markdownlint.json` offline (disable MD013 for code blocks)
3. 🔄 Test on Windows/Linux/macOS before re-merge
4. 🔄 Re-introduce partition PR (target: 2026-02-18)

**Post-Mortem**: Will be filed as issue #XYZ

**Apologies** for the disruption. Lessons learned will be applied to future refactors.
```

---

## 🛡️ Rollback Prevention (Future)

### Pre-Merge Checklist (Enhanced)

Add to future large refactors:

- [ ] **Gradual rollout**: Partition in 2-3 PRs (not single massive PR)
- [ ] **Feature flag for CI gates**: Enable per-repo branch first, monitor for 1 week
- [ ] **Canary testing**: Merge to `staging` branch, test with 3 teams before `main`
- [ ] **Documented dependencies**: Grep for hardcoded paths in:
  - Build scripts (CI/CD pipelines)
  - Documentation generators
  - Internal tooling (linters, validators)
- [ ] **Dry-run on copy of production**: Clone repo, apply changes, test CI locally
- [ ] **Stakeholder sign-off**: Require explicit approval from SDK, SRE, Docs teams (not just Architecture)

### Monitoring (Week 1 Post-Merge)

- **Link health**: Monitor web analytics for 404s (threshold: <5% increase)
- **CI gate metrics**: Monitor false positive rate (threshold: <10%)
- **Support tickets**: Track Slack/email volume (threshold: <10 unique issues)
- **Team sentiment**: Poll in Slack: "How's the new doc structure working?" (Week 1)

---

## 📊 Post-Rollback Metrics

Track these after rollback to inform re-introduction:

| Metric | Target | Actual (Post-Rollback) |
|--------|--------|------------------------|
| WORKFLOW_ENGINE.md 404 rate | 0% | [Fill after rollback] |
| CI gate false positives | 0% | [Fill after rollback] |
| Open PRs unblocked | All | [Fill after rollback] |
| Team productivity restored | 100% | [Fill after rollback] |
| Support tickets resolved | All | [Fill after rollback] |

---

## 🔍 Root Cause Analysis Template

**Issue**: [Brief description]

**Timeline**:

- 2026-02-11 10:00 UTC: PR merged
- 2026-02-11 14:00 UTC: First report of [issue]
- 2026-02-11 16:00 UTC: Rollback executed

**Root Cause**:

- [Primary cause]
- [Contributing factors]

**Why Not Caught Pre-Merge**:

- [Gap in testing]
- [Environment difference]

**Preventive Measures**:

1. [Action item 1]
2. [Action item 2]

**Re-Introduction Plan**:

- Target date: [Date]
- Changes: [What will be different]
- Validation: [Enhanced testing plan]

---

## ✅ Rollback Checklist

### Pre-Rollback

- [ ] Confirm rollback criteria met (see "When to Rollback")
- [ ] Notify stakeholders (Slack announcement)
- [ ] Identify merge commit SHA
- [ ] Choose rollback option (Full / Partial / Forward Fix)

### During Rollback

- [ ] Create rollback branch
- [ ] Execute revert/fix
- [ ] Verify locally (Markdown lint, link check, CI)
- [ ] Push rollback PR
- [ ] Tag reviewers for fast-track approval
- [ ] Merge rollback PR

### Post-Rollback

- [ ] Verify file structure restored
- [ ] Verify links working
- [ ] Verify CI passing
- [ ] Check open PRs for conflicts (notify authors)
- [ ] Post communication (Slack, GitHub)
- [ ] File post-mortem issue
- [ ] Update rollback metrics table

### Follow-Up

- [ ] Root cause analysis (24h)
- [ ] Document lessons learned
- [ ] Plan re-introduction (1 week)
- [ ] Enhance pre-merge checklist

---

**Rollback Owner Contacts**:

- **DevOps Team**: <devops@yourorg.com>, #devops Slack
- **Architecture Team**: <architecture@yourorg.com>, #architecture Slack
- **Emergency**: Page on-call via PagerDuty
