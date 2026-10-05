import {VarianceRange} from './VarianceRange';
import {BlockLoader} from './BlockLoader';
import {cleanModelGeometry,geometryBounds} from './renderGeometry.mjs';
import {modelClass,modelClasses} from './modelClass.mjs';
import {LocaleLabel,useLocale,type Locale} from './i18n';
import {RevealPanel} from './RevealPanel';
import {GlassDisclosure} from './GlassDisclosure';
import chineseNames from './blockNames.zh-CN.json';
import {useCallback,useDeferredValue,useEffect,useMemo,useRef,useState} from 'react';
import {Glass,GlassButton,GlassField,GlassProvider,GlassSelect,GlassSwitch,GlassScrollArea} from '@form-glass/react';
import {Box,Check,ChevronRight,Info,Layers3,RotateCcw,Focus,Search,X,Ban} from 'lucide-react';
import {filterBlocks,groupMaterials,samplesFor,materialVariance} from './color.mjs';
import {Scene} from './Scene';
import {Turntable} from './Turntable';
import {useModels} from './useModels';
import {spaces,coordinates,coordinateLabels} from './spaces.mjs';
import {VoxelSectionWindow} from './VoxelSectionWindow';
import {arrangements,visibleVoxels} from './voxels.mjs';
import type {Catalog,Block,Sample,Space,Arrangement,VoxelData,VoxelSection} from './types';

const allEdges=['top','right','bottom','left'] as const;
const categories=[{value:'all',label:'All blocks'},...modelClasses,{value:'collection',label:'My collection'},{value:'blacklist',label:'My blacklist'}];
const faces=['average','up','north','south','east','west','down'].map(value=>({value,label:({average:'Model average',up:'Top face',down:'Bottom face',north:'North face',south:'South face',east:'East face',west:'West face'} as Record<string,string>)[value]}));

function Texture({block,resources}:{block:Block;resources:import('./useModels').ModelResources|null}){const {t}=useLocale(),canvas=useRef<HTMLCanvasElement>(null);useEffect(()=>{if(block.previewTile==null||!resources||!canvas.current)return;const tile=resources.preview(block.previewTile);const context=canvas.current.getContext('2d')!;context.clearRect(0,0,32,32);context.imageSmoothingEnabled=false;context.drawImage(tile.image,tile.x,tile.y,tile.size,tile.size,0,0,32,32);},[block.previewTile,resources]);return <span className="texture" style={{backgroundColor:block.hex||'#36383d'}}>{block.previewTile!=null?<canvas width={32} height={32} ref={canvas} role="img" aria-label={t(`${block.name} texture preview`)}/>:<Box size={18}/>}</span>;}

