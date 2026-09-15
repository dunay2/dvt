/** Laboratory-only policies and simulator. No product imports or provider effects. */
import assert from 'node:assert/strict';
export const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function graph(tasks){
 if(!Array.isArray(tasks)||tasks.length===0)throw Error('non-empty tasks required');
 const by=new Map(); for(const t of tasks){
  if(t===null||typeof t!=='object')throw Error('invalid task');
  if(typeof t.id!=='string'||!t.id||by.has(t.id))throw Error('invalid/duplicate ID');
  if(!Array.isArray(t.deps)||new Set(t.deps).size!==t.deps.length)throw Error('invalid dependencies');
  if(!Number.isSafeInteger(t.priority??0))throw Error('invalid priority');
  by.set(t.id,t);
 }
 const children=new Map([...by.keys()].map(k=>[k,[]]));
 for(const t of tasks)for(const d of t.deps){if(!by.has(d)||d===t.id)throw Error('dangling/self dependency');children.get(d).push(t.id);}
 const degree=new Map(tasks.map(t=>[t.id,t.deps.length]));
 const q=[...degree].filter(([,d])=>!d).map(([id])=>id).sort(cmp), topo=[];
 while(q.length){const id=q.shift();topo.push(id);for(const c of children.get(id)){
  degree.set(c,degree.get(c)-1);if(!degree.get(c)){q.push(c);q.sort(cmp);}
 }}
 if(topo.length!==tasks.length)throw Error('cycle');
 return {by,children,topo};
}
export function computeRank(tasks,kind='lexical',explicit=false){
 if(!['lexical','downstream','bottom-level','duration-level'].includes(kind))throw Error('unknown strategy');
 const g=graph(tasks),desc=new Map(),level=new Map(),timed=new Map();
 for(const id of [...g.topo].reverse()){
  const cs=g.children.get(id);
  if(kind==='downstream') {const set=new Set(); for(const c of cs){set.add(c);for(const d of desc.get(c))set.add(d);}desc.set(id,set);}
  if(kind==='bottom-level')level.set(id,1+Math.max(0,...cs.map(c=>level.get(c))));
  if(kind==='duration-level'){
   const dur=g.by.get(id).duration;
   if(!Number.isSafeInteger(dur)||dur<=0)throw Error('duration evidence required');
   timed.set(id,dur+Math.max(0,...cs.map(c=>timed.get(c))));
  }
 }
 const score=id=>kind==='downstream'?1+desc.get(id).size:kind==='bottom-level'?level.get(id):kind==='duration-level'?timed.get(id):0;
 const comparator=(a,b)=> (explicit?((g.by.get(b).priority??0)-(g.by.get(a).priority??0)):0) || score(b)-score(a)||cmp(a,b);
 // Produce a total topological ranking, never schedule a node before dependencies.
 const degree=new Map(tasks.map(t=>[t.id,t.deps.length]));
 const q=tasks.filter(t=>!t.deps.length).map(t=>t.id),order=[];
 while(q.length){q.sort(comparator);const id=q.shift();order.push(id);for(const c of g.children.get(id)){
  degree.set(c,degree.get(c)-1);if(!degree.get(c))q.push(c);
 }}
 return {order,explicitPriority:explicit,rank:new Map(order.map((id,i)=>[id,i])),scores:Object.fromEntries(g.topo.map(id=>[id,score(id)]))};
}
export function layersOf(tasks){const g=graph(tasks),d=new Map();for(const id of g.topo)d.set(id,Math.max(-1,...g.by.get(id).deps.map(dep=>d.get(dep)))+1);return d;}
export function simulate(tasks,ranking,capacity,{layerBarrier=false}={}){
 const g=graph(tasks); validateRanking(tasks,ranking.order); const layers=layersOf(tasks);
 if(capacity===null||typeof capacity!=='object'||Object.keys(capacity).length===0)throw Error('capacity required');
 if(!Number.isSafeInteger(tasks.reduce((s,t)=>s+t.duration,0)))throw Error('invalid duration horizon');
 for(const [r,c] of Object.entries(capacity))if(!Number.isSafeInteger(c)||c<=0)throw Error('invalid capacity');
 for(const t of tasks){
  if(!Number.isSafeInteger(t.duration)||t.duration<=0)throw Error('duration evidence required');
  if(t.demand===null||typeof t.demand!=='object'||!Object.keys(t.demand).length)throw Error('demand required');
  for(const [r,v] of Object.entries(t.demand))if(!Number.isSafeInteger(v)||v<=0||!Object.hasOwn(capacity,r)||v>capacity[r])throw Error('impossible demand');
 }
 const completed=new Set(),started=new Set(),running=[],usage=Object.fromEntries(Object.keys(capacity).map(k=>[k,0]));
 const trace=[];let now=0;
 while(completed.size<tasks.length){
  const lowest=Math.min(...tasks.filter(t=>!completed.has(t.id)).map(t=>layers.get(t.id)));
  const candidates=tasks.filter(t=>!started.has(t.id)&&t.deps.every(d=>completed.has(d))&&(!layerBarrier||layers.get(t.id)===lowest)).sort((a,b)=>(ranking.explicitPriority?((b.priority??0)-(a.priority??0)):0)||ranking.rank.get(a.id)-ranking.rank.get(b.id));
  for(const t of candidates){
   if(Object.entries(t.demand).some(([r,v])=>usage[r]+v>capacity[r]))continue;
   for(const [r,v] of Object.entries(t.demand))usage[r]+=v;
   const row={id:t.id,start:now,end:now+t.duration};trace.push(row);running.push(row);started.add(t.id);
  }
  if(!running.length)throw Error('deadlock');
  now=Math.min(...running.map(x=>x.end));
  const ended=running.filter(x=>x.end===now).sort((a,b)=>cmp(a.id,b.id));
  for(const x of ended){completed.add(x.id);running.splice(running.indexOf(x),1);for(const [r,v] of Object.entries(g.by.get(x.id).demand))usage[r]-=v;}
 }
 validateTrace(tasks,trace,capacity);
 return {...measure(tasks,trace,capacity),trace};
}
export function validateTrace(tasks,trace,cap){
 assert.equal(trace.length,tasks.length);assert.equal(new Set(trace.map(t=>t.id)).size,tasks.length);
 const by=new Map(trace.map(t=>[t.id,t]));
 for(const t of tasks){const x=by.get(t.id);assert(x);assert(Number.isSafeInteger(x.start)&&x.start>=0);assert(Number.isSafeInteger(x.end)&&x.end>x.start);assert.equal(x.end-x.start,t.duration);for(const dep of t.deps)assert(by.get(dep).end<=x.start);}
 // Independent interval-sweep validator, recomputes usage from scratch.
 for(const instant of [...new Set(trace.flatMap(t=>[t.start,t.end]))])for(const [r,capacity] of Object.entries(cap)){
  const used=tasks.filter(t=>{const x=by.get(t.id);return x.start<=instant&&instant<x.end;}).reduce((s,t)=>s+(t.demand[r]??0),0);assert(used<=capacity);
 }
}

