import {useState} from 'react';
import {GlassButton,GlassDisclosure,GlassSwitch} from '@form-glass/react';
import {allModelClasses,modelClasses} from './modelClass.mjs';
import {useLocale} from './i18n';

export function GeometryFilter({value,onChange}:{value:string[];onChange:(value:string[])=>void}){
 const {view}=useLocale(),[open,setOpen]=useState(false);
 return view(<GlassDisclosure label="Block geometry" open={open} onOpenChange={setOpen} className="geometry-filter"><div className="geometry-choices">
  <div className="geometry-actions"><GlassButton onClick={()=>onChange([...allModelClasses])}>Select all</GlassButton><GlassButton onClick={()=>onChange([])}>Clear</GlassButton></div>
  {modelClasses.map(({value:category,label})=><GlassSwitch key={category} label={label} checked={value.includes(category)} onChange={checked=>onChange(checked?[...value,category]:value.filter(v=>v!==category))}/>)}
  <p className="micro muted">Sets are a subset of full cubes. Selected categories are combined.</p>
 </div></GlassDisclosure>);
}
