import {schemeCells,lerpColour,slerpColour} from './schemes.mjs';
import {filterBlocks,hexRgb} from './color.mjs';
import {project} from './spaces.mjs';

const steps=512;
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;

/** Locate a colour on the sampled interpolation curve, including between samples. */
function pathPosition(point,path){
 let best=Infinity,position=0;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],axis=path[i].map((v,j)=>v-a[j]),span=distance(a,path[i]);
  const t=span?Math.max(0,Math.min(1,point.reduce((sum,v,j)=>sum+(v-a[j])*axis[j],0)/span)):0;
  const d=distance(point,a.map((v,j)=>v+axis[j]*t));
  if(d<best){best=d;position=(i-1+t)/steps;}
 }
 return position;
}

/** Only materials reached by nearest-colour matching along this Lerp/Slerp path
 * can be browsed. Endpoints compete even when excluded by the scheme filters,
 * providing colour references at both ends of the transition.
 * @param {{collection?:string[],blacklist?:string[]}} lists
 */
export function schemeWheelSearch(scheme,index,blocks,lists={},cells=schemeCells(scheme,blocks,lists)){
 const {collection=[],blacklist=[]}=lists;
 const cell=cells[index],left=cells[index-1]?.block,right=cells[index+1]?.block;
 if(!cell?.block?.hex||cell.anchor||!left?.hex||!right?.hex)return {blocks:[],locate:()=>({index:-1,insertion:0})};
 const rgbA=hexRgb(left.hex),rgbB=hexRgb(right.hex),a=project(rgbA,scheme.space),b=project(rgbB,scheme.space);
 const interpolate=scheme.interpolation==='slerp'?slerpColour:lerpColour;
 const path=Array.from({length:steps+1},(_,i)=>project(interpolate(rgbA,rgbB,i/steps,scheme.space),scheme.space));
 const used=new Set(cells.filter(c=>c.index!==index).map(c=>c.id||c.block?.id));
 const eligible=filterBlocks(blocks,{...scheme.filters,space:scheme.space,custom:scheme.filters.list==='collection'?collection:scheme.filters.list==='blacklist'?blacklist:null,blacklist:scheme.filters.list==='blacklist'?[]:blacklist})
  .filter(block=>block.hex&&block.renderStatus!=='invisible'&&!used.has(block.id))
  .map(block=>({block,point:project(hexRgb(block.hex),scheme.space)}));
 const reached=new Set();
 for(const point of path){
  let nearest=Math.min(distance(point,a),distance(point,b)),winners=[];
  for(const c of eligible){
   const d=distance(point,c.point);
   if(d<nearest-1e-12){nearest=d;winners=[c];}
   else if(Math.abs(d-nearest)<=1e-12)winners.push(c);
  }
  for(const c of winners)reached.add(c.block.id);
 }
 const ranked=eligible.filter(c=>reached.has(c.block.id)).map(c=>({...c,position:pathPosition(c.point,path)})).sort((a,b)=>a.position-b.position||a.block.id.localeCompare(b.block.id));
 return {blocks:ranked.map(c=>c.block),locate(block){
  const index=ranked.findIndex(c=>c.block.id===block.id);
  if(index>=0)return {index,insertion:index};
  const position=pathPosition(project(hexRgb(block.hex),scheme.space),path);
  const insertion=ranked.findIndex(c=>c.position>position||(c.position===position&&c.block.id.localeCompare(block.id)>0));
  return {index:-1,insertion:insertion<0?ranked.length:insertion};
 }};
}

export function schemeWheelCandidates(scheme,index,blocks,lists={},cells=schemeCells(scheme,blocks,lists)){
 return schemeWheelSearch(scheme,index,blocks,lists,cells).blocks;
}

export function stepSchemeWheel(candidates,id,direction,insertion=0){
 const index=candidates.findIndex(block=>block.id===id);
 return index<0?candidates[direction>0?insertion:insertion-1]||null:candidates[Math.max(0,Math.min(candidates.length-1,index+direction))]||null;
}
