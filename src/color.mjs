import {searchBlocks} from './search.mjs';
// Forward conversion faithfully follows MineAgent palette/Oklab.java.
// MoreScript adaptation: Copyright (c) 2026 Tang; GPL-3.0-or-later.
// Inverse: Björn Ottosson, https://bottosson.github.io/posts/oklab/ (public domain).
export const linear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
export const encode = c => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
export function toLab(rgb) {
  const [r,g,b] = rgb.map(linear);
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
/** @param {number[]} lab */
export function fromLab([L,a,b]) {
  const l=(L+.3963377774*a+.2158037573*b)**3;
  const m=(L-.1055613458*a-.0638541728*b)**3;
  const s=(L-.0894841775*a-1.291485548*b)**3;
  return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(encode);
}
// Rounded reference matrices introduce up to 1.7e-6 error near saturated yellow.
export const inGamut = rgb => rgb.every(v=> Number.isFinite(v) && v>=-2e-6 && v<=1.000002);
export const hexRgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export const rgbHex = rgb => '#'+rgb.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
export function sampleColor(block, mode) {
  if(block.renderStatus==='invisible')return null;
  return mode==='average' ? block.hex : block.faces[mode] || block.hex;
}
export function materialVariance(block,space='oklab') {
 const channels=block.surface?.channelVariance?.[space]||(space==='oklab'?block.surface?.variance:null);
 return channels?channels.reduce((sum,value)=>sum+value,0):null;
}
/** @param {any[]} blocks @param {{category?:string,query?:string,opaque?:boolean,tinted?:boolean,custom?:string[]|null,blacklist?:string[],varianceMin?:number,varianceMax?:number,space?:string}} filters */
export function filterBlocks(blocks, {category='all',query='',opaque=false,tinted=true,custom=null,blacklist=[],varianceMin=0,varianceMax=Infinity,space='oklab'}) {
 return searchBlocks(blocks,query).filter(b=>(category==='all'||(category==='cubes'?b.category.startsWith('full_cube'):(b.geometryClass||b.category)===category))
    && (!opaque||(b.alpha!==null&&b.alpha>=.999)) && (tinted||b.tint==='none')
    && (!custom||custom.includes(b.id)) && !blacklist.includes(b.id)
    && ((varianceMin===0&&varianceMax===Infinity)||(materialVariance(b,space)!==null&&materialVariance(b,space)>=varianceMin&&materialVariance(b,space)<=varianceMax)));
}
export function samplesFor(blocks, mode='average') {
  return blocks.flatMap(block=>{
    const hex=sampleColor(block,mode);
    return hex ? [{block,hex,rgb:hexRgb(hex),lab:toLab(hexRgb(hex)),fallback:mode!=='average'&&!block.faces[mode]}] : [];
  });
}
// Cake decorations change a small accent, while the shared cake remains the
// material. Keep this explicit: broad colour clustering would erase wool and
// terracotta colour choices. Raw asset keys and variant measurements stay intact.
const cakeVariants=new Set(['cake','candle_cake',...['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'].map(color=>`${color}_candle_cake`)].map(id=>`minecraft:${id}`));
/** Exact texture/tint groups, with an explicit shared-base cake family. */
export function groupMaterials(blocks) {
  const groups=new Map();
  for(const block of blocks){const key=cakeVariants.has(block.id)?'family:minecraft:cake':block.materialKey||block.id;const members=groups.get(key)||[];members.push(block);groups.set(key,members);}
  const rank=b=>[b.id==='minecraft:cake'?-1:(b.geometryClass==='cube'||b.category.startsWith('full_cube'))?0:1,b.id.length];
  return [...groups.values()].map(members=>{
    const sorted=[...members].sort((a,b)=>rank(a)[0]-rank(b)[0]||rank(a)[1]-rank(b)[1]||a.id.localeCompare(b.id));
    return {...sorted[0],variants:sorted};
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
// Oklab distance only; deliberately no server-side construction bias or family grouping.
export function nearest(samples, target, limit=6) {
  return samples.map(s=>({...s,distance:distance(s.lab,target)})).sort((a,b)=>a.distance-b.distance||a.block.id.localeCompare(b.block.id)).slice(0,limit);
}
// Balanced 3D k-d tree used for full slice and full sRGB reference-grid queries.
export function makeTree(samples, depth=0) {
  if(!samples.length)return null;
  const axis=depth%3, sorted=[...samples].sort((a,b)=>a.lab[axis]-b.lab[axis]);
  const mid=sorted.length>>1;
  return {sample:sorted[mid],axis,left:makeTree(sorted.slice(0,mid),depth+1),right:makeTree(sorted.slice(mid+1),depth+1)};
}
/** @param {any} tree @param {number[]} target @param {{sample:any,d2:number}} best */
export function closest(tree, target, best={sample:null,d2:Infinity}) {
  if(!tree)return best;
  const {sample,axis,left,right}=tree;
  const d2=(sample.lab[0]-target[0])**2+(sample.lab[1]-target[1])**2+(sample.lab[2]-target[2])**2;
  if(d2<best.d2)best={sample,d2};
  const d=target[axis]-sample.lab[axis];
  best=closest(d<0?left:right,target,best);
  if(d*d<=best.d2)best=closest(d<0?right:left,target,best);
  return best;
}
export function coverage(samples, threshold=.05, steps=25) {
  if(!samples.length)return {matched:0,total:steps**3,ratio:0};
  const tree=makeTree(samples);let matched=0;
  for(let r=0;r<steps;r++)for(let g=0;g<steps;g++)for(let b=0;b<steps;b++)
    if(closest(tree,toLab([r/(steps-1),g/(steps-1),b/(steps-1)])).d2<=threshold**2)matched++;
  return {matched,total:steps**3,ratio:matched/steps**3};
}
