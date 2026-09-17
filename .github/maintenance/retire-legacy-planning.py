import json, re, subprocess, os, hashlib
from pathlib import Path
BASE='d8c3e3b9479139a35d6e269f6a6ef42dde2080f6'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==BASE
OUT=Path(os.environ['AUDIT_OUT']); OUT.mkdir(parents=True,exist_ok=True)
GIT='https://github.com/dunay2/dvt/blob/'+BASE+'/'
tracked=subprocess.check_output(['git','ls-files','-z'],text=True).split('\0')
original={n:Path(n).read_bytes() for n in tracked if n and Path(n).is_file()}
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
retired=set(str(p) for p in Path('docs/planning/reviews/sprints').rglob('*.md'))
retired.update(str(p) for p in Path('docs/planning/roadmap/diagrams').glob('review-sprint*.md'))
retired.update(['docs/planning/reviews/review-status-board.md','docs/planning/roadmap/review-remediation-roadmap-20260402.md','docs/planning/proposals/tradeoffs/proposal-portfolio-tradeoffs-20260403.md'])
for folder in ['governance-and-docs','runtime-and-contracts']:
 for p in Path('docs/planning/proposals/mandatory',folder).glob('*.md'):
  if re.search(r'^status: Superseded$',p.read_text()[:700],re.M):retired.add(str(p))
assert len(retired)==33,len(retired)
stubs=[p for p in retired if '/mandatory/' in p];assert len(stubs)==6
assert all('ADR-0061' in original[p].decode() for p in stubs)
byname={Path(p).name:p for p in sorted(retired) if Path(p).name!='index.md'}
markers=list(byname)+['reviews/sprints','sprints/index.md','sprint-2026-04a','sprint-2026-04b','sprint-2026-04c','tradeoffs/']
board='docs/planning/reviews/review-status-board.md'
stub='docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md'
workflow='docs/planning/state/github-mvp-issue-workflow.md'
adr='docs/adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md'
guard='tools/ci/docs-disposition-canon.test.mjs'
evidence='docs/evidence/ED-20260419-plan-compile-language-alignment-arc2.md'
selector='tools/ci/repository-change-scope.mjs'
# Evidence command operands are immutable records, not an operational reader.
evidence_command=[l.strip() for l in original[evidence].decode().splitlines() if board in l]
assert len(evidence_command)==1 and evidence_command[0].startswith('- pnpm exec markdownlint-cli2 ')
command_sha=blob(evidence_command[0].encode())
new={}
def text(n):return original[n].decode()
def save(n,s):
 if s!=text(n):new[n]=s.encode()
g=text(guard)
anchor="    'docs/planning/archive',\n";assert g.count(anchor)==1
paths=['docs/planning/reviews/sprints','docs/planning/proposals/tradeoffs']+sorted(p for p in retired if '/reviews/sprints/' not in p and '/proposals/tradeoffs/' not in p)
g=g.replace(anchor,anchor+''.join('    '+json.dumps(p)+',\n' for p in paths))
new_test='''
// Pinned Git provenance is not active navigation. The sole raw-command exception
// below preserves the exact recorded ARC evidence invocation, not a rerun recipe.
test('retired legacy planning pack has no operational consumers', () => {
  const retiredMarkers = MARKERS;
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\\0').filter(Boolean);
  const provenance = /https:\\/\\/github\\.com\\/dunay2\\/dvt\\/blob\\/BASE\\/[^\\s)<>\\]`]+/gu;
  let preservedCommand = false;
  for (const path of files) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    let content = readRepoFile(path);
    if (path === 'EVIDENCE') {
      const lines = content.split('\\n');
      content = lines.map((line) => {
        if (!line.includes('review-status-board.md')) return line;
        const digest = execFileSync('git', ['hash-object', '--stdin'], {
          input: line.trim(), encoding: 'utf8',
        }).trim();
        assert.equal(digest, 'COMMAND_SHA', 'historical evidence invocation changed');
        preservedCommand = true;
        return '';
      }).join('\\n');
    }
    if (path === 'tools/ci/repository-change-scope.mjs') {
      // Keep existing validation routing for a reintroduced retired path.
      content = content.replace("'STUB'", '');
    }
    content = content.replace(provenance, '');
    for (const marker of retiredMarkers) {
      assert.equal(content.includes(marker), false, `legacy planning consumer: ${path}: ${marker}`);
    }
  }
  assert.equal(preservedCommand, true, 'recorded evidence must be preserved');
  assertContains('docs/planning/state/github-mvp-issue-workflow.md', 'is the only task backlog');
});
'''
new_test=new_test.replace('MARKERS',json.dumps(markers,indent=4)).replace('BASE',BASE).replace('EVIDENCE',evidence).replace('COMMAND_SHA',command_sha).replace('STUB',stub)
save(guard,g+new_test)
# Preserve component/manifest/story tests; replace only frozen task-board claims.
guards={
 'tools/ci/canvas-fowler-canon.test.mjs':('docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md','F-MAND-CANVAS-FOWLER'),
 'tools/ci/ci-retention-review-canon.test.mjs':('docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md','D-REV-CI-RETENTION-CANON'),
 'tools/ci/runtime-review-canon.test.mjs':('docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md','C-REV-RUNTIME-CANON')}
