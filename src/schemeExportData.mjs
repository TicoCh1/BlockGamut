import legacyIds from './legacyIds.mjs';

/** Export actual slot blocks in row order; empty slots contribute no values. */
export function exportSchemeCells(cells,format){
 const values=[],missing=[];
 for(const cell of cells){
  const id=cell.id||cell.block?.id;
  if(!id)continue;
  const value=format==='legacy'?legacyIds[id]?.[0]:format==='hex'?cell.block?.hex:id;
  if(value)values.push(value);else missing.push(id);
 }
 return {text:values.join('\n'),count:values.length,missing};
}
