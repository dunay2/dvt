/** C0 corpus generator. Unchanged scenarios/seeds from the first experiment. */
function rng(seed){return ()=>{seed=(1664525*seed+1013904223)>>>0; return seed/4294967296;};}
export function shuffle(xs,seed){const r=rng(seed),out=[...xs];for(let i=out.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const task=(id,duration,deps=[],priority=0,resource=null,units=1)=>({id,duration,deps,priority,demand:{global:1,...(resource?{[resource]:units}:{})}});
function fixture(name,tasks,K=2,resources={}){return {name,tasks,capacity:{global:K,...resources}};}
export const fixtures=[
 fixture('independent',[task('a',5),task('b',2),task('c',8)]),
 fixture('chain',[task('a',3),task('b',4,['a']),task('c',2,['b'])]),
 fixture('diamond',[task('a',2),task('b',3,['a']),task('c',5,['a']),task('d',2,['b','c'])]),
 fixture('fan-in',[task('a',4),task('b',2),task('c',3),task('z',1,['a','b','c'])]),
 fixture('fan-out',[task('root',1),task('a',5,['root']),task('b',1,['root']),task('c',8,['root'])]),
 fixture('layer-barrier',[task('a_slow',20),task('b_fast',1),task('c_after',1,['b_fast'])]),
 fixture('structural-win',[task('a_ind',10),task('b_ind',10),task('z_root',1),task('z_tail',20,['z_root'])]),
 fixture('structural-loss',[task('a_long',20),task('b_short',1),task('b_tail',10,['b_short']),task('c_short',1),task('c_tail',10,['c_short'])]),
 fixture('exclusive-resource',[task('a',5,[],0,'pg1'),task('b',4,[],0,'pg1'),task('c',3,[],0,'pg2')],3,{pg1:1,pg2:1}),
 fixture('multi-output-surrogate',[task('a_build',4),task('b_publish',2,['a_build']),task('c_publish',3,['a_build']),task('z_other',7)]),
 fixture('explicit-priority',[task('a_long',20),task('z_urgent',1,[],100)],1),
 fixture('equal-ties',[task('a',2),task('b',2),task('c',2),task('d',2)])
];
export function randomTasks(n,seed){const r=rng(seed),ids=shuffle(Array.from({length:n},(_,i)=>`n${String(i).padStart(5,'0')}`),seed+200),tasks=[];
 for(let i=0;i<n;i++){const ds=new Set();const count=i?Math.floor(r()*4):0;for(let j=0;j<count;j++)ds.add(ids[Math.floor(r()*i)]);tasks.push(task(ids[i],1+Math.floor(r()*20),[...ds]));}return tasks;}
export const generated=Array.from({length:40},(_,i)=>fixture(`random-${i+1}`,randomTasks(24,i+1),3));

export const corpus={fixtures,generated};
