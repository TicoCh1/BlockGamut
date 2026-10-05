import {BlockThumbnail} from './BlockThumbnail';
import {useEffect,useMemo,useState} from 'react';
import {GlassPanel,GlassButton,GlassInput,GlassSelect,GlassSwitch,GlassScrollArea,GlassDialog} from '@form-glass/react';
import {Plus,Settings2,X,Pin,RotateCcw} from 'lucide-react';
import {GeometryFilter} from './GeometryFilter';
import {VarianceRange} from './VarianceRange';
import {fillScheme,resizeAnchors,schemeLength,schemeMime} from './schemes.mjs';
import {spaces} from './spaces.mjs';
import {materialVariance} from './color.mjs';
import {useLocale} from './i18n';
import type {Block,Space} from './types';
import type {ModelResources} from './useModels';

interface SchemeFilters {categories:string[];query:string;opaque:boolean;tinted:boolean;list:string;varianceMin:number;varianceMax:number}
interface Scheme {id:string;name:string;length:number;anchors:Record<number,string>;space:Space;interpolation?:'lerp'|'slerp';filters:SchemeFilters;ranges:Partial<Record<Space,[number,number]>>}


function SchemeRow({scheme,blocks,resources,collection,blacklist,selected,onChange,onDelete,onSettings,onPick}:{scheme:Scheme;blocks:Block[];resources:ModelResources|null;collection:string[];blacklist:string[];selected:Block|undefined;onChange:(s:Scheme)=>void;onDelete:()=>void;onSettings:()=>void;onPick:(id:string)=>void}){
 const {view,t}=useLocale(),[slot,setSlot]=useState(0),[hover,setHover]=useState<number|null>(null);
 useEffect(()=>setSlot(v=>Math.min(v,scheme.length-1)),[scheme.length]);
 const cells=useMemo(()=>fillScheme(scheme,blocks,{collection,blacklist}),[scheme,blocks,collection,blacklist]);
 const anchor=(index:number,id:string)=>onChange({...scheme,anchors:{...scheme.anchors,[index]:id}});
 const addSelected=()=>{if(selected)anchor(slot,selected.id);};
 return view(<div className="scheme-row">
  <div className="scheme-row-heading">
   <GlassInput className="scheme-name" label="Scheme name" value={scheme.name} onChange={e=>onChange({...scheme,name:e.target.value})}/>
   <GlassInput className="scheme-length" key={scheme.id+':'+scheme.length} label="Length" type="number" min={3} step={1} defaultValue={scheme.length} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{const length=schemeLength(e.target.value);e.target.value=String(length);onChange({...scheme,length,anchors:resizeAnchors(scheme.anchors,scheme.length,length)});}}/>
   <div className="scheme-space"><GlassSelect label="Scheme colour space" value={scheme.space} options={spaces.map(({value,label})=>({value,label}))} onChange={value=>{const range=scheme.ranges[value as Space]||[0,Infinity];onChange({...scheme,space:value as Space,filters:{...scheme.filters,varianceMin:range[0],varianceMax:range[1]}});}}/></div>
   <div className="scheme-method"><GlassSelect label="Interpolation" value={scheme.interpolation||'lerp'} options={[{value:'lerp',label:'Lerp'},{value:'slerp',label:'Slerp'}]} onChange={value=>onChange({...scheme,interpolation:value as 'lerp'|'slerp'})}/></div>
   <div className="scheme-row-buttons"><GlassButton aria-label="Scheme filters" onClick={onSettings}><Settings2 size={13}/></GlassButton><GlassButton aria-label="Delete scheme" onClick={onDelete}><X size={13}/></GlassButton></div>
  </div>
  <GlassScrollArea label="Scheme blocks" height={78} viewportClassName="scheme-cells-viewport"><div className="scheme-cells">
   {cells.map(cell=><div key={cell.index} className="scheme-cell" data-scheme-id={scheme.id} data-scheme-slot={cell.index} data-anchor={cell.anchor} data-selected={slot===cell.index} data-drop={hover===cell.index} onDragOver={e=>{if(e.dataTransfer.types.includes(schemeMime)||e.dataTransfer.types.includes('text/plain')){e.preventDefault();e.dataTransfer.dropEffect='copy';setHover(cell.index);}}} onDragLeave={()=>setHover(null)} onDrop={e=>{e.preventDefault();setHover(null);const id=e.dataTransfer.getData(schemeMime)||e.dataTransfer.getData('text/plain');if(blocks.some(b=>b.id===id))anchor(cell.index,id);}}>
    <GlassButton aria-label={`${t('Scheme slot')} ${cell.index+1}: ${cell.id||cell.block?.id||'minecraft:air'}`} title={cell.block?`${cell.block.name} · ${cell.block.id}\n${cell.anchor?t('Control point'):t('Interpolated material')}`:cell.id?`${cell.id} · ${t('Unavailable in this release')}`:t('Drop a block here')} onClick={()=>{setSlot(cell.index);if(cell.block)onPick(cell.block.id);}}>{cell.block?<BlockThumbnail id={cell.block.id} resources={resources}/>:<span aria-hidden="true">+</span>}{cell.anchor&&<Pin className="scheme-pin" size={9}/>}</GlassButton>
    <span className="scheme-target" style={{background:cell.target||'transparent'}} title={cell.target||t('No control points')}/>
   </div>)}
  </div></GlassScrollArea>
  <div className="scheme-row-actions"><GlassButton disabled={!selected} onClick={addSelected}>Add selected block</GlassButton><GlassButton disabled={!scheme.anchors[slot]} onClick={()=>{const anchors={...scheme.anchors};delete anchors[slot];onChange({...scheme,anchors});}}>Remove control point</GlassButton><span>{t('Slot')} {slot+1}{cells[slot]?.block&&` · ${cells[slot].block.name}`}</span></div>
 </div>);
}

