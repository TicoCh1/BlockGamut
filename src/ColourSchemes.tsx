import {schemeHighlight} from './schemePaths.mjs';
import {SchemeExport} from './SchemeExport';
import {BlockThumbnail} from './BlockThumbnail';
import {DraggableBlock} from './DraggableBlock';
import {useSchemeWheel,SchemeWheelPreview} from './SchemeWheel';
import {useEffect,useMemo,useState} from 'react';
import {GlassPanel,GlassButton,GlassInput,GlassSelect,GlassSwitch,GlassScrollArea,GlassDialog} from '@form-glass/react';
import {Plus,Settings2,X,RotateCcw,ClipboardCopy,Route} from 'lucide-react';
import {GeometryFilter} from './GeometryFilter';
import {VarianceRange} from './VarianceRange';
import {uniqueScheme,schemeCells,toggleSchemePin,refreshScheme,dropSchemeBlock,resizeScheme,schemeLength,schemeMime} from './schemes.mjs';
import {spaces} from './spaces.mjs';
import {materialVariance,filterBlocks} from './color.mjs';
import {useLocale} from './i18n';
import type {Block,Space,SchemeHighlight} from './types';
import type {ModelResources} from './useModels';

interface SchemeFilters {categories:string[];query:string;opaque:boolean;tinted:boolean;list:string;varianceMin:number;varianceMax:number}
export interface Scheme {id:string;name:string;length:number;anchors:Record<number,string>;tiles?:(string|null)[];space:Space;interpolation?:'lerp'|'slerp';highlight?:boolean;filters:SchemeFilters;ranges:Partial<Record<Space,[number,number]>>}
type SchemeUpdate=Partial<Scheme>|((scheme:Scheme)=>Scheme);


function SchemeRow({scheme,blocks,resources,collection,blacklist,onChange,onDelete,onSettings,onExport,onPick}:{scheme:Scheme;blocks:Block[];resources:ModelResources|null;collection:string[];blacklist:string[];onChange:(update:SchemeUpdate)=>void;onDelete:()=>void;onSettings:()=>void;onExport:()=>void;onPick:(id:string)=>void}){
 const {view,t}=useLocale(),[slot,setSlot]=useState(0),[hover,setHover]=useState<number|null>(null);
 useEffect(()=>setSlot(v=>Math.min(v,scheme.length-1)),[scheme.length]);
 const cells=useMemo(()=>schemeCells(scheme,blocks,{collection,blacklist}),[scheme,blocks,collection,blacklist]);
 const wheel=useSchemeWheel({scheme,cells,blocks,collection,blacklist,onChoose:(index,id)=>{setSlot(index);onChange(current=>{const tiles=schemeCells(current,blocks,{collection,blacklist}).map(c=>c.id||c.block?.id||null);tiles[index]=id;return {...current,tiles};});onPick(id);}});
 const toggle=(index:number)=>{setSlot(index);onChange(current=>toggleSchemePin(current,index,blocks,{collection,blacklist}));if(cells[index].block)onPick(cells[index].block.id);};
 return view(<div className="scheme-row" ref={wheel.root}>
  <SchemeWheelPreview preview={wheel.preview} resources={resources}/>
  <div className="scheme-row-heading">
   <GlassInput className="scheme-name" label="Scheme name" value={scheme.name} onChange={e=>onChange({name:e.target.value})}/>
   <GlassInput className="scheme-length" key={scheme.id+':'+scheme.length} label="Length" type="number" min={3} step={1} defaultValue={scheme.length} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{const length=schemeLength(e.target.value);e.target.value=String(length);if(length!==scheme.length)onChange(current=>resizeScheme(current,length));}}/>
   <div className="scheme-space"><GlassSelect label="Scheme colour space" value={scheme.space} options={spaces.map(({value,label})=>({value,label}))} onChange={value=>{onChange(current=>{const range=current.ranges[value as Space]||[0,Infinity];return {...current,space:value as Space,filters:{...current.filters,varianceMin:range[0],varianceMax:range[1]}};});}}/></div>
   <div className="scheme-method"><GlassSelect label="Interpolation" value={scheme.interpolation||'lerp'} options={[{value:'lerp',label:'Lerp'},{value:'slerp',label:'Slerp'}]} onChange={value=>onChange({interpolation:value as 'lerp'|'slerp'})}/></div>
   <div className="scheme-row-buttons"><GlassButton aria-label="Highlight scheme path" title={t('Highlight scheme path')} aria-pressed={!!scheme.highlight} onClick={()=>onChange({highlight:!scheme.highlight})}><Route size={13}/></GlassButton><GlassButton aria-label="Export scheme" title={t('Export scheme')} onClick={onExport}><ClipboardCopy size={13}/></GlassButton><GlassButton aria-label="Refresh scheme" title={t('Refresh unpinned blocks')} onClick={()=>onChange(current=>refreshScheme(current,blocks,{collection,blacklist}))}><RotateCcw size={13}/></GlassButton><GlassButton aria-label="Scheme filters" onClick={onSettings}><Settings2 size={13}/></GlassButton><GlassButton aria-label="Delete scheme" onClick={onDelete}><X size={13}/></GlassButton></div>
  </div>
  <GlassScrollArea label="Scheme blocks" height={78} viewportClassName="scheme-cells-viewport"><div className="scheme-cells">
   {cells.map(cell=><div key={cell.index} className="scheme-cell" data-scheme-id={scheme.id} data-scheme-slot={cell.index} data-anchor={cell.anchor} data-selected={slot===cell.index} data-drop={hover===cell.index} onDragOver={e=>{if(e.dataTransfer.types.includes(schemeMime)||e.dataTransfer.types.includes('text/plain')){e.preventDefault();e.dataTransfer.dropEffect='copy';setHover(cell.index);}}} onDragLeave={()=>setHover(null)} onDrop={e=>{e.preventDefault();setHover(null);const id=e.dataTransfer.getData(schemeMime)||e.dataTransfer.getData('text/plain');if(blocks.some(b=>b.id===id))document.dispatchEvent(new CustomEvent('block-gamut-scheme-drop',{detail:{scheme:scheme.id,slot:cell.index,block:id}}));}}>
    <DraggableBlock id={cell.id||cell.block?.id||''} name={cell.block?.name||cell.id||t('Empty slot')} source={{scheme:scheme.id,slot:cell.index}} className="scheme-block" onClick={()=>toggle(cell.index)}><GlassButton aria-label={`${t('Scheme slot')} ${cell.index+1}: ${cell.id||cell.block?.id||'minecraft:air'}`} aria-pressed={cell.anchor} title={cell.block?`${cell.block.name} · ${cell.block.id}\n${t('Click to pin or unpin')}`:cell.id?`${cell.id} · ${t('Unavailable in this release')}`:t('Drop a block here')} onClick={e=>{if(e.detail===0)toggle(cell.index);}}>{cell.block?<BlockThumbnail id={cell.block.id} resources={resources}/>:<span aria-hidden="true">+</span>}{cell.anchor&&<span className="scheme-pin" aria-hidden="true"/>}</GlassButton></DraggableBlock>
    <span className="scheme-target" style={{background:cell.target||'transparent'}} title={cell.target||t('No control points')}/>
   </div>)}
  </div></GlassScrollArea>
  <div className="scheme-row-actions"><span>{t('Slot')} {slot+1}{cells[slot]?.block&&` · ${cells[slot].block.name}`}</span></div>
 </div>);
}

