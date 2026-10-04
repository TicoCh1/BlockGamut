import {coverage,makeTree,closest,fromLab,inGamut} from './color.mjs';
import type {Sample} from './types';
const workerSelf=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void};
let samples:Sample[]=[],tree:any=null;
self.onmessage=(e:MessageEvent)=>{
 const {id,type}=e.data;
 if(type==='catalog'){samples=e.data.samples;tree=makeTree(samples);return;}
 if(type==='coverage'){workerSelf.postMessage({id,type,...coverage(samples,e.data.threshold,25)});return;}
 const {lightness,threshold,mode}=e.data,n=192,pixels=new Uint8ClampedArray(n*n*4);let matched=0,total=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const lab=[lightness,x/(n-1)*.8-.4,.4-y/(n-1)*.8],rgb=fromLab(lab),off=(y*n+x)*4;
  if(!inGamut(rgb))continue;total++;const best=closest(tree,lab);const good=best.d2<=threshold*threshold;if(good)matched++;
  let color=rgb;
  if(mode==='matched')color=best.sample?best.sample.rgb:[.84,.83,.80];
  if(mode==='coverage'&&!good)color=[.82,.80,.76];
  color.forEach((v,i)=>pixels[off+i]=Math.round(Math.max(0,Math.min(1,v))*255));pixels[off+3]=255;
 }
 workerSelf.postMessage({id,type:'slice',pixels,n,matched,total},[pixels.buffer]);
};
