import { h, cx, number } from './ui.js';
import { ema } from '../core/indicators.js';
import { clampViewport, indicatorWarmupBars, synchronizedSlice, isStalePrice } from '../core/chart-sync.js';

function pathFrom(values, xFor, yFor){
  let d='';
  values.forEach((v,i)=>{ if(v==null||!Number.isFinite(v))return; d += `${d?'L':'M'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)} `; });
  return d;
}
function activeConfig(state,id){return (state.indicators||[]).find(x=>x.id===id && x.visible!==false);}
function intervalDisplay(state){if(state.chartType==='Renko')return state.renkoMode==='pips'?`Renko ${state.renkoPips||10}p`:`Renko ${state.timeframe}`;if(state.chartType==='Range')return `Range ${state.rangePips||10}p`;return state.timeframe;}
function symbolOverlayText(state){const mode=state.symbolLabelMode||'compact';if(mode==='hidden')return '';if(mode==='symbol')return state.symbol;if(mode==='full')return `${state.symbol} · ${intervalDisplay(state)} · ${state.chartType} · FOREX`;return `${state.symbol} · ${intervalDisplay(state)}`;}
function indicatorOverlayText(cfg,value,state){const mode=state.indicatorLabelMode||'compact';if(mode==='hidden')return '';if(mode==='values')return number(value,2);const base=cfg.label||cfg.name||`EMA ${cfg.length}`;if(mode==='full')return `${base} ${cfg.source||'close'} ${number(value,2)}`;return `${base} ${number(value,2)}`;}

