from pathlib import Path
import hashlib,json,os,re,subprocess
BASELINE = "21a7b3b45334c9d9d14d62d256c4e559b77b1a30"
GUARD = "tools/ci/docs-disposition-canon.test.mjs"
ORIGINALS = {'docs/planning/closeouts/20260315-adapter-postgres-schema-timeout-fixes-closeout.md': 'c3a283e86d0654453dc2d6f4ebc5b417c97d7396', 'docs/planning/closeouts/20260315-intent-store-bug-fixes-closeout.md': 'e115e773d0d6c20d38395121ee80122cc642e716', 'docs/planning/closeouts/20260315-provider-adapter-contract-versioning-closeout.md': 'da800e0831ddd296812ed98f6673fbd8d62de288', 'docs/planning/closeouts/20260315-task8-intent-reconciliation-and-api-flags-closeout.md': '999542091cf74a8901249e654902dd17c3f33a29', 'docs/planning/closeouts/20260316-outbox-cleanup-serialization-closeout.md': '4e64a7330eb1e84d09b2698f6419c4d014e4780d', 'docs/planning/closeouts/20260321-s06-migration-version-table-closeout.md': 'a7eedd34c8e911f1ac9ef755064cf4af76fc0e01', 'docs/planning/closeouts/20260324-rc-a1-simulate-error-production-hardening-closeout.md': '9986cd78b0bb8ec1f8ff71fed4c84e3953ef4d2b', 'docs/planning/closeouts/20260324-rc-a2-deterministic-start-run-intent-id-closeout.md': 'ffbc9e8dab1ae994ec8eb2cce33c8cf9210903f4', 'docs/planning/closeouts/20260324-s14-gateway-context-across-continue-as-new-closeout.md': '9e6bae9f9542e4d3f629ca95d977d060d62d9baf', 'docs/planning/closeouts/20260324-s15-run-snapshot-cas-guard-closeout.md': '8828893bf20468480d55b8c7257b11b5f168f828', 'docs/planning/closeouts/20260324-s15f1-stale-snapshot-discard-closeout.md': 'cc8e221e16f74799a6bf4fc7b55b3494ca26cac4', 'docs/planning/closeouts/20260331-rc-c1-http-error-envelope-normalization-closeout.md': '84c9191010511b218a041453e562c2179b6ea65b', 'docs/planning/closeouts/20260331-s1-manifestref-production-path-closeout.md': '224f5f804bc97c190c3a69b239240ee314b22cbf', 'docs/planning/closeouts/20260401-dhm-ws1-start-run-boundary-residual-hardening-closeout.md': 'f7160f231c2ad19247dbd1ed71f371926213cdd9', 'docs/planning/closeouts/20260406-mw-a1-step-kind-registry-governance-closeout.md': '0fff724fc112fba6602fc9a233bc20969241eaa7', 'docs/planning/closeouts/20260406-s08-4c-fail-closed-admission-coverage-closeout.md': '43eb4a129ba0055193f1683c52ca5c85564e456d', 'docs/planning/closeouts/20260406-s08-5c-plugin-compatibility-fingerprint-closeout.md': '48d258efc629bc5a068d1397c7c2ed4cb1cc34f1', 'docs/planning/closeouts/20260407-engine-entrypoint-plan-integrity-closeout.md': 'd6774f91c511a7271388787ec6c57d4504dff154', 'docs/planning/closeouts/20260407-snapshot-prewarm-active-runs-closeout.md': '9af227f20db37e80bc6bc1559910f51631e3d694', 'docs/planning/closeouts/20260409-provider-ref-contract-hardening-closeout.md': '1c03b47529844706c8ef3634eae99189943ad821', 'docs/planning/closeouts/20260410-mw-a5-temporal-helper-artifact-facts-narrowing-closeout.md': '4f0d8eac97762bcc613631dce546f2bedbf3b9a0', 'docs/planning/closeouts/20260423-ar-c3-b-temporal-readyz-capacity-binding-closeout.md': '66269d5c3aafbde47bbb22a1e7d81ef17468337b', 'docs/planning/closeouts/20260423-ar-c3-c-execution-capacity-operational-closure-closeout.md': 'c6e787c9a204703e7a860cea430071876f1629d4', 'docs/planning/closeouts/20260423-engine-capability-validation-fail-closed-closeout.md': 'ed18b0aec5f954a64a7446b8ff86027ecee77fd9', 'docs/planning/closeouts/20260424-ar-c3-admission-observability-semantic-hardening-closeout.md': '815b7ff10bce38b521d0466b41db16347ae9bccc'}
root=Path.cwd();out=Path(os.environ["AUDIT_OUT"]);out.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(["git",*args])
def blob(data):return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
assert git("rev-parse","HEAD").decode().strip()==BASELINE
assert not git("status","--porcelain").strip()
for path,h in ORIGINALS.items():
    assert blob((root/path).read_bytes())==h,path
    assert "```feature-mechanization" not in (root/path).read_text(),path
