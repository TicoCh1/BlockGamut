import {filterBlocks,hexRgb,rgbHex,fromLab,encode} from './color.mjs';
import {coordinates,project,fromHSL,fromHSV,fromXYZ,white} from './spaces.mjs';

export const schemeMime='application/x-block-gamut-block';
/** Edited slots stay put until refresh; pins retain their exact release IDs. */
export function schemeCells(scheme,blocks,lists={}){
 const generated=fillScheme(scheme,blocks,lists);
 if(!scheme.tiles)return generated;
 const byId=new Map(blocks.map(b=>[b.id,b]));
 return generated.map(cell=>{const id=scheme.anchors[cell.index]||scheme.tiles[cell.index],block=byId.get(id)||null;return {...cell,id,block,target:cell.block?.id===id?cell.target:block?.hex||null};});
}
export function toggleSchemePin(scheme,index,blocks,lists={}){
 const cells=schemeCells(scheme,blocks,lists),anchors={...scheme.anchors};
 if(anchors[index])delete anchors[index];else if(cells[index].id||cells[index].block)anchors[index]=cells[index].id||cells[index].block.id;
 return {...scheme,anchors,tiles:cells.map(c=>c.id||c.block?.id||null)};
}
export function refreshScheme(scheme,blocks,lists={}){
 const visible=schemeCells(scheme,blocks,lists).filter(c=>c.block);
 const anchors=Object.keys(scheme.anchors).length?scheme.anchors:Object.fromEntries([visible[0],visible.at(-1)].filter(Boolean).map(c=>[c.index,c.block.id]));
 return {...scheme,tiles:fillScheme({...scheme,anchors},blocks,lists).map(c=>c.id||c.block?.id||null)};
}
export function resizeScheme(scheme,length){
 const tiles=scheme.tiles?.length?Array.from({length},(_,i)=>scheme.tiles[Math.round(i/(length-1)*(scheme.length-1))]):undefined;
 return {...scheme,length,tiles,anchors:resizeAnchors(scheme.anchors,scheme.length,length)};
}
/** Reorder within a row; move across rows; releasing outside any row deletes.
 * The configured length stays fixed, so deletion leaves an empty slot. */
export function dropSchemeBlock(schemes,drop,blocks,lists={}){
 const source=drop.source&&schemes.find(s=>s.id===drop.source.scheme);
 if(source&&drop.scheme===source.id){
  const cells=schemeCells(source,blocks,lists),order=cells.map(c=>({id:c.id||c.block?.id||null,pin:!!source.anchors[c.index]}));
  const [moved]=order.splice(drop.source.slot,1);order.splice(drop.slot,0,moved);
  return schemes.map(s=>s.id===source.id?{...s,tiles:order.map(c=>c.id),anchors:Object.fromEntries(order.flatMap((c,i)=>c.pin?[[i,c.id]]:[]))}:s);
 }
 const pinned=source?!!source.anchors[drop.source.slot]:false;
 return schemes.map(s=>{
  if(s.id!==source?.id&&s.id!==drop.scheme)return s;
  const tiles=schemeCells(s,blocks,lists).map(c=>c.id||c.block?.id||null),anchors={...s.anchors};
  if(s.id===source?.id){tiles[drop.source.slot]=null;delete anchors[drop.source.slot];}
  if(s.id===drop.scheme){tiles[drop.slot]=drop.block;if(pinned)anchors[drop.slot]=drop.block;else delete anchors[drop.slot];}
  return {...s,tiles,anchors};
 });
}
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
/** Shortest spherical arc between directions; radius changes linearly.
 * Zero-length directions and coincident/antipodal vectors are the mathematical
 * singularities of SLERP, handled without losing either endpoint. */
export function slerpVector(a,b,t){
 if(t===0)return [...a];if(t===1)return [...b];
 const ra=Math.hypot(...a),rb=Math.hypot(...b),straight=()=>a.map((v,i)=>v+(b[i]-v)*t);
 if(ra===0||rb===0)return straight();
 const u=a.map(v=>v/ra),v=b.map(v=>v/rb),dot=Math.max(-1,Math.min(1,u.reduce((sum,x,i)=>sum+x*v[i],0))),radius=ra+(rb-ra)*t;
 if(dot>1-1e-10)return straight();
 if(dot<-1+1e-10){
  const axis=u.map(Math.abs).indexOf(Math.min(...u.map(Math.abs))); // deterministic perpendicular arc
  const basis=u.map((_,i)=>i===axis?1:0),normal=basis.map((x,i)=>x-u[axis]*u[i]),length=Math.hypot(...normal);
  return u.map((x,i)=>radius*(x*Math.cos(Math.PI*t)+normal[i]/length*Math.sin(Math.PI*t)));
 }
 const angle=Math.acos(dot),sin=Math.sin(angle),A=Math.sin((1-t)*angle)/sin,B=Math.sin(t*angle)/sin;
 return u.map((x,i)=>radius*(A*x+B*v[i]));
}
/** Use the atlas's fixed coordinate metric, translated to the black origin.
 * Hue spaces use their actual cylinder/bicone rather than a scalar hue axis. */
export function slerpColour(a,b,t,space){
 if(t===0)return [...a];if(t===1)return [...b];
 const origin=project([0,0,0],space),A=project(a,space).map((v,i)=>v-origin[i]),B=project(b,space).map((v,i)=>v-origin[i]);
 const [x,y,z]=slerpVector(A,B,t).map((v,i)=>v+origin[i]);
 let rgb;
 if(space==='oklab')rgb=fromLab([y/2.6+.5,x/2.6,z/2.6]);
 else if(space==='lab'){
  const L=(y/2.6+.5)*100,a=x/1.3*100,b=z/1.3*100,f=(L+16)/116;
  rgb=fromXYZ([f+a/500,f,f-b/200].map((v,i)=>(v>6/29?v**3:3*(6/29)**2*(v-4/29))*white[i]));
 }else if(space.startsWith('h')){
  const height=Math.max(0,Math.min(1,y/2.6+.5)),radius=Math.hypot(x,z)/1.3,max=space==='hsl-bicone'?1-Math.abs(2*height-1):1;
  const hue=(Math.atan2(z,x)/Math.PI/2+1)%1,saturation=max>0?Math.min(1,radius/max):0;
  rgb=space==='hsv'?fromHSV([hue,saturation,height]):fromHSL([hue,saturation,height]);
 }else{const c=[x,y,z].map(v=>v/2.6+.5);rgb=space==='xyz'?fromXYZ(c.map((v,i)=>v*white[i])):space==='linear'?c.map(encode):c;}
 return rgb.map(v=>Math.max(0,Math.min(1,v)));
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
  const interpolate=scheme.interpolation==='slerp'?slerpColour:lerpColour;
  const rgb=interpolate(hexRgb(left.block.hex),hexRgb(right.block.hex),left.index===right.index?0:(index-left.index)/(right.index-left.index),scheme.space),point=project(rgb,scheme.space);
  let best=null,distance=Infinity;
  for(const c of candidates){const d=c.point.reduce((sum,v,i)=>sum+(v-point[i])**2,0);if(d<distance){best=c.block;distance=d;}}
  return {index,anchor:false,block:best,target:rgbHex(rgb)};
 });
}
