import {createSchemeOverlay} from './SchemeOverlay';
import {FOCUS_MS,focusPose} from './cameraMotion.mjs';
import {useLocale} from './i18n';
import {memo,useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ConvexGeometry} from 'three/examples/jsm/geometries/ConvexGeometry.js';
import {fromLab,inGamut} from './color.mjs';
import {MOTION_MS} from './motion.mjs';
import {createTransitionField,createDenseTransitionField} from './TransitionField';
import {project,axisLabels} from './spaces.mjs';
import type {Sample,Space,Arrangement,VoxelData,VoxelSection,SchemeHighlight} from './types';
import {createVoxelField} from './VoxelField';
import type {ModelResources} from './useModels';
interface Props {schemeHighlights:SchemeHighlight[];catalogReady:boolean;onReady:()=>void;onStartupError:(message:string)=>void;arrangement:Arrangement;voxelSection:VoxelSection;onVoxelData:(data:VoxelData|null)=>void;samples:Sample[];space:Space;variance:boolean;hull:boolean;reference:boolean;rotate:boolean;slice:boolean;lightness:number;resources:ModelResources|null;assetError:boolean;selected:string;reset:number;focus:number;onSelect:(id:string)=>void;onRotateStop:()=>void;onModelStats:(stats:{rendered:number;unsupported:number}|null)=>void}
const vector=(p:number[])=>new T.Vector3(...p as [number,number,number]);
function dispose(group:T.Object3D){group.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){const map=(mat as T.MeshBasicMaterial).map;if(map&&!map.userData.shared)map.dispose();mat.dispose();}});}
function label(text:string,pos:T.Vector3){const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d')!;ctx.font='24px monospace';ctx.fillStyle='#8d949f';ctx.textAlign='center';ctx.fillText(text,256,40);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false}));sprite.position.copy(pos);sprite.scale.set(1.1,.1375,1);return sprite;}
function spatial(points:T.Vector3[]){if(points.length<4)return false;const a=points[0],b=points.find(p=>p.distanceToSquared(a)>1e-12);if(!b)return false;const ab=b.clone().sub(a),c=points.find(p=>new T.Vector3().crossVectors(ab,p.clone().sub(a)).lengthSq()>1e-12);if(!c)return false;const n=new T.Vector3().crossVectors(ab,c.clone().sub(a));return points.some(p=>Math.abs(n.dot(p.clone().sub(a)))>1e-10);}
function guides(data:T.Group,props:Props,t:(v:string)=>string){
 const {space,variance,samples,reference,hull,slice,lightness}=props;
 const grid=new T.GridHelper(2.6,10,0xbcb7ac,0xd4cfc6);grid.position.y=-1.34;grid.material.transparent=true;grid.material.opacity=.16;data.add(grid);
 const axes=new T.BufferGeometry().setFromPoints([vector([-1.3,-1.3,0]),vector([1.3,-1.3,0]),vector([0,-1.3,-1.3]),vector([0,-1.3,1.3]),vector([0,-1.3,0]),vector([0,1.3,0])]);data.add(new T.LineSegments(axes,new T.LineBasicMaterial({color:0x8f8b82,transparent:true,opacity:.4})));
 const text=axisLabels(space,variance);data.add(label(t(text[0]),vector([1.5,-1.33,0])),label(t(text[1]),vector([0,1.5,0])),label(t(text[2]),vector([0,-1.33,1.5])));
 if(reference&&!variance){
  const lines:T.Vector3[]=[];for(let axis=0;axis<3;axis++)for(const edge of [0,1])for(let j=0;j<=8;j++)for(let k=0;k<40;k++)for(const direction of [0,1])for(const t of [k/40,(k+1)/40]){const rgb=[0,0,0];rgb[axis]=edge;rgb[(axis+1)%3]=direction?t:j/8;rgb[(axis+2)%3]=direction?j/8:t;lines.push(vector(project(rgb,space)));}
  data.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),new T.LineBasicMaterial({color:0x888276,transparent:true,opacity:.14,depthWrite:false})));
 }
 if(hull){const points:T.Vector3[]=[...new Map(samples.map(p=>{const v=project(p.rgb,space,p.block.surface);return [v.join(','),vector(v)] as const;})).values()];if(spatial(points)){const geom=new ConvexGeometry(points);data.add(new T.Mesh(geom,new T.MeshBasicMaterial({color:0xa0b3c0,transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false})));data.add(new T.LineSegments(new T.EdgesGeometry(geom,15),new T.LineBasicMaterial({color:0x7b776f,transparent:true,opacity:.22,depthWrite:false})));}}
 if(slice&&space==='oklab'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d')!,image=ctx.createImageData(160,160);
  for(let y=0;y<160;y++)for(let x=0;x<160;x++){const rgb=fromLab([lightness,.8*x/159-.4,.4-.8*y/159]);if(!inGamut(rgb))continue;const off=(y*160+x)*4;rgb.forEach((v,i)=>image.data[off+i]=Math.round(v*255));image.data[off+3]=155;}
  ctx.putImageData(image,0,0);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plane=new T.Mesh(new T.PlaneGeometry(2.08,2.08),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthWrite:false}));plane.rotation.x=Math.PI/2;plane.position.y=(lightness-.5)*2.6;data.add(plane);
 }
}
export const Scene=memo(function Scene(props:Props){
 const {view,t,locale}=useLocale();
 const host=useRef<HTMLDivElement>(null),state=useRef<any>(null),latest=useRef(props);latest.current=props;
 const [error,setError]=useState(false),[motion,setMotion]=useState('');const {resources}=props;
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError(true);latest.current.onStartupError('3D rendering is unavailable. Check browser graphics support.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label',t('Interactive 3D block colour atlas. Drag to orbit, scroll to zoom. Click a block to select it.'));
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.01,150);camera.position.set(3.7,2.2,5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.08;controls.maxDistance=40;controls.autoRotateSpeed=.55;controls.addEventListener('start',()=>{if(state.current){state.current.focusTween=null;controls.enableDamping=true;el.dataset.focusState='interrupted';}latest.current.onRotateStop();});
  const data=new T.Group(),guide=new T.Group(),schemeOverlay=new T.Group();scene.add(data,guide,schemeOverlay);const worker=new Worker(new URL('./layout.worker.ts',import.meta.url),{type:'module'});
  const s:any={renderer,scene,camera,controls,data,guide,schemeOverlay,worker,request:0,mesh:null,dirty:true,cells:null,ids:'',animation:null,pending:null};state.current=s;
  s.rebuildSchemes=()=>{
   dispose(s.schemeOverlay);s.schemeOverlay.clear();
   if(s.animation||!s.grid||!s.drawSamples)return;
   s.schemeOverlay.visible=true;
   const overlay=createSchemeOverlay(latest.current.schemeHighlights,s.drawSamples,s.grid,{...latest.current.voxelSection,enabled:s.grid.mode!=='spaced'&&latest.current.voxelSection.enabled});
   s.schemeOverlay.add(overlay);
   const ids=latest.current.schemeHighlights.flatMap(h=>h.blockIds);s.field?.highlight?.(ids);s.previewVoxel?.highlight(ids);
   el.dataset.schemePaths=String(overlay.userData.pathCount);s.dirty=true;
  };
  worker.onmessage=({data:result})=>{if(result.id===s.request)s.receive?.(result);};worker.onerror=()=>{setMotion('Layout worker unavailable. Refresh to retry.');if(!s.readyReported)latest.current.onStartupError('Block layout could not start. Refresh to retry.');};
  controls.addEventListener('change',()=>{s.dirty=true;});const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();s.dirty=true;});resize.observe(el);
  let down=[0,0];const start=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};const pick=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||!s.mesh)return;const box=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera);const hit=ray.intersectObject(s.mesh,true).find(hit=>hit.object.visible);if(hit?.face){const sampleIndex=hit.object.userData.sampleIndex??(hit.object as T.Mesh).geometry.getAttribute('sampleIndex')?.getX(hit.face.a);const sample=(hit.object.userData.motionSamples||s.drawSamples)[sampleIndex];if(sample)latest.current.onSelect(sample.block.id);}else latest.current.onSelect('');};
  el.addEventListener('pointerdown',start);el.addEventListener('pointerup',pick);const lost=(e:Event)=>{e.preventDefault();setError(true);if(!s.readyReported)latest.current.onStartupError('3D rendering is unavailable. Check browser graphics support.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  let frame=0;const tick=(now=performance.now())=>{frame=requestAnimationFrame(tick);if(document.hidden)return;const movingFrame=s.animation,frameStarted=performance.now();
   if(s.hasAnimated){const frame=latest.current.resources?.animate(now);if(s.fireFrame!==frame){s.fireFrame=frame;s.dirty=true;}}
   if(s.animation){const animation=s.animation,progress=Math.max(0,Math.min(1,(now-animation.started)/MOTION_MS));animation.field.apply(progress,latest.current.voxelSection);el.dataset.motionProgress=progress.toFixed(3);s.dirty=true;if(progress===1){s.animation=null;animation.finish();const next=s.pending;s.pending=null;next?.();}}
   if(s.focusTween){const f=s.focusTween,progress=Math.min(1,(now-f.started)/FOCUS_MS),target=s.animation?.field.position(f.id)||f.destination;
    const pose=focusPose(f.camera,f.target,target,f.distance,progress);camera.position.copy(vector(pose.camera));controls.target.copy(vector(pose.target));s.dirty=true;
    el.dataset.focusProgress=progress.toFixed(3);el.dataset.focusDistance=pose.distance.toFixed(4);
    if(progress===1){s.focusTween=null;controls.enableDamping=true;el.dataset.focusState='idle';}
   }
   controls.autoRotate=!s.focusTween&&latest.current.rotate;controls.update();if(s.dirty){const renderStarted=performance.now();s.field?.sort(camera);renderer.render(scene,camera);if(s.firstFramePending&&!s.readyReported){s.readyReported=true;latest.current.onReady();}if(s.sectionCost!==undefined){const ms=s.sectionCost+performance.now()-renderStarted;s.sectionCost=undefined;el.dataset.sectionUpdateMs=ms.toFixed(1);if(s.sectionIsLive){el.dataset.sectionLiveMs=ms.toFixed(1);el.dataset.sectionLiveMaxMs=(s.liveMax=Math.max(s.liveMax||0,ms)).toFixed(1);el.dataset.sectionLiveUpdates=String(s.liveUpdates=(s.liveUpdates||0)+1);}}s.dirty=false;}
   if(movingFrame){const ms=performance.now()-frameStarted;movingFrame.frameSum=(movingFrame.frameSum||0)+ms;movingFrame.frames=(movingFrame.frames||0)+1;el.dataset.motionFrameMeanMs=(movingFrame.frameSum/movingFrame.frames).toFixed(1);el.dataset.motionFrameMaxMs=(movingFrame.frameMax=Math.max(movingFrame.frameMax||0,ms)).toFixed(1);el.dataset.motionFrames=String(movingFrame.frames);}
  };tick();
  return()=>{cancelAnimationFrame(frame);if(s.preparedField)dispose(s.preparedField.mesh);worker.terminate();resize.disconnect();controls.dispose();dispose(scene);renderer.dispose();el.removeEventListener('pointerdown',start);el.removeEventListener('pointerup',pick);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.remove();state.current=null;};
 },[]);
 useEffect(()=>{const s=state.current;if(!s||!resources||s.resourceVersion===resources.version)return;s.resourceVersion=resources.version;s.request++;s.pending=null;s.animation=null;s.snapshot=null;s.hasAnimated=false;dispose(s.data);s.data.clear();s.field=null;s.voxel=null;s.previewVoxel=null;s.mesh=null;s.dirty=true;},[resources]);
 useEffect(()=>{state.current?.renderer.domElement.setAttribute('aria-label',t('Interactive 3D block colour atlas. Drag to orbit, scroll to zoom. Click a block to select it.'));},[locale]);
 useEffect(()=>{const s=state.current;if(s){s.focusTween=null;s.controls.enableDamping=true;host.current!.dataset.focusState='idle';s.camera.position.copy(vector(latest.current.arrangement==='dense'?[4.8,3.2,6.5]:[3.7,2.2,5]));s.controls.target.set(0,0,0);s.controls.update();}},[props.reset]);
 useEffect(()=>{state.current?.rebuildSchemes();},[props.schemeHighlights]);
 useEffect(()=>{const s=state.current;if(s){s.field?.select(props.selected);s.dirty=true;}},[props.selected]);
 useEffect(()=>{const s=state.current;const enabledChanged=s&&s.sectionEnabled!==props.voxelSection.enabled;if(s)s.sectionEnabled=props.voxelSection.enabled;const update=()=>{if(s?.animation){s.animation.field.apply(Math.max(0,Math.min(1,(performance.now()-s.animation.started)/MOTION_MS)),props.voxelSection);s.dirty=true;return;}if(s?.voxel){const started=performance.now();host.current!.dataset.sectionUpdates=String((s.sectionUpdates=(s.sectionUpdates||0)+1));const live=props.voxelSection.enabled&&props.voxelSection.preview;
   if(live&&!s.previewVoxel){s.previewVoxel=createVoxelField(resources!,s.drawSamples,s.grid,true);s.previewVoxel.highlight(latest.current.schemeHighlights.flatMap(h=>h.blockIds));s.previewVoxel.update(props.voxelSection);s.data.add(s.previewVoxel.mesh);}
   const field=live?s.previewVoxel:s.voxel;field.update(props.voxelSection);field.select(props.selected);
   s.voxel.mesh.visible=!live;if(s.previewVoxel)s.previewVoxel.mesh.visible=!!live;s.field=field;s.mesh=field.mesh;
   host.current!.dataset.sectionMode=live?'live':'settled';host.current!.dataset.sectionVisible=String(field.mesh.userData.visibleIndices.length);
   if(live)s.schemeOverlay.visible=false;else s.rebuildSchemes();s.sectionIsLive=!!live;s.sectionCost=performance.now()-started;s.dirty=true;}};if(enabledChanged&&!props.voxelSection.preview){const timer=setTimeout(update,200);return()=>clearTimeout(timer);}update();},[props.voxelSection,resources]);
 useEffect(()=>{if(!props.voxelSection.enabled||props.arrangement==='spaced')return;const s=state.current,grid=s?.grid;
  const timer=setTimeout(()=>{if(!s?.voxel||s.animation||s.grid!==grid||s.previewVoxel||!resources)return;s.previewVoxel=createVoxelField(resources,s.drawSamples,grid,true);s.previewVoxel.highlight(latest.current.schemeHighlights.flatMap(h=>h.blockIds));s.previewVoxel.update(latest.current.voxelSection);s.previewVoxel.mesh.visible=false;s.data.add(s.previewVoxel.mesh);},2000);
  return()=>clearTimeout(timer);
 },[props.voxelSection.enabled,props.arrangement,props.samples,props.space,props.variance,resources]);
 useEffect(()=>{const s=state.current;if(!s||!props.focus)return;
  const index=s.drawSamples?.findIndex((p:Sample)=>p.block.id===latest.current.selected);
  const visibleIndex=s.voxel?s.mesh.userData.visibleIndices.find((i:number)=>s.grid.indices[i]===index):index;
  const moving=s.animation?.field.position(latest.current.selected);
  const cell=s.grid?.cells[visibleIndex];if(!moving&&!cell)return;
  const destination=moving||cell.map((v:number)=>(v+s.grid.origin)*s.grid.pitch);
  latest.current.onRotateStop();s.controls.autoRotate=false;s.controls.enableDamping=false;s.controls.update();
  const block=latest.current.samples.find(p=>p.block.id===latest.current.selected)?.block;
  const radius=Math.hypot(...(block?.renderBounds?.size||[1,1,1]))*.052/2;
  const distance=Math.max(.45,radius/Math.sin(T.MathUtils.degToRad(s.camera.fov)/2)*1.35);
  s.focusTween={id:latest.current.selected,camera:s.camera.position.toArray(),target:s.controls.target.toArray(),destination,distance,started:performance.now()};
  const el=host.current!;el.dataset.focusState='moving';el.dataset.focusDuration=String(FOCUS_MS);el.dataset.focusProgress='0';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.camera.position.copy(vector(focusPose(s.focusTween.camera,s.focusTween.target,destination,distance,1).camera));s.controls.target.copy(vector(destination));s.focusTween=null;s.controls.enableDamping=true;el.dataset.focusProgress='1';el.dataset.focusState='idle';s.controls.update();}
  s.dirty=true;
 },[props.focus]);
 // Guide/locale changes do not rebuild the field or restart an in-flight layout.
 useEffect(()=>{const s=state.current;if(!s)return;dispose(s.guide);s.guide.clear();guides(s.guide,props,t);s.dirty=true;
 },[props.samples,props.space,props.variance,props.hull,props.reference,props.slice,props.lightness,locale]);

 useEffect(()=>{
  const s=state.current;if(!s||!resources||!props.catalogReady)return;const {samples,space}=props;
  const request=()=>{
   const before=s.snapshot,animate=!!before&&!matchMedia('(prefers-reduced-motion: reduce)').matches,id=++s.request;
   setMotion(before?'Planning simultaneous movement…':props.arrangement==='dense'?'Mapping colour cells to blocks…':'');
   host.current!.dataset.motionRequest=String(id);
   s.receive=(result:any)=>{
    if(result.error){setMotion('Could not plan this transition. Reset the filters to retry.');if(!s.readyReported)latest.current.onStartupError('Block layout could not start. Refresh to retry.');return;}
    const {plan,...grid}=result,after={samples,grid};
    const preparedSection=latest.current.voxelSection;let prepared:ReturnType<typeof createVoxelField>|null=null;
    const install=()=>{
     prepared?.mesh.removeFromParent();prepared?.setFade(1);dispose(s.data);s.data.clear();s.voxel=null;s.previewVoxel=null;s.selection=null;
     s.snapshot=after;s.grid=grid;s.cells=grid.cells;s.current=grid.cells;s.drawSamples=samples;s.hasAnimated=samples.some(p=>resources.animatedIds.has(p.block.id));
     const field=prepared||createVoxelField(resources,samples,grid);s.preparedField=null;if(!prepared||preparedSection!==latest.current.voxelSection)field.update({...latest.current.voxelSection,enabled:grid.mode!=='spaced'&&latest.current.voxelSection.enabled});field.select(latest.current.selected);
     s.field=field;s.mesh=field.mesh;s.data.add(field.mesh);if(grid.mode!=='spaced')s.voxel=field;
     s.rebuildSchemes();s.dirty=true;s.firstFramePending=true;latest.current.onVoxelData(grid.mode==='spaced'?null:grid);
     host.current!.dataset.motionProgress='1';host.current!.dataset.motionActors='0';setMotion('');
    };
    if(!animate||!plan?.changed){install();return;}
    prepared=createVoxelField(resources,samples,grid);prepared.update({...preparedSection,enabled:grid.mode!=='spaced'&&preparedSection.enabled});s.preparedField=prepared;
    const field=plan.denseFade?createDenseTransitionField(resources,before,after,plan,s.field,prepared):createTransitionField(resources,before,after,plan);
    field.apply(0,latest.current.voxelSection);field.select(latest.current.selected);
    dispose(s.data);s.data.clear();s.voxel=null;s.previewVoxel=null;s.selection=null;
    s.field=field;s.mesh=field.mesh;s.data.add(field.mesh);s.drawSamples=[...before.samples,...samples];s.hasAnimated=s.drawSamples.some((p:Sample)=>resources.animatedIds.has(p.block.id));s.dirty=true;
    s.schemeOverlay.visible=false;s.animation={field,started:performance.now(),finish:install};
    const el=host.current!;el.dataset.motionPipeline=plan.denseFade?'representative-fade':'manhattan';el.dataset.motionDuration=String(MOTION_MS);el.dataset.motionActors=String(plan.actors.length);
    for(const kind of ['keep','enter','exit','clone'])el.dataset['motion'+kind[0].toUpperCase()+kind.slice(1)]=String(plan.actors.filter((a:any)=>a.kind===kind).length);
    setMotion('Moving blocks together…');
   };
   s.worker.postMessage({id,samples,space,mode:props.arrangement,variance:props.variance,before:animate?before:null});
  };
  // Finish the current <=1s batch, then route only the latest requested state.
  // No stale result can rebuild the mesh in the middle of another animation.
  if(s.animation)s.pending=request;else request();
 },[props.arrangement,props.space,props.variance,props.samples,resources,props.catalogReady]);
 useEffect(()=>{props.onModelStats(resources?{rendered:props.samples.filter(s=>resources.pack.models[s.block.id]?.renderable).length,unsupported:props.samples.filter(s=>!resources.pack.models[s.block.id]?.renderable).length}:null);},[resources,props.samples,props.onModelStats]);
 return view(<div className="scene" ref={host} data-arrangement={props.arrangement} data-space={props.space} data-variance={props.variance} data-motion={motion?'active':'idle'}>{motion&&<div className="motion-notice" role="status">{motion}</div>}{error&&<div className="scene-error">3D rendering is unavailable.<br/>Search and the material catalog remain available.</div>}</div>);
});
