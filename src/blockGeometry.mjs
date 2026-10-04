// Minecraft JSON elements and static model-part quads in block coordinates.
export function faceCorners(from,to,face){
 const [x,y,z]=from,[X,Y,Z]=to;
 return {east:[[X,Y,Z],[X,Y,z],[X,y,Z],[X,y,z]],west:[[x,Y,z],[x,Y,Z],[x,y,z],[x,y,Z]],up:[[x,Y,z],[X,Y,z],[x,Y,Z],[X,Y,Z]],down:[[x,y,Z],[X,y,Z],[x,y,z],[X,y,z]],south:[[x,Y,Z],[X,Y,Z],[x,y,Z],[X,y,Z]],north:[[X,Y,z],[x,Y,z],[X,y,z],[x,y,z]]}[face];
}
export function defaultUV(from,to,face){
 const [x,y,z]=from,[X,Y,Z]=to;
 return {down:[x,16-Z,X,16-z],up:[x,z,X,Z],north:[16-X,16-Y,16-x,16-y],south:[x,16-Y,X,16-y],west:[z,16-Y,Z,16-y],east:[16-Z,16-Y,16-z,16-y]}[face];
}
export function rotateElement(point,rotation){
 if(!rotation)return point;
 const axis={x:0,y:1,z:2}[rotation.axis],a=(axis+1)%3,b=(axis+2)%3;
 const angle=rotation.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const p=point.map((v,i)=>v-rotation.origin[i]);
 if(rotation.rescale){const scale=1/Math.cos(Math.abs(angle));p[a]*=scale;p[b]*=scale;}
 const u=p[a],v=p[b];p[a]=u*c-v*s;p[b]=u*s+v*c;
 return p.map((v,i)=>v+rotation.origin[i]);
}
export function modelVertices(model,atlas){
 const positions=[],uvs=[],colors=[],tiles=[],localUvs=[];
 for(const element of model.elements){
  for(const [direction,face] of Object.entries(element.faces)){
   const corners=face.vertices||faceCorners(element.from,element.to,direction);if(!corners)continue;
   const [u,v,U,V]=face.uv||defaultUV(element.from,element.to,direction);
   let uv=[[u,v],[U,v],[u,V],[U,V]];
   const turns=(face.rotation||0)/90;
   for(let turn=0;turn<turns;turn++)uv=[uv[2],uv[0],uv[3],uv[1]];
   const tx=(face.tile%atlas.columns)*atlas.cell+atlas.padding,ty=Math.floor(face.tile/atlas.columns)*atlas.cell+atlas.padding;
   const shade=element.shade===false?1:({up:1,down:.60,east:.80,west:.80,north:.91,south:.91}[direction]??1);
   for(const i of [0,2,1,2,3,1]){
    let p=rotateElement(corners[i],element.rotation);
    for(const transform of element.transforms||[])p=rotateElement(p,transform);
    positions.push(...p.map((v,axis)=>(v+(element.offset?.[axis]||0))/16-.5));
    // A tiny inset keeps each tile's final texel inside its own extruded border.
    uvs.push((tx+.01+uv[i][0]/16*(atlas.tileSize-.02))/atlas.width,1-(ty+.01+uv[i][1]/16*(atlas.tileSize-.02))/atlas.height);
    colors.push(shade,shade,shade);tiles.push(face.tile);localUvs.push(uv[i][0]/16,1-uv[i][1]/16);
   }
  }
 }
 return {positions,uvs,colors,tiles,localUvs};
}
