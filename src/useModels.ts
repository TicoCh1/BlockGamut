import {useEffect,useState} from 'react';
import * as T from 'three';
import {loadSnapshot,releaseGroup} from './versionData.mjs';
import type {Catalog} from './types';
export interface ReleaseGroup {id:string;last:string;label:string;releases:string[];base:string|null;patch:string;blockCount:number}
export interface ReleaseIndex {latest:string;latestRelease:string;releaseCount:number;groups:ReleaseGroup[]}
export interface ModelResources {version:string;pack:any;texture:T.Texture;uniforms:Record<string,T.IUniform>;animatedIds:Set<string>;animate:(now:number)=>number;preview:(tile:number)=>{image:CanvasImageSource;x:number;y:number;size:number};dispose:()=>void}
declare const __DATA_REVISION__:string;
// Keep catalog deltas from the same deployment together in browser/CDN caches.
const json=async(url:string)=>{const response=await fetch(`${url}?v=${__DATA_REVISION__}`);if(!response.ok)throw Error(`Missing ${url} (${response.status})`);return response.json();};
const sheetCache=new Map<string,Promise<HTMLImageElement>>();
function image(url:string){let cached=sheetCache.get(url);if(!cached){cached=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`Missing ${url}`));image.src=url;}).catch(error=>{sheetCache.delete(url);throw error;});sheetCache.set(url,cached);}return cached;}
let tileTable:Promise<any>|null=null;
export function useModels(){
 const [index,setIndex]=useState<ReleaseIndex|null>(null),[version,setVersion]=useState('');
 const [state,setState]=useState<{resources:ModelResources|null;catalog:Catalog|null}>({resources:null,catalog:null}),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;json('./versions/index.json').then(data=>{if(!cancelled){setIndex(data);setVersion(data.latest);}}).catch(e=>{if(!cancelled){setError(String(e));setLoading(false);}});return()=>{cancelled=true;};},[]);
 useEffect(()=>{
  if(!index||!version)return;let cancelled=false;setLoading(true);setError('');
  const create=async()=>{
   const [snapshot,table]=await Promise.all([loadSnapshot(index,version,json),tileTable||(tileTable=json('./versions/tiles.json').catch(e=>{tileTable=null;throw e;}))]);
   const models=structuredClone(snapshot.models),used=new Set<number>();
   for(const model of Object.values(models) as any[])for(const element of model.elements)for(const face of Object.values(element.faces) as any[])used.add(face.tile);
   const animated=Object.entries(snapshot.animations).filter(([tile])=>used.has(Number(tile))) as [string,any][];
   for(const [,animation] of animated)for(const tile of animation.frames)used.add(tile);
   const globalTiles=[...used].sort((a,b)=>a-b),local=new Map(globalTiles.map((tile,i)=>[tile,i]));
   const pageFor=(tile:number)=>Math.floor(table.tiles[tile].image/table.perSheet);
   const pages=[...new Set(globalTiles.map(pageFor))];
   const loaded=await Promise.all(pages.map(page=>image(`./versions/tiles/${page}.png`)));if(cancelled)return;
   const pageImages=new Map(pages.map((page,i)=>[page,loaded[i]])),cell=36,columns=64;
   const canvas=document.createElement('canvas');canvas.width=columns*cell;canvas.height=Math.max(cell,Math.ceil(globalTiles.length/columns)*cell);
   const context=canvas.getContext('2d')!;context.imageSmoothingEnabled=false;
   for(let i=0;i<globalTiles.length;i++){
    const tile=globalTiles[i],source=table.tiles[tile].image%table.perSheet;
    context.drawImage(pageImages.get(pageFor(tile))!,source%table.columns*table.cell,Math.floor(source/table.columns)*table.cell,cell,cell,i%columns*cell,Math.floor(i/columns)*cell,cell,cell);
    if(i%256===255){await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(cancelled)return;}
   }
   for(const model of Object.values(models) as any[])for(const element of model.elements)for(const face of Object.values(element.faces) as any[])face.tile=local.get(face.tile);
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.userData.shared=true;
   const textures:T.Texture[]=[texture];
   const extra=async(key:string)=>{const picture=await image(`./versions/${snapshot.extra[key]}`),t=new T.Texture(picture);t.needsUpdate=true;t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;t.wrapS=t.wrapT=T.RepeatWrapping;t.userData.shared=true;textures.push(t);return t;};
   const [endSky,endPortal]=await Promise.all([extra('endSky'),extra('endPortal')]);
   if(cancelled){textures.forEach(t=>t.dispose());return;}
   const values=new Float32Array(globalTiles.length*4),animationTable=new T.DataTexture(values,Math.max(1,globalTiles.length),1,T.RGBAFormat,T.FloatType);animationTable.userData.shared=true;textures.push(animationTable);
   const timelines=animated.map(([tile,a])=>({tile:local.get(Number(tile))!,frames:a.frames.map((f:number)=>local.get(f)!),durations:a.durations as number[],interpolate:a.interpolate,total:a.durations.reduce((x:number,y:number)=>x+y,0)}));
   const uniforms={animationAtlas:{value:texture},animationTable:{value:animationTable},animationTableWidth:{value:Math.max(1,globalTiles.length)},animationAtlasSize:{value:new T.Vector2(canvas.width,canvas.height)},animationColumns:{value:columns},animationCell:{value:cell},animationPadding:{value:2},animationTileSize:{value:32},previewTime:{value:0},endSky:{value:endSky},endPortal:{value:endPortal}};
   const animatedTileIds=new Set(timelines.map(a=>a.tile));
   const animatedIds=new Set<string>(Object.entries(models).filter(([id,m]:[string,any])=>id==='minecraft:end_portal'||id==='minecraft:end_gateway'||m.elements.some((e:any)=>Object.values(e.faces).some((f:any)=>animatedTileIds.has(f.tile)))).map(([id])=>id));
   const animate=(now:number)=>{uniforms.previewTime.value=now/1000;for(const a of timelines){let time=now%a.total,frame=0;while(time>=a.durations[frame]&&frame<a.frames.length-1)time-=a.durations[frame++];const offset=a.tile*4;values[offset]=a.frames[frame];values[offset+1]=a.frames[(frame+1)%a.frames.length];values[offset+2]=a.interpolate?time/a.durations[frame]:0;values[offset+3]=1;}animationTable.needsUpdate=true;return Math.floor(now/33);};animate(0);
   const pack={atlas:{width:canvas.width,height:canvas.height,cell,columns,padding:2,tileSize:32,count:globalTiles.length},models};
   const preview=(tile:number)=>{const i=local.get(tile)??0;return {image:canvas,x:i%columns*cell+2,y:Math.floor(i/columns)*cell+2,size:32};};
   const resources:ModelResources={version,pack,texture,uniforms,animatedIds,animate,preview,dispose:()=>textures.forEach(t=>t.dispose())};
   const catalog={...snapshot.meta,blocks:Object.values(snapshot.catalog)} as Catalog;
   if(!cancelled){setState({resources,catalog});setLoading(false);}else resources.dispose();
  };
  create().catch(e=>{if(!cancelled){setError(String(e));setLoading(false);}});
  return()=>{cancelled=true;};
 },[index,version]);
 // Hold the current GPU resources until their replacement is fully ready.
 useEffect(()=>()=>state.resources?.dispose(),[state.resources]);
 return {...state,index,version,setVersion,group:index?releaseGroup(index,version) as ReleaseGroup:undefined,loading,error};
}
