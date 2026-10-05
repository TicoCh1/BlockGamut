import {filterBlocks,hexRgb,rgbHex,fromLab,encode} from './color.mjs';
import {coordinates,project,fromHSL,fromHSV,fromXYZ,white} from './spaces.mjs';

export const schemeMime='application/x-block-gamut-block';
export function schemeLength(value){return Math.max(3,Math.round(Number(value)));}
export function resizeAnchors(anchors,oldLength,newLength){
 /** @type {Record<number,string>} */
 const result={};for(const [index,id] of Object.entries(anchors))result[Math.round(Number(index)/(oldLength-1)*(newLength-1))]=id;
 return result;
}
/** Lerp colour-space channels; hue travels the shortest arc, with achromatic
 * endpoints taking the chromatic endpoint's hue. Bicone interpolates chroma. */
export function lerpColour(a,b,t,space){
 const A=[...coordinates(a,space)],B=[...coordinates(b,space)];
 if(space.startsWith('h')){
  if(A[1]<1e-9)A[0]=B[0];if(B[1]<1e-9)B[0]=A[0];
  B[0]=A[0]+((B[0]-A[0]+1.5)%1-.5);
  if(space==='hsl-bicone'){A[1]*=1-Math.abs(2*A[2]-1);B[1]*=1-Math.abs(2*B[2]-1);}
 }
 const c=A.map((v,i)=>v+(B[i]-v)*t);
 if(space.startsWith('h')){
  c[0]=(c[0]+1)%1;
  if(space==='hsl-bicone'){const max=1-Math.abs(2*c[2]-1);c[1]=max>1e-9?c[1]/max:0;}
  return space==='hsv'?fromHSV(c):fromHSL(c);
 }
 if(space==='oklab')return fromLab(c);
 if(space==='linear')return c.map(encode);
 if(space==='xyz')return fromXYZ(c);
 if(space==='lab'){const f=(c[0]+16)/116;return fromXYZ([f+c[1]/500,f,f-c[2]/200].map((v,i)=>(v>6/29?v**3:3*(6/29)**2*(v-4/29))*white[i]));}
 return c;
}
/** Exact anchors survive filtering; missing release anchors keep their slots.
 * Unanchored cells choose the nearest eligible material in the selected space. */
/** @param {any} scheme @param {any[]} blocks @param {{collection?:string[],blacklist?:string[]}} lists */
export function fillScheme(scheme,blocks,{collection=[],blacklist=[]}={}){
 const byId=new Map(blocks.map(b=>[b.id,b]));
 const anchors=Object.entries(scheme.anchors).map(([i,id])=>({index:Number(i),id,block:byId.get(id)})).sort((a,b)=>a.index-b.index);
 const valid=anchors.filter(a=>a.block?.hex);
 const candidates=filterBlocks(blocks,{...scheme.filters,space:scheme.space,custom:scheme.filters.list==='collection'?collection:scheme.filters.list==='blacklist'?blacklist:null,blacklist:scheme.filters.list==='blacklist'?[]:blacklist}).filter(b=>b.hex&&b.renderStatus!=='invisible').map(block=>({block,point:project(hexRgb(block.hex),scheme.space)}));
 return Array.from({length:scheme.length},(_,index)=>{
  const anchor=anchors.find(a=>a.index===index);
  if(anchor)return {index,anchor:true,id:anchor.id,block:anchor.block||null,target:anchor.block?.hex||null};
  if(!valid.length)return {index,anchor:false,block:null,target:null};
  const right=valid.find(a=>a.index>=index)||valid.at(-1),left=[...valid].reverse().find(a=>a.index<=index)||valid[0];
  const rgb=lerpColour(hexRgb(left.block.hex),hexRgb(right.block.hex),left.index===right.index?0:(index-left.index)/(right.index-left.index),scheme.space),point=project(rgb,scheme.space);
  let best=null,distance=Infinity;
  for(const c of candidates){const d=c.point.reduce((sum,v,i)=>sum+(v-point[i])**2,0);if(d<distance){best=c.block;distance=d;}}
  return {index,anchor:false,block:best,target:rgbHex(rgb)};
 });
}
