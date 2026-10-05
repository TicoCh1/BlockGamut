import {LocaleLabel,useLocale} from './i18n';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {GlassButton} from '@form-glass/react';
import {nativeModel} from './modelRender';
import type {ModelResources} from './useModels';
export function Turntable({id,name,resources}:{id:string;name:string;resources:ModelResources|null}){
 const {view,t,locale}=useLocale();
 const host=useRef<HTMLDivElement>(null),[paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[error,setError]=useState(false),pauseRef=useRef(paused);pauseRef.current=paused;
 useEffect(()=>{
  const el=host.current,model=resources?.pack.models[id];if(!el||!resources||!model?.renderable)return;
  let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true});}catch{setError(true);return;}
  setError(false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;el.append(renderer.domElement);renderer.domElement.setAttribute('aria-label',t(`${name} rotating model preview`));
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,100),{geometry,material,animated}=nativeModel(resources,id);geometry.computeBoundingBox();
  const bounds=geometry.boundingBox!,center=bounds.getCenter(new T.Vector3()),radius=bounds.getSize(new T.Vector3()).length()/2;
  geometry.translate(-center.x,-center.y,-center.z);
  const mesh=new T.Mesh(geometry,material);scene.add(mesh);mesh.rotation.y=.5;
  let dirty=true;const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();const angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));camera.position.set(0,radius*1.5,radius/Math.sin(angle)*1.08);camera.lookAt(0,0,0);dirty=true;});resize.observe(el);
  let frame=0,last=0,fireFrame=-1;const tick=(now:number)=>{frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);if(now-last<32)return;last=now;if(document.hidden)return;if(animated){const next=resources.animate(now);if(next!==fireFrame){fireFrame=next;dirty=true;}}if(!pauseRef.current){mesh.rotation.y+=dt*.5;dirty=true;}if(dirty){renderer.render(scene,camera);dirty=false;}};frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();};
 },[id,name,resources,locale]);
 const visible=resources?.pack.models[id]?.renderable;
 return view(<div className="turntable"><div className="turntable-viewport" ref={host}>{(!visible||error)&&<span>{error?'Preview unavailable':resources?'No visible surface':'Loading preview…'}</span>}</div><div className="turntable-caption"><span>TURNTABLE · 360°</span>{visible&&<GlassButton aria-label={paused?'Play turntable':'Pause turntable'} aria-pressed={!paused} onClick={()=>setPaused(v=>!v)}><LocaleLabel text={paused?'Play':'Pause'} alternatives={['Play','Pause']}/></GlassButton>}</div></div>);
}