export function ChartSurface({bars, state, risk, actions}){
  if(!bars.length) return h('div',{className:'chart-empty'},'No chart data');
  const W=1200,H=640,left=12,right=90,top=4,bottom=68,volH=92;
  const chartBottom=H-bottom-volH;
  const viewport=clampViewport({totalBars:bars.length,visibleBars:state.chartVisibleBars||125,offsetBars:state.chartOffsetBars||0});
  const visible=bars.slice(viewport.start,viewport.end);
  if(!visible.length)return h('div',{className:'chart-empty'},'No visible chart data');

  // Indicators are calculated from the complete synchronized bar series, then sliced to the exact candle viewport.
  // This prevents the common "indicator flies away then catches up" problem when scrolling through history.
  const emaConfigs=(state.indicators||[]).filter(i=>i.visible!==false && i.kind==='ema');
  const emaSeries=emaConfigs.map(cfg=>{
    const fullSource=bars.map(b=>b[cfg.source||'close']??b.close);
    const fullValues=ema(fullSource,Math.max(1,Number(cfg.length)||20));
    return {cfg,values:synchronizedSlice(fullValues,viewport),last:fullValues[Math.max(0,viewport.end-1)]};
  });

  const scaleValues=[...visible.flatMap(b=>[b.low,b.high]),...emaSeries.flatMap(s=>s.values.filter(Number.isFinite))];
  if(state.riskToolActive)scaleValues.push(risk.stopLoss,risk.entry,risk.takeProfit);
  const rawMin=Math.min(...scaleValues),rawMax=Math.max(...scaleValues);
  const basePad=(rawMax-rawMin)*.08||1;
  const center=(rawMin+rawMax)/2;
  const baseHalf=(rawMax-rawMin)/2+basePad;
  const priceScale=Math.max(.25,Math.min(5,Number(state.chartPriceScale)||1));
  const lo=center-baseHalf*priceScale, hi=center+baseHalf*priceScale;

  const plotWidth=W-left-right;
  const rightSpacePct=Math.max(0,Math.min(55,Number(state.chartRightSpacePct)||22));
  const candleRight=(W-right)-plotWidth*(rightSpacePct/100);
  const candleWidth=Math.max(80,candleRight-left);
  const xStep=candleWidth/Math.max(visible.length,1);
  const x=i=>left+i*xStep+xStep/2;
  const y=p=>top+(hi-p)/(hi-lo)*(chartBottom-top);
  const volumeOn=!!activeConfig(state,'volume');
  const maxVol=Math.max(1,...visible.map(b=>b.volume||0));
  const entryY=y(risk.entry),slY=y(risk.stopLoss),tpY=y(risk.takeProfit);
  const tradeX=Math.max(left+20,candleRight-280), tradeW=Math.min(250,Math.max(150,candleRight-tradeX));

  const grid=[];
  for(let i=0;i<7;i++){
    const yy=top+(chartBottom-top)*i/6; const price=hi-(hi-lo)*i/6;
    grid.push(h('line',{key:`h${i}`,x1:left,y1:yy,x2:W-right,y2:yy,className:'gridline'}),h('text',{key:`t${i}`,x:W-right+12,y:yy+4,className:'axis-text'},number(price,2)));
  }
  for(let i=0;i<10;i++){ const xx=left+candleWidth*i/9; grid.push(h('line',{key:`v${i}`,x1:xx,y1:top,x2:xx,y2:H-bottom,className:'gridline vertical'})); }

  const candleEls=[];
  visible.forEach((b,i)=>{
    const up=b.close>=b.open; const xx=x(i); const openY=y(b.open),closeY=y(b.close),highY=y(b.high),lowY=y(b.low); const bodyY=Math.min(openY,closeY),bodyH=Math.max(1.6,Math.abs(closeY-openY));
    candleEls.push(h('line',{key:`w${viewport.start+i}`,x1:xx,y1:highY,x2:xx,y2:lowY,className:cx('wick',up?'up':'down')}));
    candleEls.push(h('rect',{key:`c${viewport.start+i}`,x:xx-Math.max(1.5,xStep*.28),y:bodyY,width:Math.max(3,xStep*.56),height:bodyH,rx:1,className:cx('candle',up?'up':'down')}));
  });
  const volEls=volumeOn?visible.map((b,i)=>{const hh=((b.volume||0)/maxVol)*(volH-24);return h('rect',{key:`vol${viewport.start+i}`,x:x(i)-Math.max(1,xStep*.25),y:H-bottom-hh,width:Math.max(2,xStep*.5),height:hh,className:cx('volume-bar',b.close>=b.open?'up':'down')});}):[];
  const last=visible[visible.length-1]; const lastY=y(last.close);

  const pointer=(e)=>{const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(1,r.width)*W,y:(e.clientY-r.top)/Math.max(1,r.height)*H};};
  const priceFromPointer=(e)=>{const p=pointer(e);const bounded=Math.max(top,Math.min(chartBottom,p.y));return hi-((bounded-top)/(chartBottom-top))*(hi-lo);};
  const onPointerDown=(e)=>{
    const p=pointer(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if(p.x>=W-right)actions.startChartGesture('price',e.clientX,e.clientY);
    else if(p.y>=chartBottom)actions.startChartGesture('time',e.clientX,e.clientY);
    else actions.startChartGesture('pan',e.clientX,e.clientY);
  };
  const onPointerMove=(e)=>{
    if(state.dragRiskLine){actions.updateRiskLine(state.dragRiskLine,+priceFromPointer(e).toFixed(state.symbol==='XAUUSD'?2:5));return;}
    if(state.chartGesture)actions.updateChartGesture(e.clientX,e.clientY);
  };
  const onPointerUp=()=>{if(state.dragRiskLine)actions.endRiskDrag();if(state.chartGesture)actions.endChartGesture();};
  const onWheel=(e)=>{e.preventDefault();actions.zoomChartWheel(e.deltaY);};
  const onDoubleClick=(e)=>{const p=pointer(e);if(p.x>=W-right)actions.resetPriceScale();else if(p.y>=chartBottom)actions.resetTimeScale();};

  const riskElements=state.riskToolActive?[
    h('rect',{key:'reward-zone',x:tradeX,y:Math.min(tpY,entryY),width:tradeW,height:Math.abs(entryY-tpY),className:'risk-zone reward'}),
    h('rect',{key:'loss-zone',x:tradeX,y:Math.min(entryY,slY),width:tradeW,height:Math.abs(slY-entryY),className:'risk-zone loss'}),
    lineWithTag(tradeX,tradeX+tradeW,tpY,'Take Profit (TP)',risk.takeProfit,'tp','takeProfit',actions),
    lineWithTag(tradeX,tradeX+tradeW,entryY,'Entry',risk.entry,'entry','entry',actions),
    lineWithTag(tradeX,tradeX+tradeW,slY,'Stop Loss (SL)',risk.stopLoss,'sl','stopLoss',actions),
    h('g',{key:'risk-summary',className:'risk-summary-svg'},h('rect',{x:tradeX,y:top+8,width:220,height:26,rx:6,className:'risk-summary-bg'}),h('text',{x:tradeX+10,y:top+25,className:'risk-summary-text'},`Risk ${number(risk.riskPercent,2)}% · ${number(risk.plan.riskAmount,2)} USD · ${number(risk.plan.lotSize,2)} lots · ${number(risk.plan.rewardRisk,2)}R`))
  ]:[];

  const age=Math.max(0,Date.now()-Number(state.lastTickAt||Date.now()));
  const stale=isStalePrice(state.lastTickAt,Date.now(),state.platformRules?.maxPriceAgeMs||2500);
  const warmup=indicatorWarmupBars(state.indicators||[]);

  return h('div',{className:'chart-shell'},
    (state.showSymbolOverlay!==false||state.showOHLCOverlay!==false||state.showLatencyOverlay!==false)?h('div',{className:'chart-head chart-overlay'},
      state.showSymbolOverlay!==false&&symbolOverlayText(state)?h('button',{className:'symbol-overlay overlay-action',onClick:actions.openSymbolSettings,title:'Open chart settings'},h('span',{className:'small-coin'},'◆'),h('strong',null,symbolOverlayText(state)),h('span',{className:'status-dot'})):null,
      state.showOHLCOverlay!==false?h('div',{className:'ohlc'},`O ${number(last.open,2)}  H ${number(last.high,2)}  L ${number(last.low,2)}  C ${number(last.close,2)}`):null,
      state.showLatencyOverlay!==false?h('div',{className:cx('latency-strip',stale&&'stale')},h('span',null,stale?'PRICE STALE':'SYNC'),h('b',null,`${state.feedLatencyMs??18} ms`),h('small',null,`age ${Math.round(age)} ms`)):null
    ):null,
    state.showIndicatorOverlay!==false&&state.indicatorLabelMode!=='hidden'&&emaSeries.length?h('div',{className:'legend chart-overlay'},...emaSeries.map(({cfg,last})=>h('button',{key:cfg.id,className:'indicator-overlay-item overlay-action',onClick:()=>actions.openIndicatorSettings(cfg.id),title:`Open ${cfg.label||cfg.name} settings`},h('span',{className:'indicator-mini-dot',style:{background:cfg.color||'#178eff'}}),h('b',{style:{color:cfg.color||'#178eff'}},indicatorOverlayText(cfg,last,state))))):null,
    h('div',{className:'chart-nav-controls'},
      !viewport.isLive?h('button',{className:'live-return',onClick:actions.goLive,title:'Return to current market'},'● LIVE'):null,
      h('button',{className:cx(state.chartFollow&&'active'),onClick:actions.toggleChartFollow,title:'Follow current price'},state.chartFollow?'FOLLOW':'FREE'),
      h('button',{onClick:actions.cycleRightSpace,title:'Change right-side chart space'},`SHIFT ${rightSpacePct}%`),
      h('button',{onClick:actions.resetChartNavigation,title:'Reset chart position and scale'},'RESET'),
      h('span',{className:'sync-badge',title:`Indicator warm-up reserve: ${warmup} bars`},`SYNC ✓ ${warmup}`)
    ),
    h('svg',{className:cx('chart-svg',state.riskToolActive&&'risk-editing',state.chartGesture&&`gesture-${state.chartGesture.type}`),viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none','data-price-lo':String(lo),'data-price-hi':String(hi),'data-chart-top':String(top),'data-chart-bottom':String(chartBottom),'data-chart-right':String(right)},
      h('rect',{x:left,y:top,width:W-left-right,height:chartBottom-top,className:'chart-hit-bg'}),
      ...grid,
      h('line',{x1:left,y1:chartBottom,x2:W-right,y2:chartBottom,className:'divider-line'}),
      ...volEls,
      volumeOn?h('text',{x:left+8,y:chartBottom+24,className:'volume-label'},'Volume  1.234K'):null,
      ...candleEls,
      ...emaSeries.map(({cfg,values})=>h('path',{key:cfg.id,d:pathFrom(values,x,y),className:'ema',style:{stroke:cfg.color||'#178eff',strokeWidth:String(cfg.lineWidth||1.5),opacity:String(cfg.opacity??1)}})),
      ...riskElements,
      h('line',{x1:left,y1:lastY,x2:W-right,y2:lastY,className:cx('current-line',stale&&'stale')}),
      h('rect',{x:W-right+1,y:lastY-17,width:88,height:34,rx:4,className:cx('price-pill-bg',stale&&'stale')}),
      h('text',{x:W-right+45,y:lastY-1,textAnchor:'middle',className:'price-pill'},number(last.close,2)),
      h('text',{x:W-right+45,y:lastY+13,textAnchor:'middle',className:'price-time'},stale?'STALE':'LIVE'),
      visible.length>6?marker(x(Math.floor(visible.length*.52)),y(visible[Math.floor(visible.length*.52)].high)-12,'Sell','sell'):null,
      visible.length>6?marker(x(Math.floor(visible.length*.58)),y(visible[Math.floor(visible.length*.58)].low)+24,'Buy','buy'):null,
      h('line',{x1:x(visible.length-1),y1:top,x2:x(visible.length-1),y2:H-bottom,className:'crosshair-line'}),
      h('line',{x1:left,y1:y((hi+lo)/2),x2:W-right,y2:y((hi+lo)/2),className:'crosshair-line horizontal'}),
      ...timeLabels(visible,x,H-bottom+32)
    ),
    h('div',{className:'chart-help-strip'},'Wheel: zoom · Drag chart: history · Drag price scale: vertical scale · Drag time scale: candle spacing · Double-click scale: reset')
  );
}
function lineWithTag(x1,x2,yy,label,price,type,key,actions){
  return h('g',{key:`risk-${key}`,className:'draggable-risk','data-risk-line':key},h('line',{x1,y1:yy,x2,y2:yy,className:`trade-line ${type}`}),h('rect',{x:x2-2,y:yy-15,width:150,height:30,rx:5,className:`trade-tag-bg ${type}`}),h('text',{x:x2+8,y:yy+5,className:'trade-tag-text'},`${label}  ${number(price,2)}`));
}
function marker(xx,yy,label,type){return h('g',null,h('polygon',{points:`${xx},${yy} ${xx-9},${yy+(type==='buy'?13:-13)} ${xx+9},${yy+(type==='buy'?13:-13)}`,className:`marker-triangle ${type}`}),h('rect',{x:xx-26,y:yy+(type==='buy'?13:-39),width:52,height:24,rx:5,className:`marker-bg ${type}`}),h('text',{x:xx,y:yy+(type==='buy'?30:-22),textAnchor:'middle',className:'marker-text'},label));}
function timeLabels(bars,x,y){const els=[]; const step=Math.max(1,Math.floor(bars.length/8));for(let i=0;i<bars.length;i+=step){const d=new Date(bars[i].time);els.push(h('text',{key:`time${i}`,x:x(i),y,textAnchor:'middle',className:'axis-text'},d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})));}return els;}
