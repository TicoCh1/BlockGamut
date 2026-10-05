import {LocaleLabel,useLocale} from './i18n';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {GlassButton} from '@form-glass/react';
import {nativeModel} from './modelRender';
import type {ModelResources} from './useModels';
interface PreviewState {renderer:T.WebGLRenderer;scene:T.Scene;camera:T.PerspectiveCamera;mesh:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>|null;radius:number;animated:boolean;dirty:boolean;fireFrame:number;fit:()=>void}
export function Turntable({id,name,resources}:{id:string;name:string;resources:ModelResources|null}){
 const {view,t,locale}=useLocale();
 const host=useRef<HTMLDivElement>(null),[paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[error,setError]=useState(false),pauseRef=useRef(paused);pauseRef.current=paused;
 const state=useRef<PreviewState|null>(null),currentResources=useRef(resources);currentResources.current=resources;
 // Keep one WebGL context for the mounted inspector, including wheel changes.
 useEffect(()=>{
  const el=host.current!;
  let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true});}catch{setError(true);return;}
  setError(false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;el.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,100);
  const s:PreviewState={renderer,scene,camera,mesh:null,radius:1,animated:false,dirty:true,fireFrame:-1,fit:()=>{}};state.current=s;
  s.fit=()=>{const angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));camera.position.set(0,s.radius*1.5,s.radius/Math.sin(angle)*1.08);camera.lookAt(0,0,0);s.dirty=true;};
  const size=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();s.fit();};
  const resize=new ResizeObserver(size);resize.observe(el);size();
  let frame=0,last=0;const tick=(now:number)=>{frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);if(now-last<32)return;last=now;if(document.hidden)return;if(s.animated){const next=currentResources.current!.animate(now);if(next!==s.fireFrame){s.fireFrame=next;s.dirty=true;}}if(s.mesh&&!pauseRef.current){s.mesh.rotation.y+=dt*.5;s.dirty=true;}if(s.dirty){renderer.render(scene,camera);s.dirty=false;}};frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();state.current=null;};
 },[]);
 useEffect(()=>{
  const s=state.current,model=resources?.pack.models[id];if(!s||!resources||!model?.renderable)return;
  const {geometry,material,animated}=nativeModel(resources,id);geometry.computeBoundingBox();
  const bounds=geometry.boundingBox!,center=bounds.getCenter(new T.Vector3()),radius=bounds.getSize(new T.Vector3()).length()/2;
  geometry.translate(-center.x,-center.y,-center.z);
  const mesh=new T.Mesh(geometry,material);s.scene.add(mesh);mesh.rotation.y=.5;s.mesh=mesh;s.radius=radius;s.animated=animated;s.fireFrame=-1;s.fit();
  return()=>{mesh.removeFromParent();geometry.dispose();material.dispose();s.mesh=null;s.animated=false;s.dirty=true;};
 },[id,resources]);
 useEffect(()=>{state.current?.renderer.domElement.setAttribute('aria-label',t(`${name} rotating model preview`));},[name,locale]);
 const visible=resources?.pack.models[id]?.renderable;
 return view(<div className="turntable"><div className="turntable-viewport" ref={host}>{(!visible||error)&&<span>{error?'Preview unavailable':resources?'No visible surface':'Loading preview…'}</span>}</div><div className="turntable-caption"><span>TURNTABLE · 360°</span>{visible&&<GlassButton aria-label={paused?'Play turntable':'Pause turntable'} aria-pressed={!paused} onClick={()=>setPaused(v=>!v)}><LocaleLabel text={paused?'Play':'Pause'} alternatives={['Play','Pause']}/></GlassButton>}</div></div>);
}