for n,(plan,fid) in guards.items():
 s=text(n).replace("  '"+board+"',\n","  '"+workflow+"',\n",1)
 pat=r'  assertContains\(\s*'+re.escape("'"+board+"'")+r',.*?\);\n'
 s,count=re.subn(pat,'',s,flags=re.S);assert count==3,(n,count)
 pos=s.index('  const componentGuide')
 checks="  assertContains('"+workflow+"', 'is the only task backlog');\n  assertContains('"+plan+"', 'featureId: "+fid+"');\n\n"
 save(n,s[:pos]+checks+s[pos:])
nav_prefix=['docs/planning/domains/','docs/planning/roadmap/']
for n,b in original.items():
 if n in retired or not n.endswith('.md'):continue
 if n==evidence:continue
 s=b.decode()
 if not any(m in s for m in markers):continue
 if n.startswith(tuple(nav_prefix)):
  save(n,''.join(l for l in s.splitlines(keepends=True) if not any(m in l for m in markers)))
  continue
 if n=='docs/planning/proposals/portfolio-map-20260403.md':
  s=s.replace('- `tradeoffs/`: portfolio-level effort, rationale, and opportunity-cost analysis.\n','')
  s=s.replace('- [Planning review canon plan\n  2026-05-24](./mandatory/governance-and-docs/planning-review-canon-plan-20260524.md)\n','')
  save(n,s);continue
 if n=='docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md':
  save(n,s.replace(stub,adr));continue
 if n.startswith('docs/planning/proposals/mandatory/'):
  if 'name: GovS2QueryStoreBoundary' in s:
   old='  - <<: *govS2CloseoutSymbolDefaults\n    name: GovS2QueryStoreBoundary\n    path: '+stub+'\n'
   assert s.count(old)==1;s=s.replace(old,'')
  result=[];in_manifest=False;section=None
  for line in s.splitlines(keepends=True):
   if line.startswith('```feature-mechanization'):in_manifest=True
   elif in_manifest and line.startswith('```'):in_manifest=False
   if in_manifest and re.match(r'^[A-Za-z].*:',line):section=line.split(':',1)[0]
   if any(m in line for m in markers):
    if in_manifest:
     assert line.lstrip().startswith('- '),(n,line)
     if section=='governingSources':result.append(line.replace(board,workflow).replace(stub,adr))
     continue
    if n.endswith('doc-driven-framework-and-tooling-plan-20260404.md') and line.startswith('| Planning as data '):
     result.append('| MVP task lifecycle | GitHub Issues, under `'+adr+'`; Planning DB retains architecture and mechanization. |\n');continue
    if line.startswith('- `'+board+'`'):result.append('- `'+workflow+'`\n');continue
    if line.startswith('- [Review Status Board]'):result.append('- [GitHub MVP Issue Workflow](../../../state/github-mvp-issue-workflow.md)\n');continue
    raise AssertionError((n,line))
   result.append(line)
  save(n,''.join(result));continue
 if n=='docs/planning/reviews/20260419-dvt-plus-deep-architectural-review.md':
  lines=s.splitlines(keepends=True)
  hit=[i for i,l in enumerate(lines) if l.startswith('Each task is bound to a planning lane')];assert len(hit)==1
  lines[hit[0]]='The lane update procedure recorded for this review is retired by [ADR-0061](../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md). Current MVP task priority, status and follow-up use the [GitHub issue workflow](../state/github-mvp-issue-workflow.md). The historical diagnoses and scores in this review are not a live backlog.\n'
  save(n,''.join(lines));continue
 # Preserve historical invocations as links to the original exact line in Git,
 # not edited commands that were never executed.
 result=[]
 for i,line in enumerate(s.splitlines(keepends=True)):
  if not any(m in line for m in markers):result.append(line);continue
  if 'pnpm exec ' in line:
   start=line.find('`pnpm exec ');end=line.rfind('`')
   assert start>=0 and end>start,(n,line)
   line=line[:start]+'[Recorded validation command]('+GIT+n+'#L'+str(i+1)+')'+line[end+1:]
   result.append(line);continue
  def link(m):
   label,dest=m.group(1),m.group(2);raw=dest.split('#',1)[0]
   resolved=os.path.normpath(str(Path(n).parent/raw)) if not raw.startswith('docs/') else raw
   target=resolved if resolved in retired else next((p for p in retired if raw==p),None)
   return '[Historical planning source]('+GIT+target+')' if target else m.group(0)
  line=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,line)
  def tick(m):
   name=m.group(1);target=name if name in retired else byname.get(name)
   return '[Historical planning source]('+GIT+target+')' if target else m.group(0)
  line=re.sub(r'`([^`]+)`',tick,line)
  result.append(line)
 save(n,''.join(result))
