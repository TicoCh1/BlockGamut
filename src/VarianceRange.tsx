import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {useLocale} from './i18n';
import {GlassButton} from '@form-glass/react';

const resolution=1000,floor=1e-6;
export const formatVariance=(value:number)=>value===0?'0':value<.0001?value.toExponential(2):Number(value.toPrecision(4)).toString();

export function VarianceRange({value,maximum,space,onChange}:{value:[number,number];maximum:number;space:string;onChange:(value:[number,number])=>void}){
 const {t}=useLocale(),domain=Math.max(maximum,value[0],Number.isFinite(value[1])?value[1]:0),span=Math.log1p(domain/floor);
 const tick=(v:number)=>Math.round(Math.log1p(v/floor)/span*resolution);
 const amount=(v:number)=>v===resolution?domain:Math.expm1(v/resolution*span)*floor;
 const [draft,setDraft]=useState<[number,number]>([tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution]);
 const current=useRef(draft),rail=useRef<HTMLDivElement>(null),drag=useRef<{index:number;pointer:number;left:number;width:number;offset:number}|null>(null);
 useEffect(()=>{const next:[number,number]=[tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution];current.current=next;setDraft(next);},[value[0],value[1],domain]);
 const set=(index:number,position:number)=>{const next:[number,number]=[...current.current];next[index]=Math.max(index===0?0:next[0],Math.min(index===0?next[1]:resolution,position));current.current=next;setDraft(next);};
 const commit=()=>onChange([amount(current.current[0]),current.current[1]===resolution?Infinity:amount(current.current[1])]);
 const start=(event:PointerEvent<HTMLButtonElement>,index:number)=>{if(event.button!==0)return;const box=rail.current!.getBoundingClientRect();drag.current={index,pointer:event.pointerId,left:box.left,width:box.width,offset:event.clientX-box.left-current.current[index]/resolution*box.width};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();};
 const move=(event:PointerEvent<HTMLButtonElement>)=>{const d=drag.current;if(d?.pointer===event.pointerId)set(d.index,Math.round((event.clientX-d.left-d.offset)/d.width*resolution));};
 const finish=()=>{drag.current=null;commit();};
 const key=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{let next=current.current[index];switch(event.key){case 'ArrowLeft':case 'ArrowDown':next-=event.shiftKey?10:1;break;case 'ArrowRight':case 'ArrowUp':next+=event.shiftKey?10:1;break;case 'PageDown':next-=100;break;case 'PageUp':next+=100;break;case 'Home':next=0;break;case 'End':next=resolution;break;default:return;}event.preventDefault();set(index,next);commit();};
 return <section className="variance-range" aria-label={t('Variance range')}>
  <div className="variance-range-heading"><span>{t('Variance range')} <small>{t(space)}</small></span><GlassButton className="variance-reset" aria-label={t('Reset variance range')} onClick={()=>onChange([0,Infinity])}>↺</GlassButton></div>
  <div className="variance-values"><output>{formatVariance(amount(draft[0]))}</output><output>{formatVariance(amount(draft[1]))}</output></div>
  <div className="variance-track" ref={rail}><span className="variance-rail"/><span className="variance-selected" style={{left:`${draft[0]/10}%`,width:`${(draft[1]-draft[0])/10}%`}}/>
   {[0,1].map(index=><button key={index} type="button" role="slider" data-glass-audit-ignore="line-range" className={`variance-handle handle-${index}`} aria-label={t(index===0?'Minimum variance':'Maximum variance')} aria-valuemin={index===0?0:amount(draft[0])} aria-valuemax={index===0?amount(draft[1]):domain} aria-valuenow={amount(draft[index])} aria-valuetext={formatVariance(amount(draft[index]))} aria-orientation="horizontal" style={{left:`${draft[index]/10}%`}} onPointerDown={e=>start(e,index)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onKeyDown={e=>key(e,index)}><span aria-hidden="true">{index===0?'‹│':'│›'}</span></button>)}
  </div>
 </section>;
}
