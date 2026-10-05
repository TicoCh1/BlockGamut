import {modelVertices} from './blockGeometry.mjs';
export const modelClasses=[
 {value:'cube',label:'Full cubes'},
 {value:'transparent',label:'Transparent cubes'},
 {value:'planes',label:'Flat planes'},
 {value:'entity',label:'Entity'},
 {value:'oversized',label:'Oversized'},
 {value:'sets',label:'Sets'},
 {value:'other',label:'Other'},
];
export const allModelClasses=modelClasses.map(c=>c.value);
/** Test assembled outer faces, including multipart mushroom cubes. */
export function modelClass(model,atlas){
 if(!model?.renderable||!model.elements?.length)return 'other';
 const g=modelVertices(model,atlas),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],planes=new Set();
 let outer=true;
 for(let i=0;i<g.positions.length;i++){const a=i%3;min[a]=Math.min(min[a],g.positions[i]);max[a]=Math.max(max[a],g.positions[i]);}
 for(let i=0;i<g.positions.length;i+=18){
  const points=Array.from({length:6},(_,j)=>g.positions.slice(i+j*3,i+j*3+3));
  const boundary=[0,1,2].flatMap(a=>[-.5,.5].filter(v=>points.every(p=>Math.abs(p[a]-v)<1e-5)).map(v=>`${a}:${v}`));
  if(boundary.length!==1||!points.every(p=>p.every(v=>Math.abs(Math.abs(v)-.5)<1e-5)))outer=false;
  boundary.forEach(v=>planes.add(v));
 }
 if(model.status!=='special'&&outer&&planes.size===6)return model.renderLayer==='TRANSLUCENT'||model.opaqueSurface===false?'transparent':'cube';
 // Crossed plants remain planes even when a complete plant spans two blocks.
 if(model.elements.every(e=>e.from&&e.to&&e.to.some((v,a)=>Math.abs(v-e.from[a])<1e-6)))return 'planes';
 if(min.some((v,a)=>v<-.50001||max[a]>.50001))return 'oversized';
 if(model.status==='special')return 'entity';
 return 'other';
}
/** Sets are solid cubes with a released matching slab/stair family. Wood logs
 * and wood blocks belong to their planks family; wax/coating stays distinct. */
export function setMembers(blocks){
 const ids=new Set(blocks.map(b=>b.id.slice(10)));
 return new Set(blocks.filter(b=>{
  if(b.geometryClass!=='cube')return false;
  const name=b.id.slice(10),wood=name.match(/^(?:stripped_)?(.+)_(?:planks|log|wood|stem|hyphae|block)$/);
  const base=wood?wood[1]:name.replace(/_bricks$/,'_brick').replace(/_tiles$/,'_tile').replace(/s$/,'');
  return ids.has(`${base}_stairs`)&&ids.has(`${base}_slab`);
 }).map(b=>b.id));
}
