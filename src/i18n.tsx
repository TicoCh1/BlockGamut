import {Children,cloneElement,createContext,isValidElement,useContext,useEffect,useState,type ReactNode,type ReactElement} from 'react';
import dictionary from './ui.zh-CN.json';
import names from './blockNames.zh-CN.json';
import {GlassButton,GlassSwitch,GlassSelect} from '@form-glass/react';
export type Locale='en'|'zh-CN';
const zh=dictionary as Record<string,string>;
export function translate(value:string,locale:Locale):string{
 if(locale==='en')return value;
 const key=value.trim(),entry=zh[key];if(entry!==undefined)return value.replace(key,entry);
 const patterns:[RegExp,string][]=[
  [/^([\d,]+) \/ ([\d,]+) cells visible$/,'可见 $1 / $2 个格子'],
  [/^([\d,]+) instances selected · ([\d,]+) visible$/,'已选中 $1 个实例 · 当前可见 $2 个'],
  [/^(\d+) cells in this section · click to select$/,'本切片有 $1 个格子 · 点击选择'],
  [/^(.+)% of this sampled slice within ΔE (.+)$/,'此切片 $1% 的采样点在 ΔE $2 以内'],
  [/^(.+) rotating model preview$/,'$1旋转模型预览'],
  [/^(.+) texture preview$/,'$1纹理预览'],
  [/^(.+) value$/,'$1数值'],
  [/^ (\d+) face fallbacks\.$/,' $1 个面使用平均颜色。'],
 ];
 for(const [pattern,replacement] of patterns)if(pattern.test(value))return value.replace(pattern,replacement);
 return value;
}
const Context=createContext({locale:'en' as Locale,setLocale:(_v:Locale)=>{}});
/** Both translations participate in intrinsic layout, but only the current one
 * is painted/read aloud. CSS measures the real font, including CJK fallbacks,
 * before first paint; no post-render resize or cached pixel estimates. */
export function LocaleLabel({text,alternatives=[],translations}:{text:string;alternatives?:string[];translations?:Record<Locale,string>}){
 const {locale}=useContext(Context);
 const values=translations||{en:text,'zh-CN':translate(text,'zh-CN')};
 const sizes=[...new Set([...Object.values(values),...alternatives.flatMap(value=>[value,translate(value,'zh-CN')])])];
 return <span className="locale-label"><span className="locale-label-current">{values[locale]}</span>{sizes.map(value=><span key={value} className="locale-label-size" aria-hidden="true">{value}</span>)}</span>;
}
export function LocaleProvider({children}:{children:ReactNode}){
 const [locale,setLocale]=useState<Locale>(()=>{try{return localStorage.getItem('block-gamut-language')==='zh-CN'?'zh-CN':'en';}catch{return 'en';}});
 useEffect(()=>{document.documentElement.lang=locale;document.title=locale==='zh-CN'?'方块之色 · MineAgent':'Shape of blocks · MineAgent';try{localStorage.setItem('block-gamut-language',locale);}catch{/* Storage may be disabled. */}},[locale]);
 return <Context.Provider value={{locale,setLocale}}>{children}</Context.Provider>;
}
/** Localize declarative UI copy, including labels/options passed to FORM controls.
 * IDs, enum values, paths and numerical values are deliberately left intact.
 * Dynamic canvas text uses t directly; Minecraft names use their official table.
 */
export function useLocale(){
 const context=useContext(Context),t=(value:string)=>translate(value,context.locale);
 const view=(node:ReactNode,inButton=false):ReactNode=>{
  if(typeof node==='string')return inButton&&node.trim()&&translate(node,'zh-CN')!==node?<LocaleLabel text={node}/>:t(node);
  if(Array.isArray(node))return Children.map(node,child=>view(child,inButton));
  if(!isValidElement(node))return node;
  const element=node as ReactElement<any>,props={...element.props};
  if(element.type===LocaleLabel)return element;
  const button=inButton||element.type===GlassButton||element.type==='button';
  for(const key of ['label','aria-label','placeholder','title'])if(typeof props[key]==='string')props[key]=t(props[key]);
  if(element.type===GlassSwitch){props.ariaLabel=t(element.props.ariaLabel||element.props.label);props.label=<LocaleLabel text={element.props.label}/>;}
  if(Array.isArray(props.options))props.options=props.options.map((option:any)=>({...option,label:t(option.label),...(element.type===GlassSelect?{displayLabel:<LocaleLabel text={option.label}/>}:{})}));
  if(props.children!==undefined)props.children=Children.map(props.children,child=>view(child,button));
  return cloneElement(element,props);
 };
 const blockName=(id:string,fallback:string)=>context.locale==='zh-CN'?(names as Record<string,string>)[id]||fallback:fallback;
 return {...context,t,view,blockName};
}
