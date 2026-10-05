import {useEffect,useRef} from 'react';
import * as T from 'three';
import {nativeModel} from './modelRender';
import type {ModelResources} from './useModels';

// One renderer and a cache per loaded release; never one WebGL context per slot.
let renderer:T.WebGLRenderer|null=null;
const thumbnails=new WeakMap<ModelResources,Map<string,HTMLCanvasElement>>();
function thumbnail(resources:ModelResources,id:string){
 let cache=thumbnails.get(resources);if(!cache){cache=new Map();thumbnails.set(resources,cache);}
 const saved=cache.get(id);if(saved)return saved;
 renderer??=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(96,96);renderer.outputColorSpace=T.SRGBColorSpace;
 const {geometry,material}=nativeModel(resources,id);geometry.computeBoundingBox();
 const box=geometry.boundingBox!,center=box.getCenter(new T.Vector3()),radius=box.getSize(new T.Vector3()).length()/2;
 geometry.translate(-center.x,-center.y,-center.z);
 const scene=new T.Scene(),mesh=new T.Mesh(geometry,material);scene.add(mesh);
 const camera=new T.PerspectiveCamera(32,1,.01,100);
 camera.position.set(radius*1.8,radius*1.5,radius*2.5).normalize().multiplyScalar(radius/Math.sin(camera.fov*Math.PI/360)*1.06);camera.lookAt(0,0,0);
 renderer.render(scene,camera);
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;canvas.getContext('2d')!.drawImage(renderer.domElement,0,0);
 geometry.dispose();material.dispose();cache.set(id,canvas);return canvas;
}
export function BlockThumbnail({id,resources}:{id:string;resources:ModelResources|null}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(!canvas.current||!resources?.pack.models[id]?.renderable)return;const ctx=canvas.current.getContext('2d')!;ctx.clearRect(0,0,96,96);ctx.drawImage(thumbnail(resources,id),0,0);},[id,resources]);
 return <canvas ref={canvas} width={96} height={96} aria-hidden="true"/>;
}
