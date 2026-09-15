import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { computeRank, graph, simulate, validateRanking, validateTrace } from '../src/model.mjs';
import { corpus, fixtures, shuffle } from '../src/corpus.mjs';
const t=(id,duration=1,deps=[],priority=0,demand={global:1})=>({id,duration,deps,priority,demand});

test('frozen corpus is unchanged',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),'556f9aa2acd44da5c0f1f11bdcb3148e3a1346e2b2c9b452cbc7645462758658');
 assert.equal(corpus.fixtures.length,12);assert.equal(corpus.generated.length,40);
});
test('all strategies preserve input, precedence, resources and permutation invariance',()=>{
 for(const f of [...corpus.fixtures,...corpus.generated])for(const policy of ['lexical','downstream','bottom-level','duration-level']){
  const before=JSON.stringify(f),r=computeRank(f.tasks,policy);validateRanking(f.tasks,r.order);
  const trace=simulate(f.tasks,r,f.capacity);assert.equal(JSON.stringify(f),before);
  for(let seed=1;seed<=8;seed++){
   const tasks=shuffle(f.tasks,seed).map(x=>({...x,deps:shuffle(x.deps,seed)}));
   const other=computeRank(tasks,policy);assert.deepEqual(other.order,r.order);
   assert.deepEqual(simulate(tasks,other,f.capacity),trace);
  }
 }
});
test('downstream counts diamond descendant once',()=>{
 const tasks=[t('a'),t('b',1,['a']),t('c',1,['a']),t('d',1,['b','c'])];
 assert.deepEqual(computeRank(tasks,'downstream').scores,{a:4,b:2,c:2,d:1});
});
test('ready queue removes layer barrier without exceeding capacity',()=>{
 const f=fixtures.find(x=>x.name==='layer-barrier'),r=computeRank(f.tasks);
 const ready=simulate(f.tasks,r,f.capacity),layered=simulate(f.tasks,r,f.capacity,{layerBarrier:true});
 assert.equal(ready.makespan,20);assert.equal(layered.makespan,21);
 assert.equal(ready.trace.find(x=>x.id==='c_after').end,2);
 assert.equal(layered.trace.find(x=>x.id==='c_after').end,21);
});
test('explicit priority is applied at dispatch as readiness changes',()=>{
 const tasks=[t('a',2),t('b',5),t('c',1,['b']),t('d',1,['a'],100)];
 const r=computeRank(tasks,'lexical',true),run=simulate(tasks,r,{global:2});
 assert.equal(run.trace.find(x=>x.id==='d').start,2);
 const serial=[t('a',20),t('z',1,[],100)];
 assert.equal(simulate(serial,computeRank(serial,'lexical',true),{global:1}).trace[0].id,'z');
 const dep=[t('a'),t('z',1,['a'],100)];
 assert.equal(simulate(dep,computeRank(dep,'lexical',true),{global:1}).trace[0].id,'a');
});
test('unknown durations allow structural order, not duration-based planning',()=>{
 const tasks=[t('a',null),t('b',null,['a'])];
 for(const kind of ['lexical','downstream','bottom-level'])assert.deepEqual(computeRank(tasks,kind).order,['a','b']);
 assert.throws(()=>computeRank(tasks,'duration-level'),/duration/);
 assert.throws(()=>simulate(tasks,computeRank(tasks),{global:1}),/duration/);
});
test('invalid graph and unknown strategy reject',()=>{
 for(const tasks of [[],[null],[t('a'),t('a')],[t('a',1,['missing'])],[t('a',1,['b']),t('b',1,['a'])],[t('a',1,['a'])],[t('a'),t('b',1,['a','a'])]])assert.throws(()=>graph(tasks));
 assert.throws(()=>computeRank([t('a')],'fake'),/strategy/);
});
test('invalid capacity, demand and duration reject',()=>{
 for(const capacity of [{global:0},{global:-1},{global:1.5},{}])assert.throws(()=>simulate([t('a')],computeRank([t('a')]),capacity));
 for(const demand of [{pg:1},{global:2},{global:0},{global:-1},null,{}]){const tasks=[t('a',1,[],0,demand)];assert.throws(()=>simulate(tasks,computeRank(tasks),{global:1}));}
 for(const duration of [0,-1,1.5,NaN,Infinity]){const tasks=[t('a',duration)];assert.throws(()=>simulate(tasks,computeRank(tasks),{global:1}));}
});
test('independent validator catches corrupt rankings and schedules',()=>{
 const tasks=[t('a'),t('b',1,['a'])];
 for(const order of [['a'],['a','a'],['a','other'],['b','a']])assert.throws(()=>validateRanking(tasks,order));
 assert.throws(()=>validateTrace(tasks,[{id:'a',start:0,end:1},{id:'b',start:0,end:1}],{global:1}));
 assert.throws(()=>validateTrace(tasks,[{id:'a',start:-1,end:0},{id:'b',start:0,end:1}],{global:1}));
});
test('metrics have known analytical values',()=>{
 const tasks=[t('a',2),t('b',2)],r=simulate(tasks,computeRank(tasks),{global:1});
 assert.equal(r.makespan,4);assert.equal(r.meanReadyWait,1);assert.equal(r.outputMean,3);
 assert.equal(r.resources.global.utilization,1);assert.equal(r.resources.global.peak,1);
});
