import {BLOCK_EDGE} from './layout.mjs';
import {project} from './spaces.mjs';

export const MOTION_MS=1000;
const epsilon=1e-8;
const distance=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
const key=p=>p.map(v=>v.toFixed(7)).join(',');
const point=(grid,i)=>grid.cells[i].map(v=>(v+grid.origin)*grid.pitch);
const compare=(a,b)=>a.p[0]-b.p[0]||a.p[1]-b.p[1]||a.p[2]-b.p[2]||a.i-b.i;
const normals=[];
for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z){const length=Math.hypot(x,y,z);normals.push([x/length,y/length,z/length]);}
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
function bounds(snapshot,i){
 const b=snapshot.samples[snapshot.grid.indices[i]].block.renderBounds;
 return snapshot.grid.mode==='dense'||!b?{min:[-.5,-.5,-.5],max:[.5,.5,.5]}:b;
}
/** Conservative 26-support-plane envelope of displayed native model surfaces,
 * not the theoretical RGB cube. Remains defined for empty/coplanar selections. */
export function displayEnvelope(snapshot){
 if(!snapshot?.grid.cells.length)return [];
 const planes=normals.map(normal=>({normal,offset:-Infinity}));
 snapshot.grid.cells.forEach((_,i)=>{const p=point(snapshot.grid,i),b=bounds(snapshot,i);
  for(const plane of planes){const extent=plane.normal.map((v,a)=>(v>=0?b.max[a]:b.min[a])*BLOCK_EDGE);plane.offset=Math.max(plane.offset,dot(plane.normal,p)+dot(plane.normal,extent));}
 });return planes;
}
function boundaryPoint(p,envelope,b){
 let best=Infinity,result=[...p];
 for(const plane of envelope)for(let axis=0;axis<3;axis++)for(const direction of [-1,1]){
  const component=plane.normal[axis]*direction;if(component<=epsilon)continue;
  // The entire model, including a bed/banner overhang, clears the support plane.
  const near=plane.normal.map((v,a)=>(v>=0?b.min[a]:b.max[a])*BLOCK_EDGE);
  const travel=Math.max(BLOCK_EDGE*.1,(plane.offset-dot(plane.normal,p)-dot(plane.normal,near)+BLOCK_EDGE*.1)/component);
  if(travel<best){best=travel;result=[...p];result[axis]+=direction*travel;}
 }return result;
}
/** Every route starts at t=0 and finishes at t=1. Travel is axis-aligned,
 * including turns; duration never depends on distance or actor count. */
function track(start,goal){
 const path=[[...start]],axes=[0,1,2].sort((a,b)=>Math.abs(goal[b]-start[b])-Math.abs(goal[a]-start[a])||a-b);
 let length=0;const stops=[0];
 for(const axis of axes)if(Math.abs(goal[axis]-start[axis])>epsilon){const p=[...path.at(-1)];p[axis]=goal[axis];length+=distance(path.at(-1),p);path.push(p);stops.push(length);}
 return {path,stops,length};
}
function at(route,progress){
 if(progress<=0)return [...route.path[0]];if(progress>=1||!route.length)return [...route.path.at(-1)];
 const travelled=progress*route.length;
 for(let i=1;i<route.path.length;i++)if(travelled<=route.stops[i]){const u=(travelled-route.stops[i-1])/(route.stops[i]-route.stops[i-1]),e=u*u*(3-2*u);return route.path[i-1].map((v,a)=>v+(route.path[i][a]-v)*e);}
 return [...route.path.at(-1)];
}
export function planMotion(start,goal){return {start,goal,tracks:start.map((p,i)=>track(p,goal[i])),end:MOTION_MS};}
export function motionAt(plan,progress){const t=Math.max(0,Math.min(1,progress));return plan.tracks.map(route=>at(route,t));}
function fragment(snapshot,i){
 const block=snapshot.samples[snapshot.grid.indices[i]].block;
 if(snapshot.grid.mode!=='dense'||['cube','transparent'].includes(block.geometryClass))return 'native';
 const span=(block.renderBounds?.size||[1,1,1]).map(v=>Math.max(1,Math.ceil(v-1e-6)));
 return 'tile:'+snapshot.grid.cells[i].map((v,a)=>((v%span[a])+span[a])%span[a]).join(',');
}
function instances(snapshot){return snapshot.grid.cells.map((_,i)=>({i,id:snapshot.samples[snapshot.grid.indices[i]].block.id,p:point(snapshot.grid,i),shape:fragment(snapshot,i)}));}
/** Match exact positions first, then stable spatial order per material/fragment.
 * This is O(n log n), including dense repetitions, and independent of locale.
 * New dense copies start on an existing instance, never on the envelope. */
