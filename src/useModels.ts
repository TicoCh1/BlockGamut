import {useEffect,useState} from 'react';
import * as T from 'three';
export interface ModelResources {pack:any;texture:T.Texture;uniforms:Record<string,T.IUniform>;animatedIds:Set<string>;animate:(now:number)=>number}
export function useModels(){
 const [resources,setResources]=useState<ModelResources|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let cancelled=false;const textures:T.Texture[]=[],abort=new AbortController();
 const json=(url:string)=>fetch(url,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(`Missing ${url}`);return r.json();});
 const load=async(url:string,repeat=false)=>{const texture=await new T.TextureLoader().loadAsync('./'+url);textures.push(texture);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.userData.shared=true;if(repeat)texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;};
 Promise.all([json('./block-models.json'),json('./render-assets.json')]).then(async([pack,meta])=>{
  const [texture,animationAtlas,endSky,endPortal]=await Promise.all([load(pack.atlas.url),load(meta.atlas.url),load('end-sky.png',true),load('end-portal.png',true)]);
  if(cancelled){textures.forEach(t=>t.dispose());return;}
  const values=new Float32Array(pack.atlas.count*4),table=new T.DataTexture(values,pack.atlas.count,1,T.RGBAFormat,T.FloatType);table.userData.shared=true;textures.push(table);
  const timelines=Object.entries(meta.animations).map(([tile,a]:[string,any])=>({tile:Number(tile),...a,total:a.durations.reduce((x:number,y:number)=>x+y,0)}));
  const uniforms={animationAtlas:{value:animationAtlas},animationTable:{value:table},animationTableWidth:{value:pack.atlas.count},animationAtlasSize:{value:new T.Vector2(meta.atlas.width,meta.atlas.height)},animationColumns:{value:meta.atlas.columns},animationCell:{value:meta.atlas.cell},animationPadding:{value:meta.atlas.padding},animationTileSize:{value:meta.atlas.tileSize},previewTime:{value:0},endSky:{value:endSky},endPortal:{value:endPortal}};
  const animatedIds=new Set<string>(Object.entries(pack.models).filter(([id,m]:[string,any])=>id==='minecraft:end_portal'||id==='minecraft:end_gateway'||m.elements.some((e:any)=>Object.values(e.faces).some((f:any)=>meta.animations[f.tile]))).map(([id])=>id));
  const animate=(now:number)=>{uniforms.previewTime.value=now/1000;for(const a of timelines){let time=now%a.total,frame=0;while(time>=a.durations[frame]&&frame<a.frames.length-1){time-=a.durations[frame++];}const offset=a.tile*4;values[offset]=a.frames[frame];values[offset+1]=a.frames[(frame+1)%a.frames.length];values[offset+2]=a.interpolate?time/a.durations[frame]:0;values[offset+3]=1;}table.needsUpdate=true;return Math.floor(now/16);};animate(0);
  setResources({pack,texture,uniforms,animatedIds,animate});
 }).catch(e=>{if(!cancelled&&e.name!=='AbortError')setError(true);});
 return()=>{cancelled=true;abort.abort();textures.forEach(t=>t.dispose());};
 },[]);return {resources,error};
}
