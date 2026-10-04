import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {DopplerRange,GlassButton,GlassDraggable,GlassField,GlassSelect,GlassSwitch} from '@form-glass/react';
import {X} from 'lucide-react';
import {useLocale} from './i18n';
import {axisLabels} from './spaces.mjs';
import {VoxelSlice} from './VoxelSlice';
import type {Sample,Space,VoxelData,VoxelSection} from './types';
import type {ModelResources} from './useModels';
const edges=['top','right','bottom','left'] as const;
export function VoxelSectionWindow({open,section,onChange,onClose,data,samples,resources,space,variance,selected,onSelect}:{open:boolean;section:VoxelSection;onChange:(patch:Partial<VoxelSection>)=>void;onClose:()=>void;data:VoxelData|null;samples:Sample[];resources:ModelResources|null;space:Space;variance:boolean;selected:string;onSelect:(id:string)=>void}){
 const {view}=useLocale(),[hidden,setHidden]=useState(!open),[draft,setDraft]=useState(section.position);
 const [position,setPosition]=useState(()=>({x:Math.max(8,Math.min(290,innerWidth-332)),y:Math.min(110,Math.max(8,innerHeight-600))}));
 const frame=useRef(0),pending=useRef<number|null>(null),last=useRef(0),latest=useRef({open,onChange});latest.current={open,onChange};
 const cancel=()=>{cancelAnimationFrame(frame.current);frame.current=0;pending.current=null;};
 useEffect(()=>{setDraft(section.position);},[section.position]);
 useEffect(()=>{if(!open)cancel();return cancel;},[open,data]);
 useEffect(()=>{const clamp=()=>{const el=document.getElementById('voxel-section-window'),box=el?.getBoundingClientRect();setPosition(p=>({x:Math.max(8,Math.min(p.x,innerWidth-(box?.width||324)-8)),y:Math.max(8,Math.min(p.y,innerHeight-Math.min(box?.height||580,innerHeight-16)-8))}));};window.addEventListener('resize',clamp);return()=>window.removeEventListener('resize',clamp);},[]);
 const commit=(value:number)=>{cancel();setDraft(value);onChange({position:value,preview:false});};
 const preview=(value:number)=>{
  setDraft(value);pending.current=value;if(frame.current)return;
  const flush=(now:number)=>{frame.current=0;if(!latest.current.open){pending.current=null;return;}if(now-last.current<33){frame.current=requestAnimationFrame(flush);return;}const next=pending.current;pending.current=null;last.current=now;if(next!==null)latest.current.onChange({position:next,preview:true});};
  frame.current=requestAnimationFrame(flush);
 };
 const close=()=>{cancel();onClose();requestAnimationFrame(()=>{const trigger=document.getElementById('voxel-section-trigger');(trigger?.closest('[inert]')?document.querySelector<HTMLElement>('[aria-controls="explorer-controls"]'):trigger)?.focus();});};
 // Keep the shell hidden until FORM has installed its initial animation frame.
 // The default 100% origin only blurs content; use the disclosure's dimensions
 // so this independent window also expands/contracts at its current position.
 const revealOriginBox=()=>{const box=document.getElementById('voxel-section-trigger')?.getBoundingClientRect();return {width:box?.width||212,height:box?.height||36};};
 return view(<GlassDraggable id="voxel-section-window" className="voxel-section-window" data-glass-reveal-mode="visibility" role="dialog" aria-modal={false} aria-label="Voxel section" aria-hidden={!open} {...(!open?{inert:''} as any:{})} position={position} onPositionChange={setPosition} label="Drag section window" bounds="viewport" fade={edges} reveal={open} revealOriginBox={revealOriginBox} onRevealPrepare={opening=>{if(opening)setHidden(false);}} onRevealCommit={opening=>{if(!opening)setHidden(true);}} onRevealEnd={opening=>setHidden(!opening)} style={{'--section-top':`${position.y}px`,visibility:hidden?'hidden':undefined,pointerEvents:open?undefined:'none',transformOrigin:'top left'} as CSSProperties} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
  <div className="section-window-heading"><h2>Voxel section</h2><GlassButton fade={edges} aria-label="Close voxel section" onClick={close}><X size={16}/></GlassButton></div>
  <div className="section-window-body"><div className="voxel-section-controls">
   <div className="section-window-selects"><GlassSelect label="Section axis" value={section.axis} onChange={v=>onChange({axis:v as VoxelSection['axis']})} options={[...['x','y','z'].map((value,i)=>({value,label:axisLabels(space,variance)[i]})),...(!variance&&space.startsWith('h')?[{value:'hue',label:'Hue angle'},{value:'radius',label:'Radius'}]:[])]}/>
   <GlassSelect label="Section display" value={section.style} onChange={v=>onChange({style:v as VoxelSection['style']})} options={[{value:'cutaway',label:'Cutaway volume'},{value:'layer',label:'Single voxel layer'}]}/></div>
   <div className="parameter-control section-position"><div className="parameter-heading"><span>Section position</span><GlassField className="parameter-number"><input type="number" aria-label="Section position value" min={0} max={100} step={1} value={draft} onChange={e=>{if(e.target.value!=='')commit(Math.max(0,Math.min(100,Math.round(Number(e.target.value)))));}}/><span>%</span></GlassField></div><DopplerRange label="Section position" value={section.position} min={0} max={100} step={1} onPreview={preview} onChange={commit}/></div>
   {section.style==='cutaway'&&<GlassSwitch label="Reverse side" checked={section.flip} onChange={v=>onChange({flip:v})}/>}
   <p className="micro section-update-status" data-live="true">Live 3D while dragging</p>
   {data?<VoxelSlice data={data} section={{...section,position:draft}} samples={samples} resources={resources} selected={selected} onSelect={onSelect}/>:<p className="micro muted">Preparing voxel grid…</p>}
  </div></div>
 </GlassDraggable>);
}