old=(root/GUARD).read_text()
needle="  const editorialCloseouts = new Set([\n"
assert old.count(needle)==1
addition="".join("    '"+Path(p).name+"',\n" for p in ORIGINALS)
assert all("'"+Path(p).name+"'" not in old for p in ORIGINALS)
(root/GUARD).write_text(old.replace(needle,needle+addition))
results=[]
def check(name,expected):
    command=["node","--test",GUARD] if name.startswith(("red-", "green-")) else ["node","--test","--test-name-pattern=retired documentation-only closeouts",GUARD]
    p=subprocess.run(command,capture_output=True,text=True)
    (out/(name+".log")).write_text(p.stdout+p.stderr)
    results.append({"name":name,"command":command,"exitCode":p.returncode,"expected":expected})
    assert p.returncode==expected,(name,p.stdout,p.stderr)
    assert "# skipped 0" in p.stdout
    if expected: assert "# fail 1" in p.stdout
check("red-files-still-present",1)
for path in ORIGINALS:(root/path).unlink()
check("green-retired",0)
for i,path in enumerate(ORIGINALS,1):
    p=root/path
    try:
        p.write_bytes(git("show",BASELINE+":"+path));check("restore-"+str(i),1)
    finally:p.unlink(missing_ok=True)
agent=root/"AGENTS.md";saved=agent.read_bytes();first=next(iter(ORIGINALS))
try:
    for name,url,expected in [("relative",first,1),("live-main","https://github.com/dunay2/dvt/blob/main/"+first,1),("git-pinned","https://github.com/dunay2/dvt/blob/"+BASELINE+"/"+first,0)]:
        agent.write_bytes(saved+("\n[Reference]("+url+")\n").encode());check(name,expected)
finally:agent.write_bytes(saved)
check("green-final",0)
# Inspect the complete tracked-text tree; exact Git provenance is not live navigation.
stems=[Path(p).stem for p in ORIGINALS]
provenance=re.compile(r"https://(?:github\.com/dunay2/dvt/(?:blob|tree)|raw\.githubusercontent\.com/dunay2/dvt)/[a-f0-9]{40}/[^\s)\]>\"']+")
references=[]
for raw in git("ls-files","-z").split(b"\0"):
    if not raw:continue
    p=os.fsdecode(raw)
    if p in ORIGINALS or p==GUARD:continue
    try:text=(root/p).read_text()
    except (UnicodeError,FileNotFoundError):continue
    if "\0" in text:continue
    text=provenance.sub("",text)
    for stem in stems:
        if stem in text:references.append({"path":p,"stem":stem})
assert not references,references
assert set(git("diff","--name-only").decode().splitlines())==set(ORIGINALS)|{GUARD}
assert (root/GUARD).read_text().replace(addition,"")==old
(out/"scope.json").write_text(json.dumps({"baseline":BASELINE,"deleted":ORIGINALS,"modified":[GUARD]},indent=2)+"\n")
(out/"mutations.json").write_text(json.dumps(results,indent=2)+"\n")
(out/"consumers.json").write_text(json.dumps(references)+"\n")
print(json.dumps({"retired":len(ORIGINALS),"tests":len(results),"liveConsumers":len(references)}))