export function planTransition(before,after){
 if(before.grid.mode==='dense'||after.grid.mode==='dense')return planDenseTransition(before,after);
 const old=instances(before),next=instances(after),oldEnvelope=displayEnvelope(before),nextEnvelope=displayEnvelope(after),actors=[];
 const oldGroups=new Map(),newGroups=new Map(),sources=new Map();
 for(const item of old){const k=item.id+'|'+item.shape;const group=oldGroups.get(k)||[];group.push(item);oldGroups.set(k,group);const list=sources.get(item.id)||[];list.push(item);sources.set(item.id,list);}
 for(const item of next){const k=item.id+'|'+item.shape;const group=newGroups.get(k)||[];group.push(item);newGroups.set(k,group);}
 const add=(from,to,start,goal,kind,source=null)=>actors.push({from,to,start,goal,kind,source,route:track(start,goal)});
 const unmatched=[];
 for(const k of new Set([...oldGroups.keys(),...newGroups.keys()])){
  const a=oldGroups.get(k)||[],b=newGroups.get(k)||[],exact=new Map(a.map(item=>[key(item.p),item])),used=new Set(),remaining=[];
  for(const target of b){const origin=exact.get(key(target.p));if(origin&&!used.has(origin.i)){used.add(origin.i);add(origin.i,target.i,origin.p,target.p,'keep');}else remaining.push(target);}
  const available=a.filter(item=>!used.has(item.i)).sort(compare);remaining.sort(compare);
  const count=Math.min(available.length,remaining.length);
  for(let i=0;i<count;i++)add(available[i].i,remaining[i].i,available[i].p,remaining[i].p,'keep');
  for(const origin of available.slice(count))add(origin.i,null,origin.p,boundaryPoint(origin.p,oldEnvelope,bounds(before,origin.i)),'exit');
  unmatched.push(...remaining.slice(count));
 }
 const cursors=new Map();
 for(const target of unmatched){const candidates=sources.get(target.id),clone=after.grid.mode==='dense'&&candidates?.length;
  if(clone){const cursor=cursors.get(target.id)||0,origin=candidates[cursor%candidates.length];cursors.set(target.id,cursor+1);add(null,target.i,origin.p,target.p,'clone',origin.i);}
  else add(null,target.i,boundaryPoint(target.p,nextEnvelope,bounds(after,target.i)),target.p,'enter');
 }
 // An entirely new dense material enters once, then its siblings share that
 // envelope seed instead of appearing independently throughout the volume.
 if(after.grid.mode==='dense'){const seeds=new Map();for(const actor of actors)if(actor.kind==='enter'){
  const id=after.samples[after.grid.indices[actor.to]].block.id,seed=seeds.get(id);
  if(seed){actor.start=[...seed.start];actor.kind='clone';actor.route=track(actor.start,actor.goal);}else seeds.set(id,actor);
 }}
 return {actors,tracks:actors.map(a=>a.route),start:actors.map(a=>a.start),goal:actors.map(a=>a.goal),end:MOTION_MS,oldEnvelope,nextEnvelope,changed:actors.some(a=>a.kind!=='keep'||a.route.length>epsilon)};
}

/** Dense repetitions stay in culled static fields. Only one native representative
 * per material moves; no clone tracks, fragment routes or per-cell frame updates. */
function planDenseTransition(before,after){
 const oldEnvelope=displayEnvelope(before),nextEnvelope=displayEnvelope(after),groups=snapshot=>{
  const map=new Map();for(const item of instances(snapshot)){const list=map.get(item.id)||[];list.push(item);map.set(item.id,list);}return map;
 },old=groups(before),next=groups(after),actors=[];
 const squared=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
 const nearest=(list,p)=>list.reduce((best,item)=>squared(item.p,p)<squared(best.p,p)-epsilon?item:best);
 for(const id of new Set([...old.keys(),...next.keys()])){
  const a=old.get(id),b=next.get(id);let source,target;
  if(b){const sample=after.samples[after.grid.indices[b[0].i]],ideal=sample.rgb?project(sample.rgb,after.grid.space,sample.block.surface,after.grid.variance):b[0].p;target=nearest(b,ideal);}
  if(a)source=nearest(a,target?.p||a[0].p);
  const nativeBounds=(snapshot,i)=>snapshot.samples[snapshot.grid.indices[i]].block.renderBounds||{min:[-.5,-.5,-.5],max:[.5,.5,.5]};
  const start=source?.p||boundaryPoint(target.p,nextEnvelope,nativeBounds(after,target.i));
  const goal=target?.p||boundaryPoint(source.p,oldEnvelope,nativeBounds(before,source.i));
  actors.push({from:source?.i??null,to:target?.i??null,start,goal,kind:source?(target?'keep':'exit'):'enter',route:track(start,goal)});
 }
 return {denseFade:true,actors,tracks:actors.map(a=>a.route),start:actors.map(a=>a.start),goal:actors.map(a=>a.goal),end:MOTION_MS,oldEnvelope,nextEnvelope,changed:!!(before.grid.cells.length||after.grid.cells.length)};
}
