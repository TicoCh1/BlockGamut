import {buildVoxels} from './voxels.mjs';
import {planTransition} from './motion.mjs';
self.onmessage=({data})=>{try{
 const grid=buildVoxels(data.samples,data.space,data.mode||'spaced',data.variance);
 const plan=data.before?planTransition(data.before,{samples:data.samples,grid}):null;
 self.postMessage({id:data.id,...grid,plan});
}catch(error){self.postMessage({id:data.id,error:String(error)});}};