export function App(){
 const {locale,setLocale,view,blockName}=useLocale();
 const {resources,catalog,index:releases,version,setVersion,group:releaseGroup,loading:versionLoading,error:versionError}=useModels();
 const assetError=!!versionError;
 const [sceneReady,setSceneReady]=useState(false),[sceneError,setSceneError]=useState('');
 const [arrangement,setArrangement]=useState<Arrangement>('packed'),[voxelData,setVoxelData]=useState<VoxelData|null>(null);
 const [voxelSection,setVoxelSection]=useState<VoxelSection>({enabled:false,axis:'y',position:50,style:'cutaway',flip:false});
 const updateSection=useCallback((patch:Partial<VoxelSection>)=>setVoxelSection(s=>Object.entries(patch).every(([key,value])=>s[key as keyof VoxelSection]===value)?s:{...s,...patch}),[]);
 const closeSection=useCallback(()=>updateSection({enabled:false,preview:false}),[updateSection]);
 const [modelStats,setModelStats]=useState<{rendered:number;unsupported:number}|null>(null);

 const [grouped,setGrouped]=useState(true),[focus,setFocus]=useState(0),[assetDetails,setAssetDetails]=useState(false);
 const [category,setCategory]=useState('all'),[query,setQuery]=useState(''),[face,setFace]=useState('average'),[opaque,setOpaque]=useState(false),[tinted,setTinted]=useState(true);
 const [space,setSpace]=useState<Space>('oklab'),[variance,setVariance]=useState(false),[rotate,setRotate]=useState(false),[reset,setReset]=useState(0);
 const [selected,setSelected]=useState('minecraft:orange_terracotta'),[collection,setCollection]=useState<string[]>([]),[blacklist,setBlacklist]=useState<string[]>([]);
 const [varianceRange,setVarianceRange]=useState<[number,number]>([0,Infinity]);
 const [helpPresent,setHelpPresent]=useState(false);
 const [help,setHelp]=useState(false);
 const modalActive=help||helpPresent;

 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented){if(modalActive)setHelp(false);}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[modalActive]);
 useEffect(()=>{
  if(!modalActive)return;const previous=document.activeElement as HTMLElement|null;
  const shell=document.querySelector<HTMLElement>('.explorer')!;shell.inert=true;
  const dialog=document.querySelector<HTMLElement>('.notes-dialog')!;
  const focusables=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex="0"]')).filter(el=>!el.hasAttribute('disabled'));
  // Focus transfers after the reveal; keep the background inert through closing.
  const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const list=focusables(),first=list[0],last=list[list.length-1];if(!dialog.contains(document.activeElement)){e.preventDefault();first?.focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
  document.addEventListener('keydown',trap);return()=>{shell.inert=false;document.removeEventListener('keydown',trap);previous?.focus();};
 },[modalActive]);
 const geometryBlocks=useMemo(()=>(catalog?.blocks||[]).map(b=>({...b,renderBounds:resources?.pack.models[b.id]?.renderable?geometryBounds(cleanModelGeometry(resources.pack.models[b.id],resources.pack.atlas)):undefined,geometryClass:modelClass(resources?.pack.models[b.id],resources?.pack.atlas)})),[catalog,resources]);
 const localizedBlocks=useMemo(()=>geometryBlocks.map(b=>({...b,name:locale==='zh-CN'?b.chineseName||blockName(b.id,b.name):b.name,englishName:b.name,searchNames:b.name+' '+(b.chineseName||(chineseNames as Record<string,string>)[b.id]||'')})),[geometryBlocks,locale]);
 const deferredQuery=useDeferredValue(query);
 const maximumVariance=useMemo(()=>Math.max(...localizedBlocks.map(b=>materialVariance(b)||0)),[localizedBlocks]);
 const filtered=useMemo(()=>filterBlocks(localizedBlocks,{category:category==='collection'||category==='blacklist'?'all':category,query:deferredQuery,opaque,tinted,custom:category==='collection'?collection:category==='blacklist'?blacklist:null,blacklist:category==='blacklist'?[]:blacklist,varianceMin:varianceRange[0],varianceMax:varianceRange[1]}) as Block[],[localizedBlocks,category,deferredQuery,opaque,tinted,collection,blacklist,varianceRange]);
 const displayed=useMemo(()=>{const result=(grouped?groupMaterials(filtered):filtered) as Block[];
  if(!deferredQuery.trim())return result;const ranks=new Map(filtered.map((b,i)=>[b.id,i]));
  const rank=(b:Block)=>Math.min(...(b.variants||[b]).map(v=>ranks.get(v.id)??Infinity));
  return [...result].sort((a,b)=>rank(a)-rank(b));
 },[filtered,grouped,deferredQuery]);

 const samples=useMemo(()=>samplesFor(displayed,face) as Sample[],[displayed,face]);
 useEffect(()=>{if(variance||!space.startsWith('h'))setVoxelSection(s=>s.axis==='hue'||s.axis==='radius'?{...s,axis:'y'}:s);},[space,variance]);
 const active=samples.find(s=>s.block.id===selected||s.block.variants?.some(v=>v.id===selected))?.block;
 const grid=voxelData?.mode===arrangement&&voxelData.space===space&&!!voxelData.variance===variance?voxelData:null;
 const visibleCells=useMemo(()=>grid?visibleVoxels(grid,voxelSection):[],[grid,voxelSection.enabled,voxelSection.axis,voxelSection.style,voxelSection.position,voxelSection.flip]);
 const copies=useMemo(()=>{if(!grid||!active)return null;let total=0,visible=0;for(const i of grid.indices)if(samples[i]?.block.id===active.id)total++;for(const i of visibleCells)if(samples[grid.indices[i]]?.block.id===active.id)visible++;return {total,visible};},[grid,samples,active?.id,visibleCells]);
 const activeSample=samples.find(s=>s.block.id===active?.id);
 const pick=useCallback((id:string)=>{setSelected(id);},[]);
 const resetFilters=()=>{setCategory('all');setQuery('');setOpaque(false);setTinted(true);setFace('average');setVarianceRange([0,Infinity]);};
 const toggleBlacklist=(block:Block)=>{const ids=(block.variants||[block]).map(b=>b.id);setBlacklist(v=>v.includes(block.id)?v.filter(id=>!ids.includes(id)):[...new Set([...v,...ids])]);};
 const reportReady=useCallback(()=>setSceneReady(true),[]),stopOrbit=useCallback(()=>setRotate(false),[]);
 const booting=!catalog||!resources||!sceneReady;
 const bootError=versionError||sceneError;
 const bootStage=!catalog||!resources?'Loading Minecraft release materials…':'Placing blocks in colour space…';
 return view(<GlassProvider theme="dark" values={{contrast:.6}} refractionEnabled={false} fadeContents={false}>
  <main className="explorer" aria-hidden={booting||modalActive} {...(booting||modalActive?{inert:''} as any:{})}>
   <div className="world-view"><Scene catalogReady={!!catalog} onReady={reportReady} onStartupError={setSceneError} arrangement={arrangement} voxelSection={voxelSection} onVoxelData={setVoxelData} samples={samples} space={space} variance={variance} hull={false} reference={false} rotate={rotate} slice={false} lightness={.65} resources={resources} assetError={assetError} selected={active?.id||''} reset={reset} focus={focus} onSelect={pick} onRotateStop={stopOrbit} onModelStats={setModelStats}/></div>
   <header className="scene-header"><div className="brand"><Box size={24} strokeWidth={1.2}/><div><h1>Shape of blocks</h1><span>BLOCKGAMUT / COLOUR EXPLORER</span></div></div><div className="header-actions"><div className="language-control"><GlassSelect label="Language" value={locale} onChange={v=>setLocale(v as Locale)} options={[{value:"en",label:"English"},{value:"zh-CN",label:"简体中文"}]}/></div><GlassButton id="notes-trigger" fade={allEdges} aria-expanded={help} aria-controls="notes-dialog" aria-label="About the data and method" onClick={()=>setHelp(true)}><Info size={17}/></GlassButton></div></header>
   <p className="project-notice"><span>Minecraft textures © Mojang / Microsoft.</span><span>Publisher: <a href="https://github.com/TicoCh1" target="_blank" rel="noreferrer">TicoCh1</a> · <a href="https://github.com/TicoCh1/BlockGamut" target="_blank" rel="noreferrer">Source &amp; licenses</a></span></p>
   {catalog&&<>
    <RevealPanel id="explorer-controls" open style={{transformOrigin:"top left"}} className="control-panel"><div className="panel-content">
     <div className="section-label"><span>COLOUR SPACE</span><span>01</span></div><GlassSelect label="Coordinate space" value={space} onChange={value=>setSpace(value as Space)} options={spaces.map(({value,label})=>({value,label}))}/><GlassSwitch label="Material variance" checked={variance} onChange={setVariance}/>
     <div className="section-label divider"><span>VOXELS</span><span>1 × 1 × 1</span></div>
     <GlassSelect label="Arrangement" value={arrangement} onChange={v=>setArrangement(v as Arrangement)} options={arrangements}/>
     <p className="micro muted arrangement-summary">{arrangement==='spaced'?'One-block gap':arrangement==='packed'?'Touching native models':'Nearest fill · each material ≥ 1 cell'}</p>
     {arrangement!=='spaced'&&<><p className="voxel-count" role="status">{grid?`${visibleCells.length.toLocaleString()} / ${grid.cells.length.toLocaleString()} cells visible`:'Preparing voxel grid…'}</p>
      <GlassButton id="voxel-section-trigger" fade={allEdges} className="disclosure" aria-expanded={voxelSection.enabled} aria-controls="voxel-section-window" onClick={()=>updateSection({enabled:!voxelSection.enabled,preview:false})}><span>Voxel section</span><ChevronRight size={14}/></GlassButton></>}
     <div className="section-label divider"><span>FILTERS</span><span>{filtered.length}</span></div>
     {releases&&<GlassSelect label="Minecraft version" value={version} onChange={setVersion} options={releases.groups.map(g=>({value:g.id,label:g.label}))}/>}
     {releaseGroup&&<p className="version-filter-note">Minecraft {releaseGroup.id}{releaseGroup.last!==releaseGroup.id?` – ${releaseGroup.last}`:''} · {releaseGroup.releases.length}{locale==='zh-CN'?' 个正式版本':` release${releaseGroup.releases.length===1?'':'s'}`}</p>}
     {versionLoading&&<p className="micro muted" role="status">Loading release materials…</p>}
     {versionError&&!booting&&<p className="micro" role="alert">{versionError}</p>}
     <GlassField className="search-field"><Search size={14}/><input aria-label="Search blocks" placeholder="Name, ID or 5:1…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<GlassButton fade={allEdges} aria-label="Clear search" onClick={()=>setQuery('')}><X size={13}/></GlassButton>}</GlassField>
     <VarianceRange value={varianceRange} maximum={maximumVariance} onChange={setVarianceRange}/>
     <div className="palette-counts"><p>{filtered.length.toLocaleString()} blocks · {displayed.length.toLocaleString()} {grouped?'materials':'entries'}</p><p>{modelStats?modelStats.rendered.toLocaleString():'…'} models · {new Set(samples.map(s=>s.hex)).size.toLocaleString()} colours</p><p className="muted">No surface: {displayed.length-samples.length}{face!=='average'?` · ${samples.filter(s=>s.fallback).length} face fallbacks.`:''}</p></div>
     <GlassSwitch label="Group materials" checked={grouped} onChange={setGrouped}/><GlassSelect label="Block geometry" value={category} onChange={setCategory} options={categories}/><GlassSelect label="Colour source" value={face} onChange={setFace} options={faces}/>


     <div className="switch-row"><GlassSwitch label="Opaque" checked={opaque} onChange={setOpaque}/><GlassSwitch label="Biome tints" checked={tinted} onChange={setTinted}/></div>

    </div></RevealPanel>
    <VoxelSectionWindow open={voxelSection.enabled&&arrangement!=='spaced'} section={voxelSection} onChange={updateSection} onClose={closeSection} data={grid} samples={samples} resources={resources} space={space} variance={variance} selected={active?.id||''} onSelect={pick}/>
    {!samples.length&&<div className="empty-scene">No blocks in this colour set.<br/><GlassButton fade={allEdges} onClick={resetFilters}>Reset filters</GlassButton></div>}
    {active&&<RevealPanel id="block-inspector" open style={{transformOrigin:"bottom right"}} className="block-inspector"><div className="inspector-content"><div className="inspector-heading"><Texture block={active} resources={resources}/><div><span className="eyebrow">SELECTED BLOCK</span><h2>{active.name}</h2></div></div><Turntable id={active.id} name={active.name} resources={resources}/><div className="block-id">{active.id}</div>{copies&&<p className="copy-count">{copies.total.toLocaleString()} instances selected · {copies.visible.toLocaleString()} visible</p>}<div className="asset-path">{active.assetFamily}</div><p className="micro muted">{active.variants?.length||1} block variant{(active.variants?.length||1)>1&&locale==='en'?'s':''} · {active.renderStatus==='native'?'Block model':active.renderStatus==='invisible'?'No visible surface':'Static renderer preview'}</p><GlassButton fade={allEdges} className="disclosure" aria-expanded={assetDetails} aria-controls="asset-disclosure" onClick={()=>setAssetDetails(v=>!v)}><span>Asset files & variants</span><ChevronRight size={13}/></GlassButton><GlassDisclosure id="asset-disclosure" open={assetDetails}><div className="asset-details"><p>{active.blockstate}</p>{active.modelSources.map(path=><p key={path}>{path}</p>)}<p>{active.colorSource}</p><p>{active.renderNote}</p>{active.variants?.map(b=><p key={b.id}>{b.name}</p>)}</div></GlassDisclosure><div className="sample-values"><i style={{background:activeSample?.hex||'#555'}}/><span>{activeSample?.hex||'No colour sample'}</span><span className="muted">{activeSample?.fallback?'average fallback':face}</span></div>{activeSample&&<div className="lab-values" data-variance={variance}>{coordinateLabels(space,variance).map((v,i)=><span key={v}>{v} <b>{(coordinates(activeSample.rgb,space,active.surface,variance)[i]*(v==='H°'?360:1)).toFixed(variance?5:3)}</b></span>)}</div>}
    {active.surface&&<div className="surface-mixture"><div className="mixture-label"><span>SURFACE COLOURS</span><span>area × alpha</span></div><div className="mixture-strip" aria-label="Surface colour proportions">{active.surface.mixture.map((c,i)=><span key={i} style={{background:c.hex,flex:c.weight}} title={`${c.hex} · ${(c.weight*100).toFixed(1)}%`}/>)}</div><div className="mixture-values">{active.surface.mixture.map((c,i)=><span key={i}><i style={{background:c.hex}}/>{Math.round(c.weight*100)}%</span>)}</div></div>}
    <GlassButton fade={allEdges} className="focus-button" onClick={()=>setFocus(v=>v+1)}><Focus size={13}/> Inspect in 3D</GlassButton><GlassButton fade={allEdges} className="collect-button" onClick={()=>setCollection(v=>v.includes(active.id)?v.filter(id=>id!==active.id):[...v,active.id])}>{collection.includes(active.id)?<Check size={13}/>:<Layers3 size={13}/>} <LocaleLabel text={collection.includes(active.id)?'Remove from collection':'Collect block'} alternatives={['Collect block','Remove from collection']}/></GlassButton><GlassButton fade={allEdges} className="blacklist-button" onClick={()=>toggleBlacklist(active)}><Ban size={13}/><LocaleLabel text={blacklist.includes(active.id)?'Remove from blacklist':'Blacklist block'} alternatives={['Blacklist block','Remove from blacklist']}/></GlassButton></div></RevealPanel>}
    {!active&&<RevealPanel id="air-inspector" open className="block-inspector air-inspector" style={{transformOrigin:'bottom right'}}><div className="inspector-content"><div className="inspector-heading"><Box size={24}/><div><span className="eyebrow">SELECTED BLOCK</span><h2>Air</h2></div></div><div className="air-symbol" aria-hidden="true">∅</div><div className="block-id">minecraft:air</div><p className="micro muted">No block selected</p></div></RevealPanel>}

   </>}
   <div className="view-caption"><span>{arrangement==='spaced'?'VANILLA BLOCK MODELS':'MATERIAL VOXELS'}</span><p>Texture by texture. Colour by colour.</p></div>
   <Glass fade={allEdges} className="view-dock"><GlassButton fade={allEdges} onClick={()=>setReset(v=>v+1)} aria-label="Reset camera"><RotateCcw size={15}/></GlassButton><GlassSwitch label="Orbit" checked={rotate} onChange={setRotate}/><span>Drag to orbit · scroll to zoom · click a block</span></Glass>

  </main>
  {booting&&<BlockLoader stage={bootStage} error={bootError}/>}
  <div className="modal-backdrop" data-open={help} aria-hidden={!modalActive} style={{visibility:modalActive?"visible":"hidden",pointerEvents:modalActive?"auto":"none"}} onClick={()=>setHelp(false)}><RevealPanel id="notes-dialog" originId="notes-trigger" open={help} onPrepare={opening=>{if(opening)setHelpPresent(true);}} onEnd={opening=>{setHelpPresent(opening);if(opening)document.querySelector<HTMLButtonElement>("#notes-dialog button")?.focus({preventScroll:true});}} style={{transformOrigin:"center"}} className="notes-dialog" role="dialog" aria-modal="true" aria-labelledby="notes-title" onClick={e=>e.stopPropagation()}><div className="library-heading"><h2 id="notes-title">About this colour space</h2><GlassButton fade={allEdges} aria-label="Close field notes" onClick={()=>setHelp(false)}><X size={18}/></GlassButton></div><GlassScrollArea viewportClassName="notes-viewport"><h3>All placed block types</h3><p>The catalog follows the selected Minecraft release's block assets, excluding item frames (entities) and the three empty air types. It includes non-cubes, crossed plant planes, complete tall plants, multipart models and static previews for special block renderers.</p><p>{catalog?.total} block types; {catalog?.rendered} visible previews. Barrier, light and structure void have no visible surface. Moving piston is a transient carrier with no fixed material. They remain in the catalog without invented colours.</p><h3>Asset families & materials</h3><p>Asset families use actual model-parent paths or the renderer texture directory. Group materials merges identical resolved texture sets and tints, preferring a full cube when available. Cake and its candle decorations share the plain cake representative. Dyed wool, terracotta and other differently coloured base materials remain separate. Turn grouping off to see every variant. Similar colours alone never cause a merge.</p><h3>Colour & appearance</h3><p>Colours and variances use the selected release’s original textures, weighted by face area and transparency. Eight colour spaces include Oklab, sRGB, linear RGB, HSV, HSL cylinder/bicone, XYZ D65 and CIELAB D65. Material variance is an independent mode for every space. Original numerical colour values are preserved. Native dimensions are preserved: beds and banners extend across multiple blocks. The spaced lattice leaves at least one full block of clearance, with empty layers for routed movement. Dense areas expand away from their exact colour coordinates.</p><p>Material variance uses original unlit face texels weighted by face area and alpha, independently of the face-colour selector. Each axis shows the population variance of the current space's channel. HSV/HSL use linear hue-variance axes instead of rings: hue variance is the minimum mean squared shortest-arc distance, measured in turns squared; achromatic texels do not contribute to hue. HSL bicone uses chroma variance. Fixed logarithmic axis scales preserve comparisons across filters and releases; zero has a finite floor and numerical variances are shown unscaled in the inspector. The five colour clusters are only a summary, not the input to these statistics.</p><p>Packed mode reserves the native model footprint. Dense mode tiles full-size models on the integer lattice, then clips geometry and UVs at material-cell and section boundaries. Dense fill uses the same model size as spaced mode, reserves one cell per displayed material, then assigns remaining in-gamut cells to their nearest material. Reserved material cells may extend beyond the theoretical gamut after collision resolution. Grouping operates on representatives; disable it to reserve every visible filtered block type. Repeated instances share selection. Sections retain whole cells; hue and radius sections are available in cylindrical spaces.</p><p>Colour-space, filter and arrangement changes share one simultaneous Manhattan animation lasting at most one second. Longer routes travel faster. Removed blocks leave through the display envelope; new materials enter from it. Dense transitions move one representative per material to its nearest destination, then fade the static fill and replacement; repeated cells do not animate individually. Rapid changes keep only the latest queued target; reduced-motion preferences disable movement and start the turntable paused.</p><p>One representative placed state is shown. Special renderers use closed/rest poses, default player skins and plain banners/pots. Texture animations follow vanilla frame sequences, durations and interpolation. Translucent blocks retain their texture alpha; end portals use animated layered stars. World lighting, particles, moving block entities and custom data are not reproduced.</p><p>Layout references ShapeOfColour. <a href="https://bottosson.github.io/posts/oklab/" target="_blank" rel="noreferrer">Oklab definition ↗</a></p></GlassScrollArea></RevealPanel></div>
 </GlassProvider>);
}
