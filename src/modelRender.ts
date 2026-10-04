import * as T from 'three';
import {cleanModelGeometry} from './renderGeometry.mjs';
import type {ModelResources} from './useModels';
export function bufferGeometry(g:any,portal=0){
 const geometry=new T.BufferGeometry();
 for(const [name,key,size] of [['position','positions',3],['uv','uvs',2],['color','colors',3],['textureTile','tiles',1],['frameUv','localUvs',2]] as const)geometry.setAttribute(name,new T.Float32BufferAttribute(g[key],size));
 geometry.setAttribute('portalSurface',new T.Float32BufferAttribute(g.portals||new Float32Array(g.positions.length/3).fill(portal),1));return geometry;
}
export function surfaceMaterial(resources:ModelResources,transparent=false,fade={value:1}){
 // FrontSide is essential: native crossed quads already have both windings.
 const material=new T.MeshBasicMaterial({map:resources.texture,vertexColors:true,side:T.FrontSide,alphaTest:transparent?.001:.1,transparent,depthWrite:!transparent});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,resources.uniforms);
  shader.uniforms.transitionOpacity=fade;
  // Screen-door alpha fade retains native depth/layer rules and face culling.
  shader.fragmentShader='uniform float transitionOpacity;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(transitionOpacity < 1. && fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453) >= transitionOpacity) discard;');
  shader.vertexShader='attribute float textureTile; attribute vec2 frameUv; attribute float portalSurface; varying float vTextureTile; varying vec2 vFrameUv; varying float vPortal; varying vec4 vPortalProjection;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvTextureTile=textureTile;vFrameUv=frameUv;vPortal=portalSurface;').replace('#include <project_vertex>','#include <project_vertex>\nvPortalProjection=gl_Position;');
  shader.fragmentShader=`uniform sampler2D animationAtlas;uniform sampler2D animationTable;uniform float animationTableWidth;uniform vec2 animationAtlasSize;uniform float animationColumns;uniform float animationCell;uniform float animationPadding;uniform float animationTileSize;uniform float previewTime;uniform sampler2D endSky;uniform sampler2D endPortal;
 varying float vTextureTile;varying vec2 vFrameUv;varying float vPortal;varying vec4 vPortalProjection;
 vec2 animatedUV(float tile){vec2 p=vec2(mod(tile,animationColumns),floor(tile/animationColumns))*animationCell+animationPadding+mix(vec2(.01),vec2(animationTileSize-.01),vec2(vFrameUv.x,1.-vFrameUv.y));return vec2(p.x/animationAtlasSize.x,1.-p.y/animationAtlasSize.y);}
 `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 vec4 frame=texture2D(animationTable,vec2((floor(vTextureTile+.5)+.5)/animationTableWidth,.5));
 if(frame.w>.5)sampledDiffuseColor=mix(texture2D(animationAtlas,animatedUV(frame.x)),texture2D(animationAtlas,animatedUV(frame.y)),frame.z);
 if(vPortal>.5){vec2 p=vPortalProjection.xy/vPortalProjection.w*.5+.5;vec3 stars=texture2D(endSky,p).rgb*vec3(.022,.098,.111);
 for(int i=1;i<=16;i++){float layer=float(i),angle=radians((layer*layer*4321.+layer*9.)*2.);mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));vec2 uv=rotation*(p*.5+vec2(17./layer,(2.+layer/1.5)*previewTime/800.))*(9.-layer*.5);vec3 tint=mix(vec3(.02,.1,.1),vec3(.08,.31,.66),layer/16.);stars+=texture2D(endPortal,uv).rgb*tint;}
 sampledDiffuseColor=vec4(stars,1.);}
 diffuseColor*=sampledDiffuseColor;`);
 };
 material.customProgramCacheKey=()=> 'minecraft-preview-native-layers-v4';return material;
}
export function nativeModel(resources:ModelResources,id:string,_unit=false){
 const model=resources.pack.models[id],g=cleanModelGeometry(model,resources.pack.atlas),geometry=bufferGeometry(g,id==='minecraft:end_portal'||id==='minecraft:end_gateway'?1:0);
 return {geometry,material:surfaceMaterial(resources,model.renderLayer==='TRANSLUCENT'),animated:resources.animatedIds.has(id)};
}