export function validateRanking(tasks,order){
 const g=graph(tasks);
 assert(Array.isArray(order));assert.equal(order.length,tasks.length);
 assert.equal(new Set(order).size,tasks.length);
 const pos=new Map(order.map((id,i)=>[id,i]));
 for(const t of tasks){assert(pos.has(t.id));for(const dep of t.deps)assert(pos.get(dep)<pos.get(t.id));}
 return g;
}
export function measure(tasks,trace,capacity){
 validateTrace(tasks,trace,capacity);
 const g=graph(tasks),by=new Map(trace.map(x=>[x.id,x]));
 const makespan=Math.max(...trace.map(x=>x.end));
 const outputs=trace.filter(x=>!g.children.get(x.id).length);
 const waits=tasks.map(t=>by.get(t.id).start-Math.max(0,...t.deps.map(d=>by.get(d).end)));
 const instants=[...new Set(trace.flatMap(x=>[x.start,x.end]))];
 const resources=Object.fromEntries(Object.entries(capacity).map(([r,c])=>[r,{
  capacity:c,
  utilization:tasks.reduce((s,t)=>s+t.duration*(t.demand[r]??0),0)/(makespan*c),
  peak:Math.max(...instants.map(at=>tasks.filter(t=>by.get(t.id).start<=at&&at<by.get(t.id).end).reduce((s,t)=>s+(t.demand[r]??0),0)))
 }]));
 return {makespan,firstOutputAt:Math.min(...outputs.map(x=>x.end)),outputMean:outputs.reduce((s,x)=>s+x.end,0)/outputs.length,meanReadyWait:waits.reduce((s,x)=>s+x,0)/waits.length,maxReadyWait:Math.max(...waits),resources,startOrder:trace.map(x=>x.id)};
}
