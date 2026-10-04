import {useLayoutEffect,useRef,useState,type ReactNode,type HTMLAttributes} from 'react';
import {Glass} from '@form-glass/react';
/** Animate the original panel on the compositor; never clone/rasterize its UI. */
export function RevealPanel({open,id,className,children,originId,collapseToCircle=false,onPrepare,onEnd,style,...props}:HTMLAttributes<HTMLDivElement>&{open:boolean;id:string;className:string;children:ReactNode;originId?:string;collapseToCircle?:boolean;onPrepare?:(open:boolean)=>void;onEnd?:(open:boolean)=>void}){
 const [hidden,setHidden]=useState(!open),callbacks=useRef({onPrepare,onEnd});callbacks.current={onPrepare,onEnd};
 const initial=useRef(true);
 useLayoutEffect(()=>{
  const element=document.getElementById(id);if(!element)return;
  callbacks.current.onPrepare?.(open);
  if(open)setHidden(false);
  else if(element.contains(document.activeElement)&&originId)document.getElementById(originId)?.focus({preventScroll:true});
  if(initial.current||matchMedia('(prefers-reduced-motion: reduce)').matches){initial.current=false;setHidden(!open);callbacks.current.onEnd?.(open);return;}
  const duration=180,paint=getComputedStyle(element),animation=element.animate([
   {opacity:paint.opacity,transform:paint.transform==='none'?'translateY(0) scale(1)':paint.transform},
   {opacity:open?1:0,transform:open?'translateY(0) scale(1)':'translateY(6px) scale(.98)'}
  ],{duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'});
  let cancelled=false;
  animation.finished.then(()=>{if(!cancelled){setHidden(!open);callbacks.current.onEnd?.(open);}}).catch(()=>{});
  return()=>{cancelled=true;animation.commitStyles();animation.cancel();};
 },[open,id,originId]);
 return <Glass {...props} id={id} className={`${className} reveal-panel fast-panel`} fade={['top','right','bottom','left']}
  aria-hidden={!open} {...(!open?{inert:''} as any:{})}
  style={{transformOrigin:'top right',...style,visibility:hidden?'hidden':undefined,opacity:hidden?0:undefined,pointerEvents:open?undefined:'none'}}>
  {children}
 </Glass>;
}
