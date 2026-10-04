import {linear,encode,toLab,fromLab,inGamut} from './color.mjs';

export const spaces=[
 {value:'oklab',label:'Oklab',description:'Perceptual lightness · green–red · blue–yellow',axes:['a · green–red','L · lightness','b · blue–yellow']},
 {value:'srgb',label:'sRGB',description:'Encoded red · green · blue',axes:['R','G','B']},
 {value:'linear',label:'Linear RGB',description:'Linear-light red · green · blue',axes:['Linear R','Linear G','Linear B']},
 {value:'hsv',label:'HSV',description:'Hue around the ring · saturation radius · value height',axes:['S · cos H','V · value','S · sin H']},
 {value:'hsl',label:'HSL',description:'Hue around the ring · saturation radius · lightness height',axes:['S · cos H','L · lightness','S · sin H']},
 {value:'hsl-bicone',label:'HSL bicone',description:'Hue around the ring · chroma radius · lightness height',axes:['C · cos H','L · lightness','C · sin H']},
 {value:'xyz',label:'CIE XYZ · D65',description:'Tristimulus coordinates · D65 white point',axes:['X / 0.9505','Y','Z / 1.0891']},
 {value:'lab',label:'CIELAB · D65',description:'CIE lightness and opponent axes · D65 reference white',axes:['a* · green–red','L* · lightness','b* · blue–yellow']},
];
// Fixed scales keep comparisons stable across filters. Values are never clipped.
export const varianceScales={oklab:[.12,.02,.02],srgb:[.25,.25,.25],linear:[.25,.25,.25],hsv:[1/12,.25,.25],hsl:[1/12,.25,.25],'hsl-bicone':[1/12,.25,.25],xyz:whiteScales(),lab:[2500,10000,10000]};
function whiteScales(){return [.9504559270516716**2/4,.25,1.0890577507598784**2/4];}
const axisOrder=space=>space==='oklab'||space==='lab'?[1,0,2]:space.startsWith('h')?[0,2,1]:[0,1,2];
export function axisLabels(space,variance=false){return variance?axisOrder(space).map(i=>coordinateLabels(space,true)[i]):spaces.find(s=>s.value===space).axes;}
export function hsv([r,g,b]){const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)/6);return [h,max?d/max:0,max];}
export function hsl(rgb){const [h,,v]=hsv(rgb),min=Math.min(...rgb),l=(v+min)/2,d=v-min;return [h,d?d/(1-Math.abs(2*l-1)):0,l];}
// W3C CSS Color 4 sRGB-to-XYZ matrix. CIELAB here deliberately retains D65;
// CSS lab() instead adapts to D50. This distinction is visible in the UI/export.
export function xyz(rgb){const [r,g,b]=rgb.map(linear);return [.4123907992659595*r+.35758433938387796*g+.1804807884018343*b,.21263900587151036*r+.7151686787677559*g+.07219231536073371*b,.01933081871559185*r+.11919477979462599*g+.9505321522496607*b];}
export const white=[.9504559270516716,1,1.0890577507598784];
export function cieLab(rgb){const f=xyz(rgb).map((v,i)=>{const t=v/white[i];return t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;});return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];}
export function coordinates(rgb,space,stats,variance=false){
 const lab=toLab(rgb);
 if(variance)return stats?.channelVariance?.[space]||(space==='oklab'?stats?.variance:null)||[0,0,0];
 if(space==='oklab')return lab;
 if(space==='hsv')return hsv(rgb);
 if(space==='hsl'||space==='hsl-bicone')return hsl(rgb);
 if(space==='xyz')return xyz(rgb);
 if(space==='lab')return cieLab(rgb);
 return space==='linear'?rgb.map(linear):rgb;
}
export function project(rgb,space,stats,variance=false){
 const c=coordinates(rgb,space,stats,variance);
 if(variance)return axisOrder(space).map(i=>c[i]/varianceScales[space][i]*2.6-1.3);
 if(space==='oklab')return [c[1]*2.6,(c[0]-.5)*2.6,c[2]*2.6];
 if(space==='lab')return [c[1]/100*1.3,(c[0]/100-.5)*2.6,c[2]/100*1.3];
 if(space.startsWith('h')){const radius=c[1]*1.3*(space==='hsl-bicone'?1-Math.abs(2*c[2]-1):1);return [Math.cos(c[0]*Math.PI*2)*radius,(c[2]-.5)*2.6,Math.sin(c[0]*Math.PI*2)*radius];}
 return c.map((v,i)=>((space==='xyz'?v/white[i]:v)-.5)*2.6);
}
export function coordinateLabels(space,variance=false){const labels=space==='oklab'?['L','a','b']:space==='lab'?['L*','a*','b*']:space==='hsv'?['H°','S','V']:space.startsWith('hsl')?['H°',variance&&space==='hsl-bicone'?'C':'S','L']:space==='xyz'?['X','Y','Z']:['R','G','B'];return variance?labels.map(v=>v==='H°'?'Var(H) · turns²':`Var(${v})`):labels;}

export function fromXYZ([x,y,z]){return [3.2409699419045226*x-1.537383177570094*y-.4986107602930034*z,-.9692436362808796*x+1.8759675015077202*y+.04155505740717559*z,.05563007969699366*x-.20397695888897652*y+1.0569715142428786*z].map(encode);}
export function fromHSV([h,s,v]){const k=n=>(n+h*6)%6;return [5,3,1].map(n=>v-v*s*Math.max(0,Math.min(k(n),4-k(n),1)));}
export function fromHSL([h,s,l]){const a=s*Math.min(l,1-l),k=n=>(n+h*12)%12;return [0,8,4].map(n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1)));}
/** Inverse of display coordinates. Null excludes points outside the sRGB gamut. */
export function unproject([x,y,z],space){
 let rgb;
 if(space==='oklab')rgb=fromLab([y/2.6+.5,x/2.6,z/2.6]);
 else if(space==='lab'){
  const L=(y/2.6+.5)*100,a=x/1.3*100,b=z/1.3*100,f=(L+16)/116;
  rgb=fromXYZ([f+a/500,f,f-b/200].map((v,i)=>(v>6/29?v**3:3*(6/29)**2*(v-4/29))*white[i]));
 }else if(space.startsWith('h')){
  const height=y/2.6+.5,radius=Math.hypot(x,z)/1.3,max=space==='hsl-bicone'?1-Math.abs(2*height-1):1;
  if(height<0||height>1||radius>max+1e-8)return null;
  const h=(Math.atan2(z,x)/Math.PI/2+1)%1,s=max>1e-9?radius/max:0;
  rgb=space==='hsv'?fromHSV([h,s,height]):fromHSL([h,s,height]);
 }else{const c=[x,y,z].map(v=>v/2.6+.5);rgb=space==='xyz'?fromXYZ(c.map((v,i)=>v*white[i])):space==='linear'?c.map(encode):c;}
 return inGamut(rgb)?rgb.map(v=>Math.max(0,Math.min(1,v))):null;
}
