import {GlassButton,GlassSwitch} from '@form-glass/react';
import {allModelClasses,modelClasses} from './modelClass.mjs';
import {useLocale} from './i18n';

export function GeometryFilter({value,onChange}:{value:string[];onChange:(value:string[])=>void}){
 const {view}=useLocale();
 return view(<section className="geometry-filter" aria-label="Block geometry"><h3>Block geometry</h3><div className="geometry-choices">
  <div className="geometry-actions"><GlassButton onClick={()=>onChange([...allModelClasses])}>Select all</GlassButton><GlassButton onClick={()=>onChange([])}>Clear</GlassButton></div>
  {modelClasses.map(({value:category,label})=><GlassSwitch key={category} label={label} checked={value.includes(category)} onChange={checked=>onChange(checked?[...value,category]:value.filter(v=>v!==category))}/>)}
  <p className="micro muted">Sets are a subset of full cubes. Selected categories are combined.</p>
 </div></section>);
}
