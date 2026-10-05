import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BlockThumbnail} from './BlockThumbnail';
import {schemeWheelCandidates,stepSchemeWheel} from './schemeWheelCandidates.mjs';
import {useLocale} from './i18n';
import type {Block} from './types';
import type {ModelResources} from './useModels';
import type {Scheme} from './ColourSchemes';
import {schemeCells} from './schemes.mjs';

type Preview={blocks:(Block|null)[];left:number;top:number};
export function useSchemeWheel({scheme,cells,blocks,collection,blacklist,onChoose}: {scheme:Scheme;cells:ReturnType<typeof schemeCells>;blocks:Block[];collection:string[];blacklist:string[];onChoose:(index:number,id:string)=>void}){
 const root=useRef<HTMLDivElement>(null),latest=useRef({scheme,cells,blocks,collection,blacklist,onChoose});
 latest.current={scheme,cells,blocks,collection,blacklist,onChoose};
 const [preview,setPreview]=useState<Preview|null>(null);
 const dismiss=useRef(()=>{});
 useEffect(()=>{
  const row=root.current!,desktop=window.matchMedia('(min-width:761px) and (hover:hover) and (pointer:fine)');
  let lastStep=0,active:HTMLElement|null=null,cache:{key:string;blocks:Block[];catalog:Block[];collection:string[];blacklist:string[]}|null=null;
  const close=()=>{setPreview(null);active=null;cache=null;lastStep=0;};
  dismiss.current=close;
  const candidates=(target:HTMLElement)=>{
   const state=latest.current,index=Number(target.dataset.schemeSlot),cell=state.cells[index];
   if(cell.anchor||!cell.block||!state.cells[index-1]?.block||!state.cells[index+1]?.block)return null;
   const key=JSON.stringify([index,state.scheme.space,state.scheme.interpolation,state.scheme.filters,state.cells.filter(c=>c.index!==index).map(c=>c.id||c.block?.id)]);
   if(!cache||cache.key!==key||cache.catalog!==state.blocks||cache.collection!==state.collection||cache.blacklist!==state.blacklist)cache={key,blocks:schemeWheelCandidates(state.scheme,index,state.blocks,{collection:state.collection,blacklist:state.blacklist},state.cells),catalog:state.blocks,collection:state.collection,blacklist:state.blacklist};
   return cache.blocks.length?{state,index,cell,blocks:cache.blocks}:null;
  };
  const reveal=(target:HTMLElement,chosen:Block,blocks:Block[])=>{
   active=target;
   const position=blocks.findIndex(b=>b.id===chosen.id),rect=target.querySelector('button')!.getBoundingClientRect();
   setPreview({blocks:Array.from({length:5},(_,i)=>i===2?chosen:blocks[position+i-2]||null),left:Math.max(8,Math.min(innerWidth-64,rect.left+rect.width/2-28)),top:Math.max(8,Math.min(innerHeight-236,rect.top+rect.height/2-114))});
  };
  const hover=(event:PointerEvent)=>{
   if(!desktop.matches||event.pointerType==='touch')return;
   const target=(event.target as Element).closest<HTMLElement>('.scheme-cell');
   if(target===active)return;
   const options=target&&candidates(target);
   if(options)reveal(target!,options.cell.block,options.blocks);else close();
  };
  const wheel=(event:WheelEvent)=>{
   if(!desktop.matches||event.ctrlKey||!event.deltaY||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
   const target=(event.target as Element).closest<HTMLElement>('.scheme-cell');if(!target)return;
   const options=candidates(target);if(!options)return;
   const {state,index,cell,blocks}=options;
   event.preventDefault();event.stopPropagation();
   // A mouse detent responds immediately; trackpad bursts advance at most every 80ms.
   const now=performance.now();let chosen=cell.block;
   if(active!==target||now-lastStep>=80){chosen=stepSchemeWheel(blocks,cell.block.id,event.deltaY>0?1:-1)!;lastStep=now;if(chosen.id!==cell.block.id)state.onChoose(index,chosen.id);}
   reveal(target,chosen,blocks);
  };
  row.addEventListener('wheel',wheel,{passive:false});row.addEventListener('pointerover',hover);row.addEventListener('pointermove',hover);row.addEventListener('pointerleave',close);row.addEventListener('pointerdown',close);row.addEventListener('scroll',close,true);desktop.addEventListener('change',close);
  window.addEventListener('resize',close);window.addEventListener('blur',close);
  return()=>{row.removeEventListener('wheel',wheel);row.removeEventListener('pointerover',hover);row.removeEventListener('pointermove',hover);row.removeEventListener('pointerleave',close);row.removeEventListener('pointerdown',close);row.removeEventListener('scroll',close,true);desktop.removeEventListener('change',close);window.removeEventListener('resize',close);window.removeEventListener('blur',close);};
 },[]);
 // A pin, resize or filter edit ends the old preview; a wheel tile edit keeps it alive.
 useEffect(()=>dismiss.current(),[scheme.anchors,scheme.length,scheme.space,scheme.interpolation,scheme.filters,blocks,collection,blacklist]);
 return {root,preview};
}

export function SchemeWheelPreview({preview,resources}:{preview:Preview|null;resources:ModelResources|null}){
 const {t,blockName}=useLocale();
 if(!preview)return null;
 return createPortal(<div className="scheme-wheel-preview" role="status" aria-label={t('Scroll block candidates')} style={{left:preview.left,top:preview.top}}>
  {preview.blocks.map((block,i)=><div key={i} className="scheme-wheel-candidate" data-current={i===2} data-block-id={block?.id||''} role="img" aria-label={block?blockName(block.id,block.name):undefined} aria-hidden={i!==2}>
   {block&&<BlockThumbnail id={block.id} resources={resources}/>}
  </div>)}
 </div>,document.body);
}