export function ColourSchemes({blocks,resources,selected,space,categories,collection,blacklist,onPick,rotate,onRotate,onReset}:{blocks:Block[];resources:ModelResources|null;selected:Block|undefined;space:Space;categories:string[];collection:string[];blacklist:string[];onPick:(id:string)=>void;rotate:boolean;onRotate:(v:boolean)=>void;onReset:()=>void}){
 const {view,t}=useLocale();
 const [schemes,setSchemes]=useState<Scheme[]>(()=>JSON.parse(localStorage.getItem('block-gamut-schemes')||'[]',(_key,value)=>value==='Infinity'?Infinity:value));
 const [settings,setSettings]=useState<string|null>(null),[expanded,setExpanded]=useState(true),[mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>localStorage.setItem('block-gamut-schemes',JSON.stringify(schemes,(_key,value)=>value===Infinity?'Infinity':value)),[schemes]);
 useEffect(()=>{const drop=(event:Event)=>{const {scheme,slot,block}=(event as CustomEvent).detail;setSchemes(list=>list.map(s=>s.id===scheme?{...s,anchors:{...s.anchors,[slot]:block}}:s));};document.addEventListener('block-gamut-scheme-drop',drop);return()=>document.removeEventListener('block-gamut-scheme-drop',drop);},[]);
 const change=(scheme:Scheme)=>setSchemes(list=>list.map(s=>s.id===scheme.id?scheme:s));
 const current=schemes.find(s=>s.id===settings);
 const add=()=>{setExpanded(true);if(window.matchMedia('(max-width:760px)').matches)setMobileOpen(true);setSchemes(list=>[...list,{id:crypto.randomUUID(),name:`${t('Scheme')} ${list.length+1}`,length:7,anchors:{},space,interpolation:'lerp',filters:{categories:[...categories],query:'',opaque:false,tinted:true,list:'all',varianceMin:0,varianceMax:Infinity},ranges:{}}]);};
 const maximum=current?Math.max(...blocks.map(b=>materialVariance(b,current.space)||0)):0;
 const filter=(patch:Partial<SchemeFilters>)=>current&&change({...current,filters:{...current.filters,...patch}});
 return view(<>
  <GlassPanel id="colour-schemes" className="colour-schemes" style={{zIndex:26}}>
   <div className="scheme-manager-heading"><GlassButton onClick={()=>window.matchMedia('(max-width:760px)').matches?setMobileOpen(true):setExpanded(v=>!v)} aria-expanded={expanded}>Colour schemes</GlassButton><GlassButton aria-label="New colour scheme" onClick={add}><Plus size={14}/><span>New scheme</span></GlassButton></div>
   <div className="scheme-mobile-orbit"><GlassButton aria-label="Reset camera" onClick={onReset}><RotateCcw size={13}/></GlassButton><GlassSwitch label="Orbit" checked={rotate} onChange={onRotate}/></div>
   {expanded&&schemes.length>0&&<GlassScrollArea className="scheme-desktop-rows" label="Colour schemes" maxHeight="var(--schemes-height)"><div className="scheme-rows">{schemes.map(s=><SchemeRow key={s.id} scheme={s} blocks={blocks} resources={resources} collection={collection} blacklist={blacklist} selected={selected} onChange={change} onDelete={()=>setSchemes(v=>v.filter(x=>x.id!==s.id))} onSettings={()=>setSettings(s.id)} onPick={onPick}/>)}</div><p className="scheme-hint">Drag the selected block into a slot. Pinned slots are control points.</p></GlassScrollArea>}
  </GlassPanel>
  <GlassDialog title="Colour schemes" open={mobileOpen} onOpenChange={setMobileOpen} closeLabel="Close colour schemes"><GlassScrollArea label="Colour schemes" maxHeight="55dvh"><div className="scheme-rows">{schemes.map(s=><SchemeRow key={s.id} scheme={s} blocks={blocks} resources={resources} collection={collection} blacklist={blacklist} selected={selected} onChange={change} onDelete={()=>setSchemes(v=>v.filter(x=>x.id!==s.id))} onSettings={()=>{setMobileOpen(false);setSettings(s.id);}} onPick={onPick}/>)}</div><GlassButton onClick={add}>New scheme</GlassButton></GlassScrollArea></GlassDialog>
  <GlassDialog title="Scheme filters" open={!!current} onOpenChange={open=>{if(!open){setSettings(null);if(window.matchMedia('(max-width:760px)').matches)setMobileOpen(true);}}} closeLabel="Close scheme filters" className="scheme-settings">
   {current&&<GlassScrollArea label="Scheme filters" maxHeight="55dvh"><div className="scheme-settings-content">
    <GlassInput label="Search blocks" type="search" value={current.filters.query} onChange={e=>filter({query:e.target.value})}/>
    <GeometryFilter value={current.filters.categories} onChange={categories=>filter({categories})}/>
    <GlassSelect label="Block list" value={current.filters.list} options={[{value:'all',label:'All blocks'},{value:'collection',label:'My collection'},{value:'blacklist',label:'My blacklist'}]} onChange={list=>filter({list})}/>
    <VarianceRange key={current.id+current.space} value={current.ranges[current.space]||[0,Infinity]} maximum={maximum} space={spaces.find(s=>s.value===current.space)!.label} onChange={range=>change({...current,ranges:{...current.ranges,[current.space]:range},filters:{...current.filters,varianceMin:range[0],varianceMax:range[1]}})}/>
    <div className="switch-row"><GlassSwitch label="Opaque" checked={current.filters.opaque} onChange={opaque=>filter({opaque})}/><GlassSwitch label="Biome tints" checked={current.filters.tinted} onChange={tinted=>filter({tinted})}/></div>
    <p className="micro muted">These filters choose interpolated materials. Control points keep their original blocks. Each scheme is independent of the explorer filters.</p>
   </div></GlassScrollArea>}
  </GlassDialog>
 </>);
}
