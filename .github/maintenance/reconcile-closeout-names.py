import hashlib,json,os,subprocess
from pathlib import Path
BASE='d8c3e3b9479139a35d6e269f6a6ef42dde2080f6'
GIT='https://github.com/dunay2/dvt/blob/'+BASE+'/'
out=Path(os.environ['AUDIT_OUT']); scope=json.loads((out/'scope.json').read_text())
assert scope['baseline']==BASE
moves={
 'docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md':'docs/planning/closeouts/f-04-risk-a-qa-03-backend-owned-planref-closeout.md',
 'docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md':'docs/planning/closeouts/f-04-risk-b-mock-workspace-isolation-closeout.md',
}
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def original(path):return subprocess.check_output(['git','show',':'+path])
guard='tools/ci/docs-disposition-canon.test.mjs'
s=Path(guard).read_text()
anchor="    'docs/planning/archive',\n";assert s.count(anchor)==1
s=s.replace(anchor,anchor+''.join('    '+json.dumps(p)+',\n' for p in moves))
anchor='  const retiredMarkers = [';assert s.count(anchor)==1
s=s.replace(anchor,anchor+'\n'+''.join('    '+json.dumps(Path(p).name)+',\n' for p in moves))
Path(guard).write_text(s)
def run(name,pattern,expect):
 p=subprocess.run(['node','--test','--test-name-pattern='+pattern,guard],capture_output=True,text=True)
 (out/name).write_text(p.stdout+p.stderr)
 assert p.returncode==expect,(name,p.stdout[-2500:]+p.stderr[-500:])
run('filename-red.log','retired historical packs',1)
refs=[]
for path in subprocess.check_output(['git','ls-files','-z'],text=True).split('\0'):
 if not path or path==guard or not path.endswith('.md') or not Path(path).is_file():continue
 s=Path(path).read_text();before=s
 for old,new in moves.items():
  s=s.replace('`'+old+'`','[Historical closeout]('+GIT+old+')')
 if s!=before:
  assert path.startswith(('docs/planning/closeouts/','docs/planning/reviews/')),path
  Path(path).write_text(s);refs.append(path)
  scope['modified'].setdefault(path,blob(original(path)))
for old,new in moves.items():
 assert not Path(new).exists()
 assert scope['modified'][old]==blob(original(old))
 Path(old).rename(new)
 scope['modified'].pop(old)
scope['renamed']={old:{'path':new,'sha':blob(original(old))} for old,new in moves.items()}
(out/'scope.json').write_text(json.dumps(scope,indent=2)+'\n')
run('filename-green.log','retired historical packs|retired legacy planning',0)
for i,(old,new) in enumerate(moves.items()):
 try:
  Path(old).write_bytes(original(old))
  run('renamed-restore-'+str(i)+'.log','retired historical packs',1)
 finally:Path(old).unlink()
assert len(scope['deleted'])==33
assert len(scope['modified'])==49,(len(scope['modified']),refs)
assert len(scope['renamed'])==2
(out/'rename-proof.json').write_text(json.dumps({'renames':moves,'reconciledConsumers':refs,'historicalDatesAndResults':'preserved; reference-only changes'},indent=2)+'\n')
print(json.dumps({'retired':33,'modified':len(scope['modified']),'renamed':len(moves),'consumers':refs},indent=2))
