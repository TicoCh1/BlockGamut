export interface Surface {channelVariance:Record<string,number[]>;mean:number[];variance:number[];covariance:number[][];mixture:{hex:string;weight:number}[];method:string}
export interface Block {chineseName?:string;previewTile?:number|null;englishName?:string;renderBounds?:{min:number[];max:number[];size:number[]};geometryClass?:string;inSet?:boolean;surface:Surface|null;id:string;name:string;hex:string|null;category:string;shape:string;alpha:number|null;faces:Record<string,string>;tint:string;tags:string;confidence:string;notes:string;textures:string[];assetFamily:string;assetKind:string;blockstate:string;modelSources:string[];modelParents:string[];renderStatus:string;renderNote:string;materialKey:string;colorSource:string;variants?:Block[]}
export interface Catalog {source:string;minecraftTarget:string;sourceTotal:number;total:number;colored:number;rendered:number;method:string;blocks:Block[];assetFamilies:Record<string,number>}
export interface Sample {block:Block;hex:string;rgb:number[];lab:number[];fallback:boolean}
export type Space = 'oklab'|'srgb'|'linear'|'hsv'|'hsl'|'hsl-bicone'|'xyz'|'lab';
export type Arrangement='spaced'|'packed'|'dense';
export interface VoxelSection {preview?:boolean;enabled:boolean;axis:'x'|'y'|'z'|'hue'|'radius';position:number;style:'cutaway'|'layer';flip:boolean}
export interface VoxelData {cells:number[][];indices:number[];pitch:number;origin:number;bounds:{min:number[];max:number[]};mode:Arrangement;space:Space;variance?:boolean;reserved:number}
