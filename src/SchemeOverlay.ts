import * as T from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {displayedSchemePaths} from './schemePaths.mjs';
import type {Sample,VoxelData,VoxelSection,SchemeHighlight} from './types';

export function createSchemeOverlay(highlights:SchemeHighlight[],samples:Sample[],grid:VoxelData,section:VoxelSection){
 const group=new T.Group(),paths=displayedSchemePaths(highlights,samples,grid,section);
 for(const path of paths){
  for(const points of path.segments){
   for(const [linewidth,opacity] of [[8,.2],[2,1]]){
    const geometry=new LineGeometry().setPositions(points.flat());
    const line=new Line2(geometry,new LineMaterial({color:0x92f5de,linewidth,transparent:true,opacity,depthTest:false,depthWrite:false}));
    line.renderOrder=90;line.raycast=()=>{};group.add(line);
   }
  }
  for(const point of path.controls){
   const bead=new T.Mesh(new T.SphereGeometry(.018,10,6),new T.MeshBasicMaterial({color:0xbaffef,depthTest:false,depthWrite:false}));
   bead.position.set(...point as [number,number,number]);bead.renderOrder=91;bead.raycast=()=>{};group.add(bead);
  }
 }
 group.userData.pathCount=paths.reduce((n:number,p:{segments:number[][][]})=>n+p.segments.length,0);
 return group;
}
