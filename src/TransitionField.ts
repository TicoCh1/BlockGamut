import * as T from 'three';
import {createVoxelField} from './VoxelField';
import {motionAt} from './motion.mjs';
import {sectionTest} from './voxels.mjs';
import type {Sample,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';

type Snapshot={samples:Sample[];grid:VoxelData};
/** Reuse native model/fragment batches throughout motion. No neighbour culling
 * while cells separate; the settled renderer restores it at the destination. */
export function createTransitionField(resources:ModelResources,before:Snapshot,after:Snapshot,plan:any){
 const mesh=new T.Group();
 const groups=[{snapshot:before,actors:plan.actors.map((a:any,i:number)=>({a,i})).filter(({a}:any)=>a.from!==null),source:'from'},
  {snapshot:after,actors:plan.actors.map((a:any,i:number)=>({a,i})).filter(({a}:any)=>a.from===null),source:'to'}].map(group=>{
  const {snapshot,actors,source}=group,indices=actors.map(({a}:any)=>a[source]);
  const grid={...snapshot.grid,mode:plan.denseFade?'packed' as const:snapshot.grid.mode,cells:indices.map((i:number)=>snapshot.grid.cells[i]),indices:indices.map((i:number)=>snapshot.grid.indices[i])};
  const field=createVoxelField(resources,snapshot.samples,grid,false,true);
  field.update({enabled:false,axis:'y',position:100,style:'cutaway',flip:false});
  field.mesh.traverse(o=>{o.userData.motionSamples=snapshot.samples;});mesh.add(field.mesh);
  return {...group,grid,field};
 });
 let current=plan.start;
 return {mesh,apply(progress:number,section:VoxelSection){
  current=motionAt(plan,progress);
  for(const group of groups){const cells:number[][]=[],visible:number[]=[];
   group.actors.forEach(({a,i}:any,index:number)=>{
    cells.push(current[i].map((v:number)=>v/group.grid.pitch-group.grid.origin));
    const snapshot=a.to!==null?after:before,cellIndex=a.to??a.from;
    const shown=snapshot.grid.mode==='spaced'||sectionTest(snapshot.grid.cells[cellIndex],snapshot.grid,section);
    if(shown&&(a.kind!=='exit'||progress<1)&&(a.from!==null||progress>0))visible.push(index);
   });group.field.positions(cells,visible);
  }
 },setFade(value:number){groups.forEach(g=>g.field.setFade(value));},select(id:string){groups.forEach(g=>g.field.select(id));},sort(camera:T.Camera){groups.forEach(g=>g.field.sort(camera));},
 position(id:string){const index=plan.actors.findIndex((a:any)=>{const snapshot=a.to!==null?after:before;return snapshot.samples[snapshot.grid.indices[a.to??a.from]].block.id===id;});return index<0?null:current[index];}};
}

/** Keep dense fields static and neighbour-culled. Only the small representative
 * field uploads matrices/transparent vertices while moving. Fade uses uniforms. */
export function createDenseTransitionField(resources:ModelResources,before:Snapshot,after:Snapshot,plan:any,oldField:ReturnType<typeof createVoxelField>,nextField:ReturnType<typeof createVoxelField>){
 const representatives=createTransitionField(resources,before,after,plan),mesh=new T.Group();
 oldField.mesh.traverse(o=>{o.userData.motionSamples=before.samples;});
 nextField.mesh.traverse(o=>{o.userData.motionSamples=after.samples;});
 mesh.add(oldField.mesh,nextField.mesh,representatives.mesh);
 let lastSection:VoxelSection|null=null;
 const clamp=(v:number)=>Math.max(0,Math.min(1,v)),smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
 return {mesh,apply(progress:number,section:VoxelSection){
  if(lastSection&&lastSection!==section){oldField.update({...section,enabled:before.grid.mode!=='spaced'&&section.enabled});nextField.update({...section,enabled:after.grid.mode!=='spaced'&&section.enabled});}
  lastSection=section;
  oldField.setFade(1-smooth(progress/.2));
  representatives.apply(clamp(progress/.75),section);
  representatives.setFade(1-smooth((progress-.75)/.25));
  nextField.setFade(smooth((progress-.7)/.3));
 },select(id:string){oldField.select(id);nextField.select(id);representatives.select(id);},
 sort(camera:T.Camera){if(oldField.mesh.visible)oldField.sort(camera);if(nextField.mesh.visible)nextField.sort(camera);if(representatives.mesh.visible)representatives.sort(camera);},
 position:representatives.position};
}
