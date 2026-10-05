export function clampViewport({totalBars,visibleBars=125,offsetBars=0}={}){
  const total=Math.max(0,Number(totalBars)||0);
  const visible=Math.max(20,Math.min(Math.max(20,total||20),Math.round(Number(visibleBars)||125)));
  const maxOffset=Math.max(0,total-visible);
  const offset=Math.max(0,Math.min(maxOffset,Math.round(Number(offsetBars)||0)));
  const end=Math.max(0,total-offset);
  const start=Math.max(0,end-visible);
  return {start,end,visibleBars:visible,offsetBars:offset,isLive:offset===0};
}

export function indicatorWarmupBars(indicators=[]){
  let need=0;
  for(const i of indicators){
    if(i?.visible===false)continue;
    if(i?.kind==='ema'||i?.kind==='sma')need=Math.max(need,Number(i.length)||0);
    else if(i?.kind==='private')need=Math.max(need,Number(i.lookback)||600);
    else if(i?.kind==='study')need=Math.max(need,Number(i.length)||100);
  }
  return Math.max(need,50);
}

export function synchronizedSlice(series,viewport){
  return (series||[]).slice(viewport.start,viewport.end);
}

export function isStalePrice(lastTickAt,now=Date.now(),maxAgeMs=2500){
  return !Number(lastTickAt)||Number(now)-Number(lastTickAt)>Number(maxAgeMs);
}
