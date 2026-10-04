import Fuse from 'fuse.js';
import legacyIds from './legacyIds.mjs';

export const normalizeSearch=value=>String(value||'').normalize('NFKC').toLowerCase().trim().replace(/[\s_-]+/g,' ');
const cache=new WeakMap();
function editDistance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];}
/** One index per immutable catalog, shared across all filter combinations. */
export function createBlockSearch(blocks){
 const docs=blocks.map(block=>({block,id:normalizeSearch(block.id),shortId:normalizeSearch(block.id.replace(/^minecraft:/,'')),
  names:[...new Set([block.name,block.englishName,block.searchNames,...(block.searchNames?.match(/\p{Script=Han}+/gu)||[])].filter(Boolean).map(normalizeSearch))],
  legacy:legacyIds[block.id]||[],tags:normalizeSearch(block.tags),
  assets:[block.assetFamily,...(block.modelSources||[]),...(block.modelParents||[]),...(block.textures||[])].filter(Boolean).map(normalizeSearch)}));
 const options={includeScore:true,ignoreLocation:true,ignoreFieldNorm:true,threshold:.3,keys:[{name:'names',weight:4},{name:'shortId',weight:4},{name:'id',weight:2},{name:'tags',weight:1},{name:'assets',weight:.5}]};
 const fuse=new Fuse(docs,options),numeric=new Map();
 for(const d of docs)for(const alias of d.legacy)for(const key of [alias,alias.split(':')[0]]){const set=numeric.get(key)||new Set();set.add(d);numeric.set(key,set);}
 const tokensFor=query=>normalizeSearch(query).replace(/\s*:\s*/g,':').split(/\s+/).filter(Boolean);
 return query=>{
  const q=normalizeSearch(query).replace(/\s*:\s*/g,':');if(!q)return blocks;
  if(q.startsWith('minecraft:')){const exact=docs.find(d=>d.id===q);if(exact)return [exact.block];}
  const tokens=tokensFor(q),scores=new Map();
  for(const token of tokens){
   // Numeric identifiers are exact. A bare ID includes its historical metadata.
   const found=/^\d+(?::\d+)?$/.test(token)
    ? [...(numeric.get(token)||[])].map(item=>({item,score:0}))
    : fuse.search(token,{limit:blocks.length}).filter(r=>token.length>2||[r.item.id,r.item.shortId,...r.item.names,r.item.tags,...r.item.assets].some(v=>v.includes(token)));
   const current=new Map(found.map(r=>[r.item,(r.score||0)]));
   if(!scores.size&&token===tokens[0]){for(const [d,score] of current)scores.set(d,score);}
   else for(const [d,score] of scores){if(!current.has(d))scores.delete(d);else scores.set(d,score+current.get(d));}
   if(!scores.size)return [];
  }
  const rank=d=>[d.id,d.shortId,...d.names].includes(q)?0:[d.id,d.shortId,...d.names].some(v=>v.includes(q))?1:2;
  // Fuse substring scores can tie for Chinese prefixes. Prefer the closest full
  // name before alphabetical order (e.g. a one-character typo in 云杉木板).
  const nameDistance=new Map([...scores.keys()].map(d=>[d,Math.min(...d.names.map(n=>editDistance(q,n)))]));
  return [...scores].sort(([a,sa],[b,sb])=>rank(a)-rank(b)||sa-sb||nameDistance.get(a)-nameDistance.get(b)||a.block.id.localeCompare(b.block.id)).map(([d])=>d.block);
 };
}
export function searchBlocks(blocks,query){if(!query.trim())return blocks;let search=cache.get(blocks);if(!search){search=createBlockSearch(blocks);cache.set(blocks,search);}return search(query);}
