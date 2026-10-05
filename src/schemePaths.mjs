import {slerpVector,schemeCells,uniqueScheme} from './schemes.mjs';
import {visibleVoxels} from './voxels.mjs';
import {BLOCK_EDGE} from './layout.mjs';

/** Pins are curve endpoints; every actual scheme slot is highlighted. */
export function schemeHighlight(scheme,blocks,lists={}){
 scheme=uniqueScheme(scheme);
 const cells=schemeCells(scheme,blocks,lists),visible=cells.filter(c=>c.block?.hex);
 const controls=Object.keys(scheme.anchors).length?cells.filter(c=>c.anchor):[visible[0],visible.at(-1)].filter((c,i,a)=>c&&a.indexOf(c)===i);
 return {id:scheme.id,interpolation:scheme.interpolation||'lerp',controls:controls.map(c=>c.id||c.block.id),blockIds:cells.map(c=>c.id||c.block?.id).filter(Boolean)};
}
/** Display coordinates include packing, native model bounds and section visibility.
 * LERP is a straight segment; SLERP follows an arc about the display origin. */
export function displayedSchemePaths(highlights,samples,grid,section,steps=64){
 if(!highlights.length)return [];
 const positions=new Map();
 for(const index of visibleVoxels(grid,section)){
  const sample=samples[grid.indices[index]],bounds=sample.block.renderBounds;
  const point=grid.cells[index].map((v,a)=>(v+grid.origin)*grid.pitch+(grid.mode==='dense'||!bounds?0:(bounds.min[a]+bounds.max[a])/2*BLOCK_EDGE));
  for(const block of sample.block.variants||[sample.block])if(!positions.has(block.id))positions.set(block.id,point);
  if(!positions.has(sample.block.id))positions.set(sample.block.id,point);
 }
 return highlights.map(h=>{
  const segments=[];
  for(let i=1;i<h.controls.length;i++){
   const a=positions.get(h.controls[i-1]),b=positions.get(h.controls[i]);if(!a||!b)continue;
   segments.push(Array.from({length:steps+1},(_,j)=>h.interpolation==='slerp'?slerpVector(a,b,j/steps):a.map((v,k)=>v+(b[k]-v)*j/steps)));
  }
  return {id:h.id,segments,controls:h.controls.map(id=>positions.get(id)).filter(Boolean)};
 });
}
