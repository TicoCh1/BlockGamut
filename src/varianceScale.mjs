export const varianceFloor=1e-6;
export const logVariance=value=>Math.log1p(value/varianceFloor);
export const rawVariance=value=>Math.expm1(value)*varianceFloor;
export const formatLogVariance=value=>logVariance(value).toFixed(2);
/** Bins share the slider's logarithmic domain, including both endpoints. */
export function varianceHistogram(values,maximum,count=32){
 const bins=Array(count).fill(0),span=logVariance(maximum);
 for(const value of values)bins[span?Math.min(count-1,Math.floor(logVariance(value)/span*count)):0]++;
 return bins;
}
