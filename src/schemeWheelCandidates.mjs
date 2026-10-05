import {schemeCells,lerpColour,slerpColour} from './schemes.mjs';
import {filterBlocks,hexRgb} from './color.mjs';
import {project} from './spaces.mjs';

/** Browse unused matches between the immediately adjacent visible blocks.
 * The two planes perpendicular to their colour-space chord bound the interval;
 * distance to the Lerp/Slerp midpoint orders alternatives within that interval.
 * @param {{collection?:string[],blacklist?:string[]}} lists
 */
export function schemeWheelCandidates(scheme,index,blocks,lists={},cells=schemeCells(scheme,blocks,lists)){
 const {collection=[],blacklist=[]}=lists;
 const cell=cells[index],left=cells[index-1]?.block,right=cells[index+1]?.block;
 if(!cell?.block||cell.anchor||!left?.hex||!right?.hex)return [];
 const a=project(hexRgb(left.hex),scheme.space),b=project(hexRgb(right.hex),scheme.space),axis=b.map((v,i)=>v-a[i]);
 const span=axis.reduce((sum,v)=>sum+v*v,0);
 const interpolate=scheme.interpolation==='slerp'?slerpColour:lerpColour;
 const target=project(interpolate(hexRgb(left.hex),hexRgb(right.hex),.5,scheme.space),scheme.space);
 const used=new Set(cells.filter(c=>c.index!==index).map(c=>c.id||c.block?.id));
 return filterBlocks(blocks,{...scheme.filters,space:scheme.space,custom:scheme.filters.list==='collection'?collection:scheme.filters.list==='blacklist'?blacklist:null,blacklist:scheme.filters.list==='blacklist'?[]:blacklist})
  .filter(block=>block.hex&&block.renderStatus!=='invisible'&&!used.has(block.id))
  .map(block=>{const point=project(hexRgb(block.hex),scheme.space);return {block,point,distance:point.reduce((sum,v,i)=>sum+(v-target[i])**2,0)};})
  .filter(({point})=>{const along=point.reduce((sum,v,i)=>sum+(v-a[i])*axis[i],0);return span===0?point.every((v,i)=>Math.abs(v-a[i])<1e-12):along>=-1e-12&&along<=span+1e-12;})
  .sort((a,b)=>a.distance-b.distance||a.block.id.localeCompare(b.block.id))
  .map(({block})=>block);
}

export function stepSchemeWheel(candidates,id,direction){
 const index=candidates.findIndex(block=>block.id===id);
 return candidates[Math.max(0,Math.min(candidates.length-1,index+direction))]||null;
}
