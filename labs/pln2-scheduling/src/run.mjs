/** Reproducible C0 lab runner. Never imports DVT, SQL, Temporal or an OSS imitation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { corpus, fixtures, randomTasks, shuffle } from './corpus.mjs';
import { computeRank, simulate, validateRanking, measure } from './model.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=x=>createHash('sha256').update(x).digest('hex');
const corpusHash=digest(JSON.stringify(corpus));
const EXPECTED='556f9aa2acd44da5c0f1f11bdcb3148e3a1346e2b2c9b452cbc7645462758658';
const policies=['lexical','downstream','bottom-level','duration-level','explicit-priority'];
const rank=(tasks,policy)=>computeRank(tasks,policy==='explicit-priority'?'lexical':policy,policy==='explicit-priority');

const {values}=parseArgs({options:{out:{type:'string'},external:{type:'string',multiple:true},help:{type:'boolean'}},allowPositionals:false});
if(values.help){console.log('node src/run.mjs --out <new-directory> [--external <probe.json>]');process.exit(0);}
if(!values.out)throw Error('--out <new-directory> is required; existing evidence is never overwritten');
const out=path.resolve(values.out);
if(fs.existsSync(out))throw Error(`Output already exists: ${out}`);
assert.equal(corpusHash,EXPECTED,'C0 corpus changed: version the protocol instead of moving the baseline');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'corpus.json'),JSON.stringify(corpus,null,2)+'\n');
const rows=[];let invariantChecks=0;
for(const f of [...corpus.fixtures,...corpus.generated])for(const policy of policies){
 const before=JSON.stringify(f.tasks),r=rank(f.tasks,policy);
 assert.equal(JSON.stringify(f.tasks),before);validateRanking(f.tasks,r.order);invariantChecks+=2;
 for(let seed=1;seed<=8;seed++){
  const perm=shuffle(f.tasks,seed).map(t=>({...t,deps:shuffle(t.deps,seed)}));
  const pr=rank(perm,policy);assert.deepEqual(pr.order,r.order);
  assert.deepEqual(simulate(perm,pr,f.capacity),simulate(f.tasks,r,f.capacity));invariantChecks+=2;
 }
 const ready=simulate(f.tasks,r,f.capacity),layered=simulate(f.tasks,r,f.capacity,{layerBarrier:true});invariantChecks+=2;
 rows.push({fixture:f.name,policy,scope:policy==='duration-level'?'known-duration diagnostic':'local reference policy',rank:r.order,scores:r.scores,ready,layered});
}
const external=[];
for(const filename of values.external??[]){
 const report=JSON.parse(fs.readFileSync(filename,'utf8'));
 assert.equal(report.corpusSha256,corpusHash,'External corpus mismatch');
 assert(['EXECUTED','UNAVAILABLE','ERROR'].includes(report.status),'Unknown probe status');
 external.push({filename,reportSha256:digest(fs.readFileSync(filename)),status:report.status,backend:report.backend,version:report.version,identityDeterministicInProbe:report.identityDeterministicInProbe??null});
 if(report.status==='ERROR')throw Error(`External probe failed: ${filename}`);
 if(report.status==='UNAVAILABLE')continue;
 assert(['dask','highs'].includes(report.backend),'Unknown external backend');
 const known=new Map([...corpus.fixtures,...corpus.generated].map(f=>[f.name,f]));
 const seen=new Set();
 for(const result of report.results){
  assert(!seen.has(result.fixture),'Duplicate external fixture');seen.add(result.fixture);
  const f=known.get(result.fixture);assert(f,'Unknown external fixture');
  if(result.order){
   validateRanking(f.tasks,result.order);
   const r={order:result.order,rank:new Map(result.order.map((id,i)=>[id,i]))};
   rows.push({fixture:f.name,policy:'dask-real',scope:'upstream rank; local common simulator',ready:simulate(f.tasks,r,f.capacity),layered:simulate(f.tasks,r,f.capacity,{layerBarrier:true}),external:result});
  }else if(result.validated&&result.trace){
   rows.push({fixture:f.name,policy:'highs-native',scope:'solver schedule; known-duration makespan only',ready:{...measure(f.tasks,result.trace,f.capacity),trace:result.trace},external:result});
  }
 }
}
const speed=[];
for(const n of [100,1000])for(const policy of policies){
 const tasks=randomTasks(n,777);for(let i=0;i<3;i++)rank(tasks,policy);
 const samples=[];
 for(let i=0;i<21;i++){const t=performance.now();rank(tasks,policy);samples.push(performance.now()-t);}
 samples.sort((a,b)=>a-b);
 speed.push({n,policy,p50Ms:samples[10],p95Ms:samples[19],maxMs:samples[20],samplesMs:samples});
}
const baseline=new Map(rows.filter(r=>r.policy==='lexical').map(r=>[r.fixture,r.ready.makespan]));
const summary=[...new Set(rows.map(r=>r.policy))].map(policy=>{
 const selected=rows.filter(r=>r.policy===policy);let better=0,equal=0,worse=0,sum=0,baseSum=0,maxDiagnosticRegression=0;
 for(const r of selected){const value=r.ready.makespan,base=baseline.get(r.fixture);sum+=value;baseSum+=base;if(value<base)better++;else if(value>base)worse++;else equal++;if(fixtures.some(f=>f.name===r.fixture))maxDiagnosticRegression=Math.max(maxDiagnosticRegression,value/base-1);}
 const improvement=1-sum/baseSum;
 const p95=speed.find(x=>x.n===1000&&x.policy===policy)?.p95Ms;
 return {policy,fixtures:selected.length,better,equal,worse,sum,baselineSum:baseSum,aggregateImprovement:improvement,maxDiagnosticRegression,p95RankMs1000:p95??null,
  exploratoryQualityGate:policies.includes(policy)&&policy!=='explicit-priority'?improvement>=0.05&&maxDiagnosticRegression<=0.10:null,
  rankingBudgetMet:p95===undefined?null:p95<=250,adoptionApproved:false};
});
const manifest={schemaVersion:'pln2-lab-run.v1',recordedAt:new Date().toISOString(),branchBase:'88b7922f7246386959700da5866e330076f8dd97',referenceBaseline:'9c60b7126597211704c9dfaf69a6d1845b37fe34',scope:'synthetic simulation, not DVT/SQL/Temporal acceptance',corpusSha256:corpusHash,protocolSha256:digest(fs.readFileSync(path.join(ROOT,'PROTOCOL.md'))),
 sourceSha256:Object.fromEntries(fs.readdirSync(path.join(ROOT,'src')).filter(n=>/\.(mjs|py)$/.test(n)).sort().map(n=>[n,digest(fs.readFileSync(path.join(ROOT,'src',n)))])),
 environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,processPeakRssKiB:process.resourceUsage().maxRSS},
 invariantChecks,external,summary,speed};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'traces.json'),JSON.stringify(rows,null,2)+'\n');
const csv=['fixture,policy,makespan,layered_makespan,first_output,mean_output,mean_ready_wait,max_ready_wait',...rows.map(r=>[r.fixture,r.policy,r.ready.makespan,r.layered?.makespan??'',r.ready.firstOutputAt,r.ready.outputMean,r.ready.meanReadyWait,r.ready.maxReadyWait].join(','))].join('\n')+'\n';
fs.writeFileSync(path.join(out,'metrics.csv'),csv);
console.log(JSON.stringify({out,corpusSha256:corpusHash,invariantChecks,summary},null,2));
