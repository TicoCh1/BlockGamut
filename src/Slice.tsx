import {useLocale} from './i18n';
import {useEffect,useRef,useState} from 'react';
import {GlassSelect,ParameterControl} from '@form-glass/react';
import {fromLab,inGamut,rgbHex} from './color.mjs';
import type {Sample} from './types';
export function Slice({samples,lightness,threshold,onLightness,onPick}:{samples:Sample[];lightness:number;threshold:number;onLightness:(v:number)=>void;onPick:(hex:string)=>void}){
 const {view,t,locale}=useLocale();
 const canvas=useRef<HTMLCanvasElement>(null),worker=useRef<Worker>(),seq=useRef(0);const [mode,setMode]=useState('reference'),[stats,setStats]=useState({matched:0,total:0}),[busy,setBusy]=useState(true);
 useEffect(()=>{const w=new Worker(new URL('./analysis.worker.ts',import.meta.url),{type:'module'});worker.current=w;w.onmessage=e=>{if(e.data.id!==seq.current)return;const {pixels,n,matched,total}=e.data;canvas.current?.getContext('2d')?.putImageData(new ImageData(pixels,n,n),0,0);setStats({matched,total});setBusy(false);};return()=>w.terminate();},[]);
 useEffect(()=>{worker.current?.postMessage({type:'catalog',samples});},[samples]);
 useEffect(()=>{setBusy(true);const id=++seq.current;worker.current?.postMessage({id,type:'slice',lightness,threshold,mode});},[samples,lightness,threshold,mode]);
 return view(<section className="slice-section"><div className="section-label"><span>02 / LIGHTNESS SECTION</span><span>L {lightness.toFixed(2)}</span></div>
  <GlassSelect label="Slice display" value={mode} onChange={setMode} options={[{value:'reference',label:'sRGB reference'},{value:'matched',label:'Nearest block colours'},{value:'coverage',label:'Within tolerance'}]}/>
  <div className="slice-chart"><canvas ref={canvas} width={192} height={192} aria-label="Oklab lightness slice. Click a displayable colour to match blocks." onClick={e=>{if(busy)return;const rect=e.currentTarget.getBoundingClientRect();const rgb=fromLab([lightness,(e.clientX-rect.left)/rect.width*.8-.4,.4-(e.clientY-rect.top)/rect.height*.8]);if(inGamut(rgb))onPick(rgbHex(rgb));}}/><span className="slice-axis top">+b</span><span className="slice-axis bottom">−b</span><span className="slice-axis left">−a</span><span className="slice-axis right">+a</span></div>
  <ParameterControl label="Lightness" value={lightness} min={0} max={1} step={.01} unit="" onChange={onLightness}/>
  <p className="micro">{busy?'Computing section…':`${stats.total?(100*stats.matched/stats.total).toFixed(1):'0.0'}% of this sampled slice within ΔE ${threshold.toFixed(3)}`}</p>
  <p className="micro muted">Click a colour to find its nearest material. Grey in tolerance view means no close match.</p>
 </section>);
}
