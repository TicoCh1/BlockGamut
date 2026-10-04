import {modelVertices} from './blockGeometry.mjs';
export const modelClasses=[
 {value:'cube',label:'1 · Full cubes'},
 {value:'planes',label:'2 · Flat planes'},
 {value:'special',label:'3 · Entity / oversized'},
 {value:'other',label:'4 · Other'},
];
/** Classify actual model elements before display fitting. Thin planes take
 * precedence over height, so complete rose bushes stay with crossed plants. */
export function modelClass(model,atlas){
 if(!model?.renderable||!model.elements?.length)return 'other';
 if(model.status==='special')return 'special';
 const elements=model.elements;
 if(elements.every(e=>e.from&&e.to&&e.to.some((v,a)=>Math.abs(v-e.from[a])<1e-6)))return 'planes';
 const g=modelVertices(model,atlas),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<g.positions.length;i++){const a=i%3;min[a]=Math.min(min[a],g.positions[i]);max[a]=Math.max(max[a],g.positions[i]);}
 // A single complete six-faced cuboid, transformed into the unit block bounds.
 if(elements.length===1&&Object.keys(elements[0].faces).length===6&&min.every((v,a)=>Math.abs(v+.5)<1e-5&&Math.abs(max[a]-.5)<1e-5)&&g.positions.every(v=>Math.abs(Math.abs(v)-.5)<1e-5))return 'cube';
 if(min.some((v,a)=>v<-.50001||max[a]>.50001))return 'special';
 return 'other';
}
