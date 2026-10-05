import * as T from 'three';
import {visibleVoxels} from './voxels.mjs';
import {BLOCK_EDGE} from './layout.mjs';
import {bufferGeometry,surfaceMaterial} from './modelRender';
import {cleanModelGeometry,geometryBounds,modelSpan,tiledFragment,cullCubeGeometry,hiddenFaceMask} from './renderGeometry.mjs';
import {modelClass} from './modelClass.mjs';
import type {Sample,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';
/** Native cutout batches plus one globally triangle-sorted translucent surface. */
export function createVoxelField(resources:ModelResources,samples:Sample[],data:VoxelData,dynamicSection=false,moving=false){
 const mesh=new T.Group(),matrix=new T.Matrix4(),size=BLOCK_EDGE,fade={value:1};
 const info=samples.map(s=>{const model=resources.pack.models[s.block.id],g=cleanModelGeometry(model,resources.pack.atlas);return {g,bounds:geometryBounds(g),span:modelSpan(g),cube:['cube','transparent'].includes(modelClass(model,resources.pack.atlas)),opaque:!!model.opaqueSurface,joinSame:model.renderLayer==='TRANSLUCENT'||s.block.id==='minecraft:glass',transparent:model.renderLayer==='TRANSLUCENT',portal:/^minecraft:end_(portal|gateway)$/.test(s.block.id)?1:0};});
 const cube=new T.BoxGeometry(1,1,1),edges=new T.EdgesGeometry(cube),outlineGeometry=new T.InstancedBufferGeometry();
 outlineGeometry.setAttribute('position',edges.attributes.position.clone());cube.dispose();edges.dispose();
 const offsets=new T.InstancedBufferAttribute(new Float32Array(Math.max(1,data.cells.length)*3),3),extents=offsets.clone();const outlineColours=offsets.clone();outlineGeometry.setAttribute('outlineColour',outlineColours);outlineGeometry.setAttribute('offset',offsets);outlineGeometry.setAttribute('extent',extents);outlineGeometry.instanceCount=0;
 const outline=new T.LineSegments(outlineGeometry,new T.ShaderMaterial({depthTest:false,depthWrite:false,vertexShader:'attribute vec3 offset; attribute vec3 extent; attribute vec3 outlineColour; varying vec3 vColour; void main(){vColour=outlineColour;gl_Position=projectionMatrix*modelViewMatrix*vec4(position*extent+offset,1.);}',fragmentShader:'varying vec3 vColour; void main(){gl_FragColor=vec4(vColour,1.);}'}));
 outline.renderOrder=92;outline.frustumCulled=false;outline.raycast=()=>{};mesh.add(outline);
 let selected=-1,schemeSelected=new Set<number>(),visibleIndices:number[]=[],cells=data.cells,transparent:T.Mesh|null=null,sortDirty=true,lastCamera='';
 let transparentLocal:number[]=[],transparentCells:number[]=[],centroids:number[]=[];
 const batches:{batch:T.InstancedMesh;indices:number[]}[]=[];
 const highlight=()=>{let count=0;for(const index of visibleIndices)if(data.indices[index]===selected||schemeSelected.has(data.indices[index])){const p=cells[index],bounds=info[data.indices[index]].bounds,dense=data.mode==='dense';offsets.setXYZ(count,...p.map((v,a)=>(v+data.origin)*data.pitch+(dense?0:(bounds.min[a]+bounds.max[a])/2*size)) as [number,number,number]);outlineColours.setXYZ(count,...(data.indices[index]===selected?[1,.74,.3]:[.4,1,.85]) as [number,number,number]);extents.setXYZ(count++,...[0,1,2].map(a=>(dense?1:bounds.size[a]+.025)*size*1.01) as [number,number,number]);}outlineGeometry.instanceCount=count;outline.visible=count>0;offsets.needsUpdate=true;extents.needsUpdate=true;outlineColours.needsUpdate=true;mesh.userData.schemeHighlightCount=visibleIndices.filter(index=>schemeSelected.has(data.indices[index])).length;};
 function move(){
  const visible=moving?new Set(visibleIndices):null;
  for(const {batch,indices} of batches){let count=0;for(const index of indices){if(visible&&!visible.has(index))continue;matrix.makeScale(size,size,size);matrix.setPosition(...cells[index].map(v=>(v+data.origin)*data.pitch) as [number,number,number]);batch.setMatrixAt(count++,matrix);}batch.count=count;batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}
  if(transparent){const g=transparent.geometry,p=g.getAttribute('position');centroids=[];for(let i=0;i<p.count;i++){const cell=cells[transparentCells[i]];p.setXYZ(i,...[0,1,2].map(a=>transparentLocal[i*3+a]*size+(cell[a]+data.origin)*data.pitch) as [number,number,number]);}for(let i=0;i<p.count;i+=3)for(let a=0;a<3;a++)centroids.push((p.array[i*3+a]+p.array[(i+1)*3+a]+p.array[(i+2)*3+a])/3);p.needsUpdate=true;g.computeBoundingSphere();sortDirty=true;}
  if(moving){visibleTriangles=[];for(let i=0;i<transparentCells.length;i+=3)if(visible!.has(transparentCells[i]))visibleTriangles.push(i/3);if(transparent)transparent.geometry.setDrawRange(0,visibleTriangles.length*3);}
  highlight();
 }
 const geometryCache=new Map<string,any>();
 let built=false,visibleTriangles:number[]=[],transparentFaceBits:number[]=[];
 // The live field retains all native faces once. Dragging only compacts instance
 // matrices and the translucent index list; it never allocates geometry/materials.
 // The ordinary field restores neighbour-face culling after pointer release.
 const preview=(section:VoxelSection)=>{
  visibleIndices=visibleVoxels(data,section) as number[];mesh.userData.visibleIndices=visibleIndices;
  const visible=new Set(visibleIndices);
  for(const {batch,indices} of batches){let count=0;for(const index of indices)if(visible.has(index)){matrix.makeScale(size,size,size);matrix.setPosition(...cells[index].map(v=>(v+data.origin)*data.pitch) as [number,number,number]);batch.setMatrixAt(count++,matrix);}batch.count=count;batch.instanceMatrix.needsUpdate=true;}
  const occupied=new Map(visibleIndices.map(i=>[cells[i].join(','),data.indices[i]])),masks=new Map<number,number>();
  visibleTriangles=[];for(let i=0;i<transparentCells.length;i+=3){const cell=transparentCells[i];if(!visible.has(cell))continue;const bit=transparentFaceBits[i/3];if(bit){let mask=masks.get(cell);if(mask===undefined){mask=hiddenFaceMask(cells[cell],data.indices[cell],occupied,info);masks.set(cell,mask);}if(mask&bit)continue;}visibleTriangles.push(i/3);}
  if(transparent)transparent.geometry.setDrawRange(0,visibleTriangles.length*3);
  sortDirty=true;highlight();
 };
 const update=(section:VoxelSection)=>{
  if(dynamicSection&&built){preview(section);return;}
  for(const {batch} of batches){mesh.remove(batch);batch.geometry.dispose();(batch.material as T.Material).dispose();}batches.length=0;
  if(transparent){mesh.remove(transparent);transparent.geometry.dispose();(transparent.material as T.Material).dispose();transparent=null;}
  visibleIndices=visibleVoxels(data,dynamicSection?{...section,enabled:false}:section) as number[];mesh.userData.visibleIndices=visibleIndices;
  const occupied=new Map(visibleIndices.map(i=>[cells[i].join(','),data.indices[i]])),groups=new Map<string,{g:any;sample:number;indices:number[]}>();
  const merged:any={positions:[],uvs:[],colors:[],tiles:[],localUvs:[],portals:[],sampleIndices:[]};transparentLocal=[];transparentCells=[];
  let inputTriangles=0,outputTriangles=0;
  for(const index of visibleIndices){const sample=data.indices[index],entry=info[sample],cell=cells[index];inputTriangles+=entry.g.positions.length/9;
   const mask=!moving&&!dynamicSection&&data.mode!=='spaced'&&entry.cube?hiddenFaceMask(cell,sample,occupied,info):0;
   const tile=data.mode==='dense'?cell.map((v,a)=>((v%entry.span[a])+entry.span[a])%entry.span[a]).join(','):'';
   const key=`${sample}:${mask}:${tile}`;let group=groups.get(key);
   if(!group){let g=geometryCache.get(key);if(!g){g=entry.g;if(data.mode==='dense'&&!entry.cube)g=tiledFragment(g,cell);if(entry.cube)g=cullCubeGeometry(g,mask);geometryCache.set(key,g);}group={g,sample,indices:[]};groups.set(key,group);}group.indices.push(index);outputTriangles+=group.g.positions.length/9;
  }
  for(const {g,sample,indices} of groups.values()){
   if(!g.positions.length)continue;
   if(info[sample].transparent){for(const index of indices){for(const key of ['positions','uvs','colors','tiles','localUvs'])for(const v of g[key])merged[key].push(v);for(let v=0;v<g.positions.length/3;v++){merged.portals.push(info[sample].portal);merged.sampleIndices.push(sample);transparentCells.push(index);}}}
   else{const geometry=bufferGeometry(g,info[sample].portal),batch=new T.InstancedMesh(geometry,surfaceMaterial(resources,false,fade),indices.length);batch.frustumCulled=false;batch.userData.sampleIndex=sample;batches.push({batch,indices});mesh.add(batch);}
  }
  if(merged.positions.length){transparentLocal=merged.positions.slice();const geometry=bufferGeometry(merged);geometry.setAttribute('sampleIndex',new T.Float32BufferAttribute(merged.sampleIndices,1));geometry.setIndex(Array.from({length:merged.positions.length/3},(_,i)=>i));transparent=new T.Mesh(geometry,surfaceMaterial(resources,true,fade));transparent.frustumCulled=false;mesh.add(transparent);
   if(dynamicSection){transparentFaceBits=[];for(let i=0;i<transparentCells.length;i+=3){let bit=0;if(info[data.indices[transparentCells[i]]].cube)for(let face=0;face<6;face++){const axis=Math.floor(face/2),plane=face%2?-.5:.5;if([0,1,2].every(j=>Math.abs(transparentLocal[(i+j)*3+axis]-plane)<1e-6)){bit=1<<face;break;}}transparentFaceBits.push(bit);}}
  }
  mesh.userData.triangles={input:inputTriangles,output:outputTriangles};move();built=true;if(dynamicSection)preview(section);
 };
 return {mesh,update,highlight:(ids:string[])=>{const wanted=new Set(ids);schemeSelected=new Set(samples.flatMap((s,i)=>wanted.has(s.block.id)||s.block.variants?.some(b=>wanted.has(b.id))?[i]:[]));highlight();},setFade:(value:number)=>{fade.value=value;mesh.visible=value>0;outline.visible=value>.5&&outlineGeometry.instanceCount>0;},positions:(next:number[][],visible?:number[])=>{cells=next;if(visible){visibleIndices=visible;mesh.userData.visibleIndices=visible;}move();},select:(id:string)=>{selected=samples.findIndex(sample=>sample.block.id===id);highlight();},sort:(camera:T.Camera)=>{
  if(!transparent)return;camera.updateMatrixWorld();const e=camera.matrixWorldInverse.elements,key=e.join(',');if(!sortDirty&&key===lastCamera)return;lastCamera=key;sortDirty=false;
  const order=dynamicSection||moving?visibleTriangles.slice():Array.from({length:centroids.length/3},(_,i)=>i),depth=(i:number)=>e[2]*centroids[i*3]+e[6]*centroids[i*3+1]+e[10]*centroids[i*3+2]+e[14];order.sort((a,b)=>depth(a)-depth(b)||a-b);
  const index=transparent.geometry.getIndex()!;order.forEach((triangle,i)=>{index.setX(i*3,triangle*3);index.setX(i*3+1,triangle*3+1);index.setX(i*3+2,triangle*3+2);});index.needsUpdate=true;
 }};
}
