import {project} from './spaces.mjs';
export const BLOCK_EDGE=.052;
export const PITCH=BLOCK_EDGE*2.04; // one full empty display block, plus numeric margin
const key=p=>p.join(',');
const offsets=new Map();
function shell(r){if(!offsets.has(r)){const a=[];for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++)if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z))===r)a.push([x,y,z]);offsets.set(r,a);}return offsets.get(r);}
export function spacedPitch(samples){
 const radius=Math.max(.5,...samples.flatMap(s=>{const b=s.block.renderBounds;return b?[...b.min,...b.max].map(Math.abs):[.5];}));
 return Math.max(PITCH,(2*radius+1.04)*BLOCK_EDGE);
}
export function layout(samples,space,variance=false){
 const pitch=spacedPitch(samples);
 const occupied=new Set(),result=new Array(samples.length);
 // IDs make the result independent of catalog iteration order.
 for(const {s,i} of samples.map((s,i)=>({s,i})).sort((a,b)=>a.s.block.id.localeCompare(b.s.block.id))){
  const raw=project(s.rgb,space,s.block.surface,variance),anchor=raw.map((v,a)=>v/pitch/(a===1?2:1)),base=anchor.map(Math.round);
  let chosen=null,best=Infinity;
  for(let r=0;;r++){
   for(const d of shell(r)){const cell=base.map((v,a)=>v+d[a]);if(occupied.has(key(cell)))continue;const distance=cell.reduce((v,n,a)=>v+(n-anchor[a])**2,0);if(distance<best){best=distance;chosen=cell;}}
   if(chosen&&(r+.5)**2>best)break;
  }
  occupied.add(key(chosen));result[i]=chosen.map((v,a)=>v*(a===1?2:1)||0);
 }
 return result;
}
