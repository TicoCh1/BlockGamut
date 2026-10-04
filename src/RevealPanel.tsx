import {useState,type ReactNode,type HTMLAttributes} from 'react';
import {Glass} from '@form-glass/react';
/** Keep the shell and its content alive until FORM completes its reveal timeline. */
export function RevealPanel({open,id,className,children,originId,collapseToCircle=false,onPrepare,onEnd,style,...props}:HTMLAttributes<HTMLDivElement>&{open:boolean;id:string;className:string;children:ReactNode;originId?:string;collapseToCircle?:boolean;onPrepare?:(open:boolean)=>void;onEnd?:(open:boolean)=>void}){
 const [hidden,setHidden]=useState(true);
 const origin=()=>{if(collapseToCircle)return {width:24,height:24};const rect=originId?document.getElementById(originId)?.getBoundingClientRect():null;return {width:rect?.width||48,height:rect?.height||32};};
 return <Glass {...props} id={id} className={`${className} reveal-panel`} fade={['top','right','bottom','left']} data-glass-reveal-mode="visibility" data-glass-reveal-collapse={collapseToCircle?'circle':undefined}
  reveal={open} revealOriginBox={origin} onRevealPrepare={opening=>{if(opening)setHidden(false);else if(document.getElementById(id)?.contains(document.activeElement)&&originId)document.getElementById(originId)?.focus({preventScroll:true});onPrepare?.(opening);}} onRevealEnd={opening=>{setHidden(!opening);onEnd?.(opening);}}
  onRevealCommit={opening=>{if(!opening)setHidden(true);}}
  aria-hidden={!open} {...(!open||hidden?{inert:''} as any:{})}
  style={{transformOrigin:'top right',...style,visibility:hidden?'hidden':undefined,pointerEvents:open?undefined:'none'}}>
  {children}
 </Glass>;
}
