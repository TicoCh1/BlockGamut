import {useEffect,useState} from 'react';
import {useLocale} from './i18n';
import {GlassButton,DopplerRangePair} from '@form-glass/react';

const resolution=1000,floor=1e-6;
export const formatVariance=(value:number)=>value===0?'0':value<.0001?value.toExponential(2):Number(value.toPrecision(4)).toString();

export function VarianceRange({value,maximum,space,onChange}:{value:[number,number];maximum:number;space:string;onChange:(value:[number,number])=>void}){
 const {t}=useLocale(),domain=Math.max(maximum,value[0],Number.isFinite(value[1])?value[1]:0),span=Math.log1p(domain/floor);
 const tick=(v:number)=>Math.round(span?Math.log1p(v/floor)/span*resolution:0);
 const amount=(v:number)=>v===resolution?domain:Math.expm1(v/resolution*span)*floor;
 const [draft,setDraft]=useState<[number,number]>([tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution]);
 useEffect(()=>setDraft([tick(value[0]),Number.isFinite(value[1])?tick(value[1]):resolution]),[value[0],value[1],domain]);
 const commit=(next:[number,number])=>onChange([amount(next[0]),next[1]===resolution?Infinity:amount(next[1])]);
 return <section className="variance-range" aria-label={t('Variance range')}>
  <div className="variance-range-heading"><span>{t('Variance range')} <small>{t(space)}</small></span><GlassButton className="variance-reset" aria-label={t('Reset variance range')} onClick={()=>onChange([0,Infinity])}>↺</GlassButton></div>
  <div className="variance-values"><output>{formatVariance(amount(draft[0]))}</output><output>{formatVariance(amount(draft[1]))}</output></div>
  <DopplerRangePair labels={[t('Minimum variance'),t('Maximum variance')]} value={draft} min={0} max={resolution} step={1} formatValue={v=>formatVariance(amount(v))} onPreview={setDraft} onChange={commit}/>

 </section>;
}
