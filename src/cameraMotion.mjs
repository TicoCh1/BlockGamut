export const FOCUS_MS=700;
/** Ease both the focal point and logarithmic orbit distance, preserving view angle. */
export function focusPose(camera,target,destination,distance,progress){
 const t=Math.max(0,Math.min(1,progress)),u=t*t*t*(t*(t*6-15)+10);
 const offset=camera.map((v,i)=>v-target[i]),radius=Math.hypot(...offset),direction=radius>1e-9?offset.map(v=>v/radius):[0,0,1];
 const nextTarget=target.map((v,i)=>v+(destination[i]-v)*u),nextRadius=Math.exp(Math.log(Math.max(radius,1e-6))*(1-u)+Math.log(distance)*u);
 return {target:nextTarget,camera:nextTarget.map((v,i)=>v+direction[i]*nextRadius),distance:nextRadius};
}
