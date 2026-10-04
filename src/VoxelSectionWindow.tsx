import {memo,useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {DopplerRange,GlassButton,GlassField,GlassSelect,GlassSwitch} from '@form-glass/react';
import {X,GripHorizontal} from 'lucide-react';
import {RevealPanel} from './RevealPanel';
import {useLocale} from './i18n';
import {axisLabels} from './spaces.mjs';
import {VoxelSlice} from './VoxelSlice';
import type {Sample,Space,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';
const edges=['top','right','bottom','left'] as const;
export const VoxelSectionWindow=memo(function VoxelSectionWindow({open,section,onChange,onClose,data,samples,resources,space,variance,selected,onSelect}:{open:boolean;section:VoxelSection;onChange:(patch:Partial<VoxelSection>)=>void;onClose:()=>void;data:VoxelData|null;samples:Sample[];resources:ModelResources|null;space:Space;variance:boolean;selected:string;onSelect:(id:string)=>void}){
 const {view,t}=useLocale(),[draft,setDraft]=useState(section.position);
 const position=useRef({x:Math.max(8,Math.min(290,innerWidth-332)),y:Math.min(110,Math.max(8,innerHeight-600))});
 const wrapper=useRef<HTMLDivElement>(null),dragFrame=useRef(0),drag=useRef<{pointer:number;x:number;y:number;left:number;top:number;width:number;height:number}|null>(null);
 const sliceSection=useMemo(()=>({...section,position:draft}),[section.axis,section.enabled,section.style,section.flip,draft]);
 const move=(x:number,y:number,width:number,height:number)=>{position.current={x:Math.max(8,Math.min(x,innerWidth-width-8)),y:Math.max(8,Math.min(y,innerHeight-height-8))};if(!dragFrame.current)dragFrame.current=requestAnimationFrame(()=>{dragFrame.current=0;const el=wrapper.current;if(el)el.style.transform=`translate3d(${position.current.x}px,${position.current.y}px,0)`;});};
 const startDrag=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(e.button!==0)return;const box=wrapper.current!.getBoundingClientRect();drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:position.current.x,top:position.current.y,width:box.width,height:box.height};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();};
 const finishDrag=()=>{drag.current=null;wrapper.current?.style.setProperty('--section-top',`${position.current.y}px`);};
 const frame=useRef(0),pending=useRef<number|null>(null),last=useRef(0),latest=useRef({open,onChange});latest.current={open,onChange};
 const cancel=()=>{cancelAnimationFrame(frame.current);frame.current=0;pending.current=null;};
 useEffect(()=>{setDraft(section.position);},[section.position]);
 useEffect(()=>{if(!open)cancel();return cancel;},[open,data]);
 useEffect(()=>{const clamp=()=>{const box=wrapper.current?.getBoundingClientRect();move(position.current.x,position.current.y,box?.width||324,Math.min(box?.height||580,innerHeight-16));finishDrag();};window.addEventListener('resize',clamp);return()=>{window.removeEventListener('resize',clamp);cancelAnimationFrame(dragFrame.current);};},[]);
 const commit=(value:number)=>{cancel();setDraft(value);onChange({position:value,preview:false});};
 const preview=(value:number)=>{
  setDraft(value);pending.current=value;if(frame.current)return;
  const flush=(now:number)=>{frame.current=0;if(!latest.current.open){pending.current=null;return;}if(now-last.current<33){frame.current=requestAnimationFrame(flush);return;}const next=pending.current;pending.current=null;last.current=now;if(next!==null)latest.current.onChange({position:next,preview:true});};
  frame.current=requestAnimationFrame(flush);
 };
 const close=()=>{cancel();onClose();requestAnimationFrame(()=>{const trigger=document.getElementById('voxel-section-trigger');(trigger?.closest('[inert]')?document.querySelector<HTMLElement>('[aria-controls="explorer-controls"]'):trigger)?.focus();});};
 return view(<div ref={wrapper} className="section-window-position" style={{transform:`translate3d(${position.current.x}px,${position.current.y}px,0)`,'--section-top':`${position.current.y}px`,pointerEvents:open?'auto':'none'} as CSSProperties}>
 <RevealPanel id="voxel-section-window" className="voxel-section-window" open={open} originId="voxel-section-trigger" role="dialog" aria-modal={false} aria-label="Voxel section" style={{transformOrigin:'top left'}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
  <button className="section-drag-handle" aria-label={t('Drag section window')} onPointerDown={startDrag} onPointerMove={e=>{const d=drag.current;if(d?.pointer===e.pointerId)move(d.left+e.clientX-d.x,d.top+e.clientY-d.y,d.width,d.height);}} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={e=>{const offsets:Record<string,number[]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const offset=offsets[e.key];if(offset){e.preventDefault();const box=wrapper.current!.getBoundingClientRect(),step=e.shiftKey?1:10;move(position.current.x+offset[0]*step,position.current.y+offset[1]*step,box.width,box.height);finishDrag();}}}><span>Drag section window</span><GripHorizontal size={14}/></button>
  <div className="section-window-heading"><h2>Voxel section</h2><GlassButton fade={edges} aria-label="Close voxel section" onClick={close}><X size={16}/></GlassButton></div>
  <div className="section-window-body"><div className="voxel-section-controls">
   <div className="section-window-selects"><GlassSelect label="Section axis" value={section.axis} onChange={v=>onChange({axis:v as VoxelSection['axis']})} options={[...['x','y','z'].map((value,i)=>({value,label:axisLabels(space,variance)[i]})),...(!variance&&space.startsWith('h')?[{value:'hue',label:'Hue angle'},{value:'radius',label:'Radius'}]:[])]}/>
   <GlassSelect label="Section display" value={section.style} onChange={v=>onChange({style:v as VoxelSection['style']})} options={[{value:'cutaway',label:'Cutaway volume'},{value:'layer',label:'Single voxel layer'}]}/></div>
   <div className="parameter-control section-position"><div className="parameter-heading"><span>Section position</span><GlassField className="parameter-number"><input type="number" aria-label="Section position value" min={0} max={100} step={1} value={draft} onChange={e=>{if(e.target.value!=='')commit(Math.max(0,Math.min(100,Math.round(Number(e.target.value)))));}}/><span>%</span></GlassField></div><DopplerRange label="Section position" value={section.position} min={0} max={100} step={1} onPreview={preview} onChange={commit}/></div>
   {section.style==='cutaway'&&<GlassSwitch label="Reverse side" checked={section.flip} onChange={v=>onChange({flip:v})}/>}
   <p className="micro section-update-status" data-live="true">Live 3D while dragging</p>
   {data&&open?<VoxelSlice data={data} section={sliceSection} samples={samples} resources={resources} selected={selected} onSelect={onSelect}/>:<p className="micro muted">Preparing voxel grid…</p>}
  </div></div>
 </RevealPanel></div>);
});
