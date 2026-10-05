import {useEffect,useRef,type ReactNode,type PointerEvent} from 'react';
import {useLocale} from './i18n';

export function DraggableBlock({id,name,source,onClick,className='inspector-heading',children}:{id:string;name?:string;source?:{scheme:string;slot:number};onClick?:()=>void;className?:string;children:ReactNode}){
 const {t}=useLocale();
 const drag=useRef<{pointer:number;startX:number;startY:number;x:number;y:number;ghost:HTMLElement|null;target:HTMLElement|null;frame:number;origin:HTMLElement}|null>(null);
 const clear=()=>{const d=drag.current;if(!d)return;cancelAnimationFrame(d.frame);d.target?.removeAttribute('data-pointer-drop');d.origin.removeAttribute('data-dragging');d.ghost?.remove();drag.current=null;};
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')clear();};window.addEventListener('blur',clear);window.addEventListener('keydown',escape);return()=>{window.removeEventListener('blur',clear);window.removeEventListener('keydown',escape);clear();};},[id]);
 const position=(x:number,y:number)=>`translate3d(${Math.max(8,Math.min(x+14,innerWidth-208))}px,${Math.max(8,Math.min(y+14,innerHeight-72))}px,0)`;
 const start=(e:PointerEvent<HTMLDivElement>)=>{
  if(e.button!==0||!id)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,ghost:null,target:null,frame:0,origin:e.currentTarget};
 };
 const move=(e:PointerEvent<HTMLDivElement>)=>{
  const d=drag.current;if(!d||d.pointer!==e.pointerId)return;d.x=e.clientX;d.y=e.clientY;
  if(!d.ghost){
   if(Math.hypot(d.x-d.startX,d.y-d.startY)<5)return;
   const ghost=document.createElement('div');ghost.className='block-drag-preview';ghost.setAttribute('aria-hidden','true');
   const thumbnail=d.origin.querySelector('canvas');if(thumbnail){const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;canvas.getContext('2d')!.drawImage(thumbnail,0,0,96,96);ghost.append(canvas);}
   const label=document.createElement('span');label.textContent=name||d.origin.querySelector('h2')!.textContent;ghost.append(label);
   (d.origin.closest('dialog')||document.body).append(ghost);d.ghost=ghost;d.origin.setAttribute('data-dragging','true');
  }
  if(d.frame)return;d.frame=requestAnimationFrame(()=>{
   d.frame=0;d.ghost!.style.transform=position(d.x,d.y);
   const target=document.elementFromPoint(d.x,d.y)?.closest<HTMLElement>('[data-scheme-slot]')||null;
   if(target!==d.target){d.target?.removeAttribute('data-pointer-drop');target?.setAttribute('data-pointer-drop','true');d.target=target;}
  });
 };
 const finish=(e:PointerEvent<HTMLDivElement>)=>{
  const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
  const dragged=!!d.ghost,target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-scheme-slot]');clear();
  if(!dragged){onClick?.();return;}
  if(target||source)document.dispatchEvent(new CustomEvent('block-gamut-scheme-drop',{detail:{scheme:target?.dataset.schemeId,slot:target?Number(target.dataset.schemeSlot):undefined,block:id,source}}));
 };
 return <div className={`${className} draggable-block`} title={t(source?'Drag to reorder; drag out to remove':'Drag this block into a colour scheme')} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={clear} onLostPointerCapture={clear}>{children}</div>;
}
