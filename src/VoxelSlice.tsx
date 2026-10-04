import {useLocale} from './i18n';
import {memo,useEffect,useMemo,useRef} from 'react';
import {sectionTest,sectionValue,sectionPoint,voxelTiles,sliceViewport} from './voxels.mjs';
import type {Sample,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';
export const VoxelSlice=memo(function VoxelSlice({data,section,samples,resources,selected,onSelect}:{data:VoxelData;section:VoxelSection;samples:Sample[];resources:ModelResources|null;selected:string;onSelect:(id:string)=>void}){
 const {view,t,locale}=useLocale();
 const canvas=useRef<HTMLCanvasElement>(null),hits=useRef<{x:number;y:number;size:number;id:string}[]>([]);
 const tiles=useMemo(()=>samples.map(s=>voxelTiles(resources?.pack.models[s.block.id])[section.axis==='y'?2:4]),[samples,resources,section.axis]);
 const layers=useMemo(()=>{const axis=({x:0,y:1,z:2} as Record<string,number>)[section.axis];if(axis===undefined)return null;const result=new Map<number,number[]>();for(let i=0;i<data.cells.length;i++){const key=data.cells[i][axis],layer=result.get(key);if(layer)layer.push(i);else result.set(key,[i]);}return result;},[data,section.axis]);
 const cells=useMemo(()=>{if(layers)return (layers.get(sectionValue(data,section.axis,section.position))||[]).map(i=>({i,xy:sectionPoint(data.cells[i],data,section)}));const result=[];for(let i=0;i<data.cells.length;i++){const p=data.cells[i];if(sectionTest(p,data,section,true))result.push({i,xy:sectionPoint(p,data,section)});}return result;},[data,layers,section.axis,section.position]);
 const framing=useMemo(()=>sliceViewport(data,section.axis),[data,section.axis]);
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d');if(!ctx||!resources)return;const W=384;ctx.clearRect(0,0,W,W);hits.current=[];
  if(!cells.length)return;
  const {min,max,unit,left,top}=framing;
  ctx.imageSmoothingEnabled=false;const atlas=resources.pack.atlas,image=resources.texture.image as HTMLImageElement;
  const marked:{x:number;y:number}[]=[];
  for(const c of cells){const sample=samples[data.indices[c.i]];if(!sample)continue;const x=left+(c.xy[0]-min[0])*unit,y=top+(max[1]-c.xy[1])*unit;
   // Native alpha is retained in this face-texture preview as well.
   const tile=tiles[data.indices[c.i]],tx=tile%atlas.columns*atlas.cell+atlas.padding,ty=Math.floor(tile/atlas.columns)*atlas.cell+atlas.padding;
   ctx.drawImage(image,tx,ty,atlas.tileSize,atlas.tileSize,x,y,unit+.2,unit+.2);hits.current.push({x,y,size:unit,id:sample.block.id});if(sample.block.id===selected)marked.push({x,y});
  }
  ctx.strokeStyle='#ffd47a';ctx.lineWidth=Math.max(1,unit*.07);for(const {x,y} of marked)ctx.strokeRect(x+1,y+1,unit-2,unit-2);
 },[cells,data,samples,resources,selected,tiles,framing]);
 return view(<div className="voxel-slice"><canvas ref={canvas} data-cell-size={framing.unit.toFixed(4)} width={384} height={384} aria-label="Textured voxel cross-section; click a tile to select every instance of its block" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*384,y=(e.clientY-rect.top)/rect.height*384;const hit=hits.current.find(h=>x>=h.x&&x<h.x+h.size&&y>=h.y&&y<h.y+h.size);if(hit)onSelect(hit.id);}}/><p className="micro muted">{cells.length?`${cells.length} cells in this section · click to select`:'No voxel centres intersect this section.'}</p></div>);
});
