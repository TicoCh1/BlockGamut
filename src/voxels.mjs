import {project,unproject} from './spaces.mjs';
import {makeTree,closest} from './color.mjs';
import {layout,BLOCK_EDGE,spacedPitch} from './layout.mjs';

export const arrangements=[{value:'spaced',label:'Spaced'},{value:'packed',label:'Packed'},{value:'dense',label:'Dense fill'}];
export function packedLayout(samples,space,footprints=true,variance=false){
 const taken=new Set(),cells=[];
 const offsets=[];for(let x=-9;x<=9;x++)for(let y=-9;y<=9;y++)for(let z=-9;z<=9;z++)offsets.push([x,y,z]);offsets.sort((a,b)=>a.reduce((s,v)=>s+v*v,0)-b.reduce((s,v)=>s+v*v,0)||a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);
 for(const {s,i} of samples.map((s,i)=>({s,i})).sort((a,b)=>a.s.block.id.localeCompare(b.s.block.id))){
  const bounds=footprints?s.block.renderBounds:null,footprint=[];
  const lo=bounds?bounds.min.map(v=>Math.floor(v+.500001)):[0,0,0],hi=bounds?bounds.max.map((v,a)=>Math.max(lo[a],Math.ceil(v+.499999)-1)):[0,0,0];
  for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)footprint.push([x,y,z]);
  const anchor=project(s.rgb,space,s.block.surface,variance).map(v=>Math.round(v/BLOCK_EDGE));
  for(const offset of offsets){const cell=anchor.map((v,a)=>v+offset[a]||0),keys=footprint.map(p=>p.map((v,a)=>v+cell[a]).join(','));if(keys.some(k=>taken.has(k)))continue;keys.forEach(k=>taken.add(k));cells[i]=cell;break;}
  if(!cells[i])throw Error('Packed voxel search exhausted');
 }return cells;
}
export function buildVoxels(samples,space,mode='packed',variance=false){
 if(!['spaced','packed','dense'].includes(mode))throw Error('Unknown arrangement');
 const pitch=mode==='spaced'?spacedPitch(samples):BLOCK_EDGE;
 let cells=mode==='spaced'?layout(samples,space,variance):packedLayout(samples,space,mode!=='dense',variance),indices=samples.map((_,i)=>i);
 // Reserve a distinct cell for every displayed material first. These seeds may
 // be just outside the mathematical gamut after collision resolution; retaining
 // them is necessary to show each material, including coincident colours.
 const reserved=cells.length;
 if(mode==='dense'&&samples.length){
  const occupied=new Set(cells.map(p=>p.join(',')));
  const tree=makeTree(samples.map((s,i)=>({lab:project(s.rgb,space,s.block.surface,variance),index:i})).sort((a,b)=>samples[a.index].block.id.localeCompare(samples[b.index].block.id)));
  const extent=Math.round(1.3/pitch);
  for(let x=-extent;x<=extent;x++)for(let y=-extent;y<=extent;y++)for(let z=-extent;z<=extent;z++){
   const cell=[x,y,z];if(occupied.has(cell.join(',')))continue;
   const point=cell.map(v=>v*pitch);
   if(!variance&&!unproject(point,space))continue;
   cells.push(cell);indices.push(closest(tree,point).sample.index);
  }
 }
 const min=[0,0,0],max=[0,0,0];if(cells.length){min.fill(Infinity);max.fill(-Infinity);for(const p of cells)for(let a=0;a<3;a++){min[a]=Math.min(min[a],p[a]);max[a]=Math.max(max[a],p[a]);}}
 return {cells,indices,pitch,origin:0,bounds:{min,max},mode,space,variance,reserved};
}
export function sectionValue(data,axis,position){const a={x:0,y:1,z:2}[axis];return a!==undefined?Math.round(data.bounds.min[a]+position/100*(data.bounds.max[a]-data.bounds.min[a])):axis==='hue'?position/100*Math.PI*2:position/100*1.3/data.pitch;}
export function sectionTest(cell,data,section,layerOnly=false){
 if(!section.enabled&&!layerOnly)return true;
 const value=sectionValue(data,section.axis,section.position),layer=layerOnly||section.style==='layer',axis={x:0,y:1,z:2}[section.axis];
 if(axis!==undefined)return layer?Math.abs(cell[axis]-value)<.5:section.flip?cell[axis]>=value:cell[axis]<=value;
 const x=cell[0]+data.origin,z=cell[2]+data.origin;
 if(section.axis==='radius'){const r=Math.hypot(x,z);return layer?Math.abs(r-value)<=.6:section.flip?r>=value:r<=value;}
 const normal=-Math.sin(value)*x+Math.cos(value)*z,along=Math.cos(value)*x+Math.sin(value)*z;
 return layer?Math.abs(normal)<=.65&&along>=-.5:section.flip?normal>=0:normal<=0;
}
export function visibleVoxels(data,section){return data.cells.map((_,i)=>i).filter(i=>sectionTest(data.cells[i],data,section));}
/** One framing per grid/axis, never fitted to the currently intersected cells. */
export function sliceViewport(data,axis,size=384){
 const axes={x:[2,1],y:[0,2],z:[0,1]}[axis];let min,max;
 if(axes){min=axes.map(a=>data.bounds.min[a]);max=axes.map(a=>data.bounds.max[a]);}
 else {const radius=data.cells.reduce((r,p)=>Math.max(r,Math.hypot(p[0]+data.origin,p[2]+data.origin)),0);
  min=[axis==='hue'?-.5:0,data.bounds.min[1]];
  max=[axis==='hue'?radius:Math.max(8,Math.round(2*Math.PI*1.3/data.pitch)),data.bounds.max[1]];
 }
 const width=max[0]-min[0]+1,height=max[1]-min[1]+1,unit=Math.min((size-20)/width,(size-20)/height);
 return {min,max,unit,left:(size-width*unit)/2,top:(size-height*unit)/2};
}
export function sectionPoint(cell,data,section){
 if(section.axis==='radius')return [(Math.atan2(cell[2]+data.origin,cell[0]+data.origin)+Math.PI)/(Math.PI*2)*Math.max(8,Math.round(2*Math.PI*sectionValue(data,'radius',section.position))),cell[1]];
 if(section.axis==='hue'){const a=sectionValue(data,'hue',section.position);return [Math.cos(a)*(cell[0]+data.origin)+Math.sin(a)*(cell[2]+data.origin),cell[1]];}
 return section.axis==='x'?[cell[2],cell[1]]:section.axis==='z'?[cell[0],cell[1]]:[cell[0],cell[2]];
}
/** Dominant model face per direction; original models stay in the turntable. */
export function voxelTiles(model){
 const order=['east','west','up','down','south','north'],faces=order.map(d=>{
  let best=null,area=-1;for(const e of model?.elements||[])for(const [direction,f] of Object.entries(e.faces)){
   const dims=e.to&&e.from?e.to.map((v,i)=>Math.abs(v-e.from[i])):[16,16,16],a={east:0,west:0,up:1,down:1,south:2,north:2}[direction],score=d===direction?dims[(a+1)%3]*dims[(a+2)%3]+.001:0;
   if(score>area){area=score;best=f;}
  }return best?.tile??0;
 });return faces;
}
