import {useEffect,useMemo,useState} from 'react';
import {GlassButton,GlassDialog,GlassSelect,GlassScrollArea} from '@form-glass/react';
import {ClipboardCopy,Check} from 'lucide-react';
import {schemeCells} from './schemes.mjs';
import {exportSchemeCells} from './schemeExportData.mjs';
import {useLocale} from './i18n';
import type {Block} from './types';

export function SchemeExport({scheme,blocks,collection,blacklist,onClose}:{scheme:any;blocks:Block[];collection:string[];blacklist:string[];onClose:()=>void}){
 const {view,t}=useLocale(),[format,setFormat]=useState('modern'),[status,setStatus]=useState('');
 const result=useMemo(()=>exportSchemeCells(scheme?schemeCells(scheme,blocks,{collection,blacklist}):[],format),[scheme,blocks,collection,blacklist,format]);
 useEffect(()=>setStatus(''),[scheme,format]);
 const copy=async()=>{
  try{await navigator.clipboard.writeText(result.text);setStatus('Copied to clipboard');}
  catch{setStatus('Copy failed. Select the preview and copy it manually.');}
 };
 return view(<GlassDialog title="Export scheme" className="scheme-export-dialog" open={!!scheme} onOpenChange={open=>{if(!open)onClose();}} closeLabel="Close scheme export">
  <GlassScrollArea label="Scheme export" maxHeight="55dvh"><div className="scheme-export-content">
   <p className="micro muted">{scheme?.name}</p>
   <GlassSelect label="Export format" value={format} onChange={setFormat} options={[{value:'modern',label:'Minecraft ID · minecraft:stone'},{value:'legacy',label:'Legacy ID · 1:0'},{value:'hex',label:'HEX · #808080'}]}/>
   <p className="micro muted">One value per line, in slot order. Empty slots are omitted.</p>
   {format==='hex'&&<p className="micro muted">HEX uses each block’s actual average colour.</p>}
   {result.missing.length>0&&<div className="scheme-export-missing"><p>{format==='legacy'?'Not exported (no legacy ID):':'Not exported (no colour sample):'}</p><code>{result.missing.join(', ')}</code></div>}
   <textarea className="scheme-export-preview" aria-label="Export preview" readOnly value={result.text} spellCheck={false}/>
   <div className="scheme-export-actions"><GlassButton aria-label="Copy scheme to clipboard" disabled={!result.count} onClick={copy}>{status==='Copied to clipboard'?<Check size={14}/>:<ClipboardCopy size={14}/>}<span>Copy to clipboard</span></GlassButton><span>{t('Values')}: {result.count}</span></div>
   <p className="micro scheme-copy-status" role="status">{status}</p>
  </div></GlassScrollArea>
 </GlassDialog>);
}
