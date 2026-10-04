import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {useGlass} from '@form-glass/react';

/** In-flow disclosure: animate real content, so it remains clipped to its
 * scrolling panel. FORM's fixed paint copies are intended for floating shells.
 * Uses the provider's original blur/fade stages and monotonic motion curve. */
export function GlassDisclosure({open,id,children}:{open:boolean;id:string;children:ReactNode}){
 const outer=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null);
 const {animations}=useGlass(),settings=useRef(animations);settings.current=animations;
 const initialized=useRef(false);
 useLayoutEffect(()=>{
  const box=outer.current!,content=body.current!,{values,curve}=settings.current;
  const ease=(t:number)=>curve==='linear'?t:curve==='smootherstep'?t*t*t*(t*(t*6-15)+10):t**3/(t**3+(1-t)**3);
  const from=box.getBoundingClientRect().height,paint=getComputedStyle(content);
  const opacity=Number(paint.opacity),blur=parseFloat(paint.filter.match(/blur\(([^)]+)/)?.[1]||'0');
  let cancelled=false;
  const finish=()=>{box.style.height=open?'auto':'0px';box.style.overflow=open?'visible':'hidden';content.style.visibility=open?'visible':'hidden';content.style.opacity=open?'1':'0';content.style.filter='none';delete box.dataset.disclosurePhase;};
  if(!initialized.current||matchMedia('(prefers-reduced-motion: reduce)').matches){initialized.current=true;finish();return;}
  box.style.overflow='hidden';content.style.visibility='visible';
  box.dataset.disclosurePhase=open?'opening':'closing';
  const total=values['blur-out']+values['fade-out'],split=total?(open?values['fade-out']:values['blur-out'])/total:0;
  const frames=Array.from({length:61},(_,i)=>{
   const t=i/60,early=split?Math.min(1,t/split):1,late=split<1?Math.max(0,(t-split)/(1-split)):Number(t===1);
   const a=ease(open?early:late),b=ease(open?late:early);
   return {offset:t,opacity:opacity+((open?1:0)-opacity)*a,filter:`blur(${blur+((open?0:values['content-blur'])-blur)*b}px)`};
  });
  // A fully closed element starts blurred; a reversal starts at its current paint.
  if(open&&from===0)for(const frame of frames){const t=frame.offset,late=split<1?Math.max(0,(t-split)/(1-split)):Number(t===1);frame.filter=`blur(${values['content-blur']*(1-ease(late))}px)`;}
  const to=open?content.getBoundingClientRect().height:0;
  const height=box.animate(Array.from({length:61},(_,i)=>({offset:i/60,height:`${from+(to-from)*ease(i/60)}px`})),{duration:values[open?'open':'close'],fill:'both'});
  const fade=content.animate(frames,{duration:total,fill:'both'});
  Promise.all([height.finished,fade.finished]).then(()=>{if(!cancelled){finish();height.cancel();fade.cancel();}}).catch(()=>{/* Cancelled by reversal/unmount. */});
  return()=>{cancelled=true;box.style.height=`${box.getBoundingClientRect().height}px`;const current=getComputedStyle(content);content.style.opacity=current.opacity;content.style.filter=current.filter;height.cancel();fade.cancel();};
 },[open]);
 return <div ref={outer} id={id} className="glass-disclosure" aria-hidden={!open} {...(!open?{inert:''} as any:{})}><div ref={body} className="glass-disclosure-body">{children}</div></div>;
}
