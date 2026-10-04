/** Immutable version deltas share unchanged records across material releases. */
export function applyDelta(previous,delta){
 const result={...previous,...delta.set};for(const id of delta.remove)delete result[id];return result;
}
export function applySnapshot(previous,patch){return {
 catalog:applyDelta(previous?.catalog||{},patch.catalog),
 models:applyDelta(previous?.models||{},patch.models),
 animations:applyDelta(previous?.animations||{},patch.animations),
 meta:patch.meta,extra:patch.extra,
};}
export function releaseGroup(index,release){return index.groups.find(group=>group.id===release||group.releases.includes(release));}
export function snapshotChain(index,id){
 const result=[],seen=new Set();let group=releaseGroup(index,id);
 if(!group)throw Error(`Unknown Minecraft release: ${id}`);
 while(group){if(seen.has(group.id))throw Error('Cyclic release data');seen.add(group.id);result.unshift(group);group=group.base?releaseGroup(index,group.base):null;}
 return result;
}
const snapshots=new Map(),patches=new Map();
export async function loadSnapshot(index,id,json){
 const group=releaseGroup(index,id);if(!group)throw Error(`Unknown Minecraft release: ${id}`);
 if(snapshots.has(group.id))return snapshots.get(group.id);
 const chain=snapshotChain(index,id);
 // Fetch independent deltas together, then apply them chronologically.
 await Promise.all(chain.map(g=>{if(!patches.has(g.id))patches.set(g.id,json(`./versions/${g.patch}`).catch(error=>{patches.delete(g.id);throw error;}));return patches.get(g.id);}));
 let snapshot=null;
 for(const g of chain){if(snapshots.has(g.id))snapshot=snapshots.get(g.id);else{snapshot=applySnapshot(snapshot,await patches.get(g.id));snapshots.set(g.id,snapshot);}}
 return snapshot;
}
