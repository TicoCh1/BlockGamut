import {modelVertices} from './blockGeometry.mjs';
const attributes={positions:3,uvs:2,colors:3,tiles:1,localUvs:2};
const empty=()=>Object.fromEntries(Object.keys(attributes).map(k=>[k,[]]));
function vertex(g,i){return Object.fromEntries(Object.entries(attributes).map(([k,n])=>[k,g[k].slice(i*n,(i+1)*n)]));}
function append(g,v){for(const k in attributes)g[k].push(...v[k]);}
export function geometryBounds(g){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<g.positions.length;i++){const a=i%3;min[a]=Math.min(min[a],g.positions[i]);max[a]=Math.max(max[a],g.positions[i]);}return {min,max,size:min.map((v,a)=>max[a]-v)};}
export function cleanModelGeometry(model,atlas){
 const raw=modelVertices(model,atlas),g=empty(),seen=new Set();
 // Retain opposite winding (the back of a zero-thickness face), but remove
 // repeated triangles with the same winding. FrontSide then draws one side only.
 for(let i=0;i<raw.positions.length/3;i+=3){const vertices=[0,1,2].map(j=>vertex(raw,i+j)),p=vertices.map(v=>v.positions),a=p[1].map((v,k)=>v-p[0][k]),b=p[2].map((v,k)=>v-p[0][k]);
  const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...normal);if(length<1e-10)continue;
  const key=p.map(v=>v.map(n=>n.toFixed(6)).join(',')).sort().join('|')+'|'+normal.map(n=>(n/length).toFixed(4)).join(',');if(seen.has(key))continue;seen.add(key);vertices.forEach(v=>append(g,v));
 }return g;
}
export function modelSpan(g){return geometryBounds(g).size.map(v=>Math.max(1,Math.ceil(v-1e-6)));}
export function cropGeometry(g,min=[-.5,-.5,-.5],max=[.5,.5,.5]){
 const out=empty();for(let i=0;i<g.positions.length/3;i+=3){let poly=[0,1,2].map(j=>vertex(g,i+j));
  for(let axis=0;axis<3;axis++)for(const side of [0,1]){const bound=side?max[axis]:min[axis],next=[];const distance=v=>side?bound-v.positions[axis]:v.positions[axis]-bound;
   for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],da=distance(a),db=distance(b);if(da>=-1e-8)next.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);next.push(Object.fromEntries(Object.keys(attributes).map(k=>[k,a[k].map((v,n)=>v+(b[k][n]-v)*t)])));}}
   poly=next;
  }
  for(let j=1;j+1<poly.length;j++)for(const v of [poly[0],poly[j],poly[j+1]])append(out,v);
 }return out;
}
export function tiledFragment(g,cell){
 const bounds=geometryBounds(g),span=modelSpan(g),offset=cell.map((v,a)=>((v%span[a])+span[a])%span[a]);
 const shifted={...g,positions:g.positions.map((v,i)=>{const a=i%3;return v-(span[a]>1?bounds.min[a]+.5:0)-offset[a];})};
 // A face exactly on a tile seam belongs to the cell behind its normal.
 // Assign it once: inclusive clipping alone duplicates coplanar bed-half faces.
 const owned=empty();for(let i=0;i<shifted.positions.length/3;i+=3){const v=[0,1,2].map(j=>vertex(shifted,i+j)),p=v.map(q=>q.positions),a=p[1].map((n,k)=>n-p[0][k]),b=p[2].map((n,k)=>n-p[0][k]),normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const duplicate=[0,1,2].some(axis=>(offset[axis]>0&&p.every(q=>Math.abs(q[axis]+.5)<1e-8)&&normal[axis]>0)||(offset[axis]<span[axis]-1&&p.every(q=>Math.abs(q[axis]-.5)<1e-8)&&normal[axis]<0));
  if(!duplicate)v.forEach(q=>append(owned,q));
 }return cropGeometry(owned);
}
export const faceDirections=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
export function cullCubeGeometry(g,mask){
 if(!mask)return g;const out=empty();for(let i=0;i<g.positions.length/3;i+=3){let hidden=false;for(let f=0;f<6;f++){if(!(mask&(1<<f)))continue;const axis=Math.floor(f/2),plane=f%2?-.5:.5;if([0,1,2].every(j=>Math.abs(g.positions[(i+j)*3+axis]-plane)<1e-6)){hidden=true;break;}}
  if(!hidden)for(let j=0;j<3;j++)append(out,vertex(g,i+j));
 }return out;
}
/** Minecraft Block.shouldRenderFace behavior for complete unit-cube neighbours. */
export function hiddenFaceMask(cell,sample,occupied,info){let mask=0;for(let f=0;f<6;f++){const key=cell.map((v,a)=>v+faceDirections[f][a]).join(','),other=occupied.get(key);if(other===undefined)continue;const neighbour=info[other];if(neighbour.cube&&(neighbour.opaque||(other===sample&&info[sample].joinSame)))mask|=1<<f;}return mask;}
