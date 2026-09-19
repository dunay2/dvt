from pathlib import Path
import subprocess, os, json, re

root = Path.cwd()
out = Path(os.environ['RUNNER_TEMP']) / 'review-3314'
out.mkdir(exist_ok=True)
p = root / 'docs/planning/proposals/mandatory/frontend-and-ux/archive-candidates/index.md'
g = root / 'tools/ci/docs-disposition-canon.test.mjs'
old = p.read_text()
oldg = g.read_text()
assert '## Archive Rule' in old and 'Planning\nDB tasks.' in old
new = old.replace('Frontend Archive Candidates', 'Frontend Retirement Candidates').replace('last_reviewed: 2026-06-05', 'last_reviewed: 2026-09-19')
new = new.replace('These documents are drafts or historical story packs. They are not the next\nwork queue. They should move to archive only after active references have been\nmigrated to component docs, closeouts, implemented capability docs, or Planning\nDB tasks.', 'These documents are candidates for review, not a work queue or a declaration\nthat their obligations are complete. Task ownership and acceptance remain in\nGitHub Issues; architecture and feature mechanization remain in Planning DB.\n\nApply the [Historical Material Rule](../../../../status/governance-document-rule-inventory.md#historical-material-rule).\nReconcile current obligations and consumers before physically retiring an obsolete\ndocument. History stays in Git.')
new = new.replace('Visual direction draft. Archive after shell/navigation references are checked.', 'Visual direction draft. Review current shell/navigation obligations and references before retirement.')
new = new.replace('## Archive Rule\n\nMove a candidate only when exact references have been replaced and the\ncandidate no longer appears in feature-mechanization allowed surfaces, active\ncomponent docs, or canonical status matrices.', '## Retirement Rule\n\nA date, a closed task, or an entry in this table is not sufficient authority to\ndelete a document. Check its owner, current obligations and incoming references,\nincluding feature-mechanization allowed surfaces, active component docs and\ncanonical status matrices. Reconcile any architectural relation through the\nexisting Planning DB authority; do not create task rows there.\n\nRetire obsolete material and its live dependencies together. Do not move it into\na history folder or write a replacement preservation document. Use exact Git\nrevisions when provenance is required and run the existing documentation and\npre-push gates after changing paths.')
needle = "  assert.ok(frontendClassification.includes('History stays in Git.'));\n"
assert oldg.count(needle) == 1
addition = r'''
  const retirementCandidates = readRepoFile(
    'docs/planning/proposals/mandatory/frontend-and-ux/archive-candidates/index.md'
  );
  assert.doesNotMatch(
    retirementCandidates,
    /should move to archive|archive after|## Archive Rule|Planning\s+DB tasks/iu
  );
  assert.ok(retirementCandidates.includes('GitHub Issues'));
  assert.ok(retirementCandidates.includes('History stays in Git.'));
'''
g.write_text(oldg.replace(needle, needle + addition))
results = []
cmd = ['node', '--test', 'tools/ci/docs-disposition-canon.test.mjs']
def check(name, expected):
    res = subprocess.run(cmd, capture_output=True, text=True)
    (out / (name + '.log')).write_text(res.stdout + res.stderr)
    results.append({'name': name, 'command': cmd, 'exit': res.returncode, 'expected': expected})
    assert res.returncode == expected, (name, res.stdout, res.stderr)
    assert '# skipped 0' in res.stdout
    assert ('# pass 10' in res.stdout) if expected == 0 else ('# pass 9' in res.stdout and '# fail 1' in res.stdout)
check('red-original-target', 1)
p.write_text(new)
check('green-corrected-target', 0)
try:
    for name, text in [('old-archive-rule', new + '\n## Archive Rule\n'), ('db-task-instruction', new + '\nPlanning DB tasks\n'), ('original-target', old)]:
        p.write_text(text)
        check('negative-' + name, 1)
finally:
    p.write_text(new)
check('green-restored', 0)
old_links = re.findall(r'^\| \[[^\]]+\]\(([^)]+)\)', old, re.M)
new_links = re.findall(r'^\| \[[^\]]+\]\(([^)]+)\)', new, re.M)
assert len(old_links) == 9 and old_links == new_links
for target in new_links:
    assert (p.parent / target).is_file(), target
expected_paths = {str(p.relative_to(root)), str(g.relative_to(root))}
actual_paths = set(subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines())
assert actual_paths == expected_paths, actual_paths
(out / 'review-mutations.json').write_text(json.dumps(results, indent=2) + '\n')
(out / 'retained-links.json').write_text(json.dumps(new_links, indent=2) + '\n')
print('P2 reproduced and fixed; nine links retained; only target and existing guard changed')