assert set(new).isdisjoint(retired)
assert all(n.startswith('docs/') or n in {guard,*guards} for n in new)
protected=['apps/','packages/','scripts/','.github/','docs/adr/','docs/contracts/','docs/evidence/','docs/risk-register/','docs/runbooks/']
assert not any(n.startswith(tuple(protected)) for n in new)
assert original[selector]==Path(selector).read_bytes()
manifest={'baseline':BASE,'deleted':{p:blob(original[p]) for p in sorted(retired)},'modified':{p:blob(original[p]) for p in sorted(new)},'recordedCommandException':{'path':evidence,'lineBlob':command_sha},'classificationTombstone':selector}
(OUT/'scope.json').write_text(json.dumps(manifest,indent=2)+'\n')
for n in [guard,*guards]:Path(n).write_bytes(new[n])
def run(name,pattern=None,expected=0):
 cmd=['node','--test']
 if pattern:cmd+=['--test-name-pattern='+pattern]
 cmd+=[guard]
 p=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (OUT/name).write_text(p.stdout)
 assert p.returncode==expected,(name,p.returncode,p.stdout[-3000:])
 return p.stdout
red=run('red.log',expected=1);assert 'legacy planning consumer:' in red
for n,b in new.items():Path(n).write_bytes(b)
for n in retired:Path(n).unlink()
def prune():
 for folder in ['docs/planning/reviews/sprints','docs/planning/proposals/tradeoffs']:
  root=Path(folder)
  if root.exists():
   for d in sorted([p for p in root.rglob('*') if p.is_dir()],key=lambda x:len(x.parts),reverse=True):d.rmdir()
   root.rmdir()
prune()
run('green.log')
for i,n in enumerate(sorted(retired)):
 p=Path(n)
 try:
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(original[n])
  run('restore-'+str(i+1)+'.log','retired historical packs',1)
 finally:p.unlink();prune()
agents=Path('AGENTS.md');saved=agents.read_bytes()
mutations=['docs/planning/reviews/review-status-board.md','docs/planning/reviews/sprints/index.md','tradeoffs/','https://github.com/dunay2/dvt/blob/main/'+board,stub]
try:
 for i,marker in enumerate(mutations):
  agents.write_bytes(saved+('\n- '+marker+'\n').encode())
  result=run('consumer-'+str(i+1)+'.log','retired legacy planning',1)
  assert 'legacy planning consumer: AGENTS.md' in result
finally:agents.write_bytes(saved)
run('final-green.log')
for n,b in original.items():
 if n not in retired and n not in new:assert Path(n).read_bytes()==b,n
assert len(retired)==33 and len(new)==50
print(json.dumps({'deleted':len(retired),'modified':len(new),'removedLines':sum(len(original[p].splitlines()) for p in retired),'scope':sorted(new)},indent=2))
