import {memo,useEffect,useMemo,useRef,useState} from 'react';
import {DopplerRange,GlassButton,GlassInput,GlassSelect,GlassSwitch,GlassDraggable,GlassScrollArea} from '@form-glass/react';
import {X} from 'lucide-react';
import {useLocale} from './i18n';
import {axisLabels} from './spaces.mjs';
import {VoxelSlice} from './VoxelSlice';
import type {Sample,Space,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';
export const VoxelSectionWindow=memo(function VoxelSectionWindow({open,section,onChange,onClose,data,samples,resources,space,variance,selected,onSelect}:{open:boolean;section:VoxelSection;onChange:(patch:Partial<VoxelSection>)=>void;onClose:()=>void;data:VoxelData|null;samples:Sample[];resources:ModelResources|null;space:Space;variance:boolean;selected:string;onSelect:(id:string)=>void}){
 const {view}=useLocale(),[draft,setDraft]=useState(section.position),[present,setPresent]=useState(false);
 const [position,setPosition]=useState({x:360,y:140});
 const sliceSection=useMemo(()=>({...section,position:draft}),[section.axis,section.enabled,section.style,section.flip,draft]);
 const frame=useRef(0),pending=useRef<number|null>(null),last=useRef(0),latest=useRef({open,onChange});latest.current={open,onChange};
 const cancel=()=>{cancelAnimationFrame(frame.current);frame.current=0;pending.current=null;};
 useEffect(()=>{setDraft(section.position);},[section.position]);
 useEffect(()=>{if(!open)cancel();return cancel;},[open,data]);
 const commit=(value:number)=>{cancel();setDraft(value);onChange({position:value,preview:false});};
 const preview=(value:number)=>{
  setDraft(value);pending.current=value;if(frame.current)return;
  const flush=(now:number)=>{frame.current=0;if(!latest.current.open){pending.current=null;return;}if(now-last.current<33){frame.current=requestAnimationFrame(flush);return;}const next=pending.current;pending.current=null;last.current=now;if(next!==null)latest.current.onChange({position:next,preview:true});};
  frame.current=requestAnimationFrame(flush);
 };
 const close=()=>{cancel();onClose();requestAnimationFrame(()=>{const trigger=document.getElementById('voxel-section-trigger');(trigger?.closest('[inert]')?document.querySelector<HTMLElement>('[aria-controls="explorer-controls"]'):trigger)?.focus();});};
 return view(<GlassDraggable id="voxel-section-window" className="voxel-section-window" position={position} onPositionChange={setPosition} label="Move section" reveal={open} onRevealPrepare={opening=>{if(opening)setPresent(true);}} onRevealCommit={opening=>{if(!opening)setPresent(false);}} style={{visibility:present?'visible':'hidden',zIndex:40}} aria-hidden={!open} {...(!open?{inert:''} as any:{})} revealOriginBox={()=>document.getElementById('voxel-section-trigger')?.getBoundingClientRect()||null} role="region" aria-label="Voxel section" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
  <div className="section-window-heading"><h2>Voxel section</h2><GlassButton aria-label="Close voxel section" onClick={close}><X size={16}/></GlassButton></div>
  <GlassScrollArea label="Voxel section controls" maxHeight="var(--section-height)" viewportClassName="section-window-viewport"><div className="voxel-section-controls">
   <div className="section-window-selects"><GlassSelect label="Section axis" value={section.axis} onChange={v=>onChange({axis:v as VoxelSection['axis']})} options={[...['x','y','z'].map((value,i)=>({value,label:axisLabels(space,variance)[i]})),...(!variance&&space.startsWith('h')?[{value:'hue',label:'Hue angle'},{value:'radius',label:'Radius'}]:[])]}/>
   <GlassSelect label="Section display" value={section.style} onChange={v=>onChange({style:v as VoxelSection['style']})} options={[{value:'cutaway',label:'Cutaway volume'},{value:'layer',label:'Single voxel layer'}]}/></div>
   <div className="parameter-control section-position"><GlassInput label="Section position value" hint="0–100%" type="number" min={0} max={100} step={1} value={draft} onChange={e=>{if(e.target.value!=='')commit(Math.max(0,Math.min(100,Math.round(Number(e.target.value)))));}}/><DopplerRange label="Section position" value={section.position} min={0} max={100} step={1} onPreview={preview} onChange={commit}/></div>
   {section.style==='cutaway'&&<GlassSwitch label="Reverse side" checked={section.flip} onChange={v=>onChange({flip:v})}/>}
   <p className="micro section-update-status" data-live="true">Live 3D while dragging</p>
   {data&&open?<VoxelSlice data={data} section={sliceSection} samples={samples} resources={resources} selected={selected} onSelect={onSelect}/>:<p className="micro muted">Preparing voxel grid…</p>}
  </div></GlassScrollArea>
 </GlassDraggable>);
});
