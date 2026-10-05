import {useEffect,useRef,type ReactNode,type PointerEvent} from 'react';
import {useLocale} from './i18n';

export function DraggableBlock({id,children}:{id:string;children:ReactNode}){
 const {t}=useLocale(),drag=useRef<{pointer:number;x:number;y:number;ghost:HTMLElement;target:HTMLElement|null;frame:number}|null>(null);
 const clear=()=>{const d=drag.current;if(!d)return;cancelAnimationFrame(d.frame);d.target?.removeAttribute('data-pointer-drop');d.ghost.remove();drag.current=null;};
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')clear();};window.addEventListener('blur',clear);window.addEventListener('keydown',escape);return()=>{window.removeEventListener('blur',clear);window.removeEventListener('keydown',escape);clear();};},[id]);
 const position=(x:number,y:number)=>`translate3d(${Math.max(8,Math.min(x+14,innerWidth-208))}px,${Math.max(8,Math.min(y+14,innerHeight-72))}px,0)`;
 const start=(e:PointerEvent<HTMLDivElement>)=>{
  if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
  // A pixel copy avoids cloning managed glass elements or creating another GPU context.
  const ghost=document.createElement('div');ghost.className='block-drag-preview';ghost.setAttribute('aria-hidden','true');
  const source=e.currentTarget.querySelector('canvas');if(source){const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;canvas.getContext('2d')!.drawImage(source,0,0,96,96);ghost.append(canvas);}
  const label=document.createElement('span');label.textContent=e.currentTarget.querySelector('h2')!.textContent;ghost.append(label);
  ghost.style.transform=position(e.clientX,e.clientY);document.body.append(ghost);
  drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,ghost,target:null,frame:0};
 };
 const move=(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;d.x=e.clientX;d.y=e.clientY;if(d.frame)return;d.frame=requestAnimationFrame(()=>{
  d.frame=0;d.ghost.style.transform=position(d.x,d.y);
  const target=document.elementFromPoint(d.x,d.y)?.closest<HTMLElement>('[data-scheme-slot]')||null;
  if(target!==d.target){d.target?.removeAttribute('data-pointer-drop');target?.setAttribute('data-pointer-drop','true');d.target=target;}
 });};
 const finish=(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-scheme-slot]');clear();if(target)document.dispatchEvent(new CustomEvent('block-gamut-scheme-drop',{detail:{scheme:target.dataset.schemeId,slot:Number(target.dataset.schemeSlot),block:id}}));};
 return <div className="inspector-heading draggable-block" title={t('Drag this block into a colour scheme')} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={clear} onLostPointerCapture={clear}>{children}</div>;
}
