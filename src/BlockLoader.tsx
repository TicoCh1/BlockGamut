import type {CSSProperties} from 'react';
import {GlassButton} from '@form-glass/react';
import {useLocale} from './i18n';
const materials=['moss_block','oak_planks','stone_bricks','cobblestone','diamond_block','gold_block','red_wool','light_blue_wool','white_wool'];
/** Lightweight CSS blocks: startup never depends on the large WebGL atlas. */
export function BlockLoader({stage,error}:{stage:string;error:string}){
 const {view}=useLocale();
 return view(<div className={`block-loader${error?' has-error':''}`} role={error?'alert':'status'} aria-live="polite" aria-busy={!error}>
  <div className="loading-content">
   <div className="loading-build" aria-hidden="true"><div className="loading-shadow"/><div className="loading-chunk">{materials.map((material,i)=><div className="loading-cell" key={material} style={{'--cell-x':`${(i%3-Math.floor(i/3))*34}px`,'--cell-y':`${(i%3+Math.floor(i/3)-2)*17}px`,zIndex:i%3+Math.floor(i/3),'--delay':`${i*.12}s`,'--block-texture':`url('${new URL(`./textures/${material}.png`,document.baseURI).href}')`} as CSSProperties}><div className="loading-cube">{['left','right','top'].map(face=><i key={face} className={`loading-face ${face}`}/>)}</div></div>)}</div></div>
   <span className="loading-eyebrow">MINECRAFT · COLOUR EXPLORER</span>
   <h1>{error?'Could not prepare the block world':stage}</h1>
   {error?<><p>{error}</p><GlassButton fade={['top','right','bottom','left']} onClick={()=>window.location.reload()}>Retry loading</GlassButton></>:<div className="loading-pixels" aria-hidden="true">{materials.map((material,i)=><i key={material} style={{backgroundImage:`url('./textures/${material}.png')`,animationDelay:`${i*.12}s`}}/>)}</div>}
  </div>
 </div>);
}
