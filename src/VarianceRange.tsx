import {useEffect,useMemo,useState} from 'react';
import {useLocale} from './i18n';
import {GlassButton,DopplerRangePair} from '@form-glass/react';

import {logVariance,rawVariance,formatLogVariance,varianceHistogram} from './varianceScale.mjs';
const resolution=1000;

export function VarianceRange({value,maximum,values,space,onChange}:{value:[number,number];maximum:number;values:number[];space:string;onChange:(value:[number,number])=>void}){
 const {t}=useLocale(),domain=Math.max(maximum,value[0],Number.isFinite(value[1])?value[1]:0),span=logVariance(domain);
 const tick=(v:number)=>Math.round(span?logVariance(v)/span*resolution:0);
 const amount=(v:number)=>v===resolution?domain:rawVariance(v/resolution*span);
 const bins=useMemo(()=>varianceHistogram(values,domain),[values,domain]),peak=Math.max(1,...bins);
 const [draft,setDraft]=useState<[number,number]>([tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution]);
 useEffect(()=>setDraft([tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution]),[value[0],value[1],domain]);
 const commit=(next:[number,number])=>onChange([amount(next[0]),next[1]===resolution?Infinity:amount(next[1])]);
 return <section className="variance-range" aria-label={t('Variance range')}>
  <div className="variance-range-heading"><span>{t('Variance range')} <small>{t(space)}</small></span><GlassButton className="variance-reset" aria-label={t('Reset variance range')} onClick={()=>onChange([0,Infinity])}>↺</GlassButton></div>
  <svg className="variance-histogram" viewBox="0 0 320 52" preserveAspectRatio="none" role="img" aria-label={`${t('Variance distribution')} · ${values.length} ${t('blocks')}`}>
   {bins.map((count,i)=>{const x=i*10,height=count/peak*48,inside=(i+.5)/bins.length*resolution>=draft[0]&&(i+.5)/bins.length*resolution<=draft[1];return <rect key={i} x={x+.5} y={50-height} width={9} height={height} data-in-range={inside}><title>{(span*i/bins.length).toFixed(2)}–{(span*(i+1)/bins.length).toFixed(2)} · {count} {t('blocks')}</title></rect>;})}
   <line x1="0" y1="50" x2="320" y2="50"/>
  </svg>
  <div className="variance-values"><output>{formatLogVariance(amount(draft[0]))}</output><output>{formatLogVariance(amount(draft[1]))}</output></div>
  <DopplerRangePair labels={[t('Minimum variance'),t('Maximum variance')]} value={draft} min={0} max={resolution} step={1} formatValue={v=>formatLogVariance(amount(v))} onPreview={setDraft} onChange={commit}/>
  <p className="variance-scale">ln(1 + V / 0.000001)</p>

 </section>;
}