export function ColourSchemes({blocks,resources,selected,space,categories,collection,blacklist,onPick,onHighlights}:{blocks:Block[];resources:ModelResources|null;selected:Block|undefined;space:Space;categories:string[];collection:string[];blacklist:string[];onPick:(id:string)=>void;onHighlights:(paths:SchemeHighlight[])=>void}){
 const {view,t}=useLocale();
 const [schemes,setSchemes]=useState<Scheme[]>(()=>JSON.parse(localStorage.getItem('block-gamut-schemes')||'[]',(_key,value)=>value==='Infinity'?Infinity:value).map((s:Scheme)=>{
  const normalized=uniqueScheme(s);
  const ids=s.tiles?.filter(Boolean)||[];
  if(new Set(ids).size<ids.length)return refreshScheme(normalized,blocks,{collection,blacklist});
  return normalized.tiles?normalized:{...normalized,tiles:schemeCells(normalized,blocks,{collection,blacklist}).map(c=>c.id||c.block?.id||null)};
 }));
 const highlights=useMemo(()=>schemes.filter(s=>s.highlight).map(s=>schemeHighlight(s,blocks,{collection,blacklist})),[schemes,blocks,collection,blacklist]);
 useEffect(()=>onHighlights(highlights),[highlights,onHighlights]);
 const [exportId,setExportId]=useState<string|null>(null);
 const [settings,setSettings]=useState<string|null>(null),[expanded,setExpanded]=useState(true),[mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>localStorage.setItem('block-gamut-schemes',JSON.stringify(schemes,(_key,value)=>value===Infinity?'Infinity':value)),[schemes]);
 useEffect(()=>{const drop=(event:Event)=>setSchemes(list=>dropSchemeBlock(list,(event as CustomEvent).detail,blocks,{collection,blacklist}));document.addEventListener('block-gamut-scheme-drop',drop);return()=>document.removeEventListener('block-gamut-scheme-drop',drop);},[blocks,collection,blacklist]);
 const change=(id:string,update:SchemeUpdate)=>setSchemes(list=>list.map(s=>s.id===id?(typeof update==='function'?update(s):{...s,...update}):s));
 const current=schemes.find(s=>s.id===settings);
 const add=()=>{setExpanded(true);if(window.matchMedia('(max-width:760px)').matches)setMobileOpen(true);setSchemes(list=>[...list,{id:crypto.randomUUID(),name:`${t('Scheme')} ${list.length+1}`,length:7,anchors:{},tiles:Array(7).fill(null),space,interpolation:'lerp',filters:{categories:[...categories],query:'',opaque:false,tinted:true,list:'all',varianceMin:0,varianceMax:Infinity},ranges:{}}]);};
 const maximum=current?Math.max(...blocks.map(b=>materialVariance(b,current.space)||0)):0;
 const distribution=useMemo(()=>current?filterBlocks(blocks,{...current.filters,varianceMin:0,varianceMax:Infinity,space:current.space,custom:current.filters.list==='collection'?collection:current.filters.list==='blacklist'?blacklist:null,blacklist:current.filters.list==='blacklist'?[]:blacklist}).flatMap((b:Block)=>{const v=materialVariance(b,current.space);return v===null?[]:[v];}):[],[current,blocks,collection,blacklist]);
 const filter=(patch:Partial<SchemeFilters>)=>current&&change(current.id,s=>({...s,filters:{...s.filters,...patch}}));
 return view(<>
  <GlassPanel id="colour-schemes" className="colour-schemes" style={{zIndex:26}}>
   <div className="scheme-manager-heading"><GlassButton onClick={()=>window.matchMedia('(max-width:760px)').matches?setMobileOpen(true):setExpanded(v=>!v)} aria-expanded={expanded}>Colour schemes</GlassButton><GlassButton aria-label="New colour scheme" onClick={add}><Plus size={14}/><span>New scheme</span></GlassButton></div>
   {expanded&&schemes.length>0&&<GlassScrollArea className="scheme-desktop-rows" label="Colour schemes" maxHeight="var(--schemes-height)"><div className="scheme-rows">{schemes.map(s=><SchemeRow key={s.id} scheme={s} blocks={blocks} resources={resources} collection={collection} blacklist={blacklist} onChange={update=>change(s.id,update)} onDelete={()=>setSchemes(v=>v.filter(x=>x.id!==s.id))} onSettings={()=>setSettings(s.id)} onExport={()=>setExportId(s.id)} onPick={onPick}/>)}</div><p className="scheme-hint">Click to pin or unpin. Drag to reorder; drag out to remove. Refresh fills unpinned slots.</p><p className="scheme-hint">Hover an unpinned interior block and scroll to browse alternatives.</p></GlassScrollArea>}
  </GlassPanel>
  <GlassDialog title="Colour schemes" className="scheme-manager-dialog" open={mobileOpen} onOpenChange={setMobileOpen} closeLabel="Close colour schemes">{selected&&<DraggableBlock id={selected.id} name={selected.name} className="scheme-import"><BlockThumbnail id={selected.id} resources={resources}/><span>{selected.name}<small>Drag selected block into a slot</small></span></DraggableBlock>}<GlassScrollArea label="Colour schemes" maxHeight="55dvh"><div className="scheme-rows">{schemes.map(s=><SchemeRow key={s.id} scheme={s} blocks={blocks} resources={resources} collection={collection} blacklist={blacklist} onChange={update=>change(s.id,update)} onDelete={()=>setSchemes(v=>v.filter(x=>x.id!==s.id))} onSettings={()=>{setMobileOpen(false);setSettings(s.id);}} onExport={()=>{setMobileOpen(false);setExportId(s.id);}} onPick={onPick}/>)}</div><GlassButton onClick={add}>New scheme</GlassButton></GlassScrollArea></GlassDialog>
  <SchemeExport scheme={schemes.find(s=>s.id===exportId)} blocks={blocks} collection={collection} blacklist={blacklist} onClose={()=>{setExportId(null);if(window.matchMedia('(max-width:760px)').matches)setMobileOpen(true);}}/>
  <GlassDialog title="Scheme filters" open={!!current} onOpenChange={open=>{if(!open){setSettings(null);if(window.matchMedia('(max-width:760px)').matches)setMobileOpen(true);}}} closeLabel="Close scheme filters" className="scheme-settings">
   {current&&<GlassScrollArea label="Scheme filters" maxHeight="55dvh"><div className="scheme-settings-content">
    <GlassInput label="Search blocks" type="search" value={current.filters.query} onChange={e=>filter({query:e.target.value})}/>
    <GeometryFilter value={current.filters.categories} onChange={categories=>filter({categories})}/>
    <GlassSelect label="Block list" value={current.filters.list} options={[{value:'all',label:'All blocks'},{value:'collection',label:'My collection'},{value:'blacklist',label:'My blacklist'}]} onChange={list=>filter({list})}/>
    <VarianceRange key={current.id+current.space} value={current.ranges[current.space]||[0,Infinity]} maximum={maximum} values={distribution} space={spaces.find(s=>s.value===current.space)!.label} onChange={range=>change(current.id,s=>({...s,ranges:{...s.ranges,[s.space]:range},filters:{...s.filters,varianceMin:range[0],varianceMax:range[1]}}))}/>
    <div className="switch-row"><GlassSwitch label="Opaque" checked={current.filters.opaque} onChange={opaque=>filter({opaque})}/><GlassSwitch label="Biome tints" checked={current.filters.tinted} onChange={tinted=>filter({tinted})}/></div>
    <p className="micro muted">These filters choose interpolated materials. Control points keep their original blocks. Each scheme is independent of the explorer filters.</p>
   </div></GlassScrollArea>}
  </GlassDialog>
 </>);
}
