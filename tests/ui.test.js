import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==null&&x!==false&&x!==undefined)})};
const { QuickTradeDock } = await import('../src/components/QuickTradeDock.js');
const { MobileDock } = await import('../src/components/MobileDock.js');
const { ChartSurface } = await import('../src/components/ChartSurface.js');
const { PlatformOps } = await import('../src/components/PlatformOps.js');
const { generateBars } = await import('../src/core/market.js');
const { DEMO_OWNER_ANALYTICS, DEMO_HEALTH } = await import('../src/core/platform-analytics.js');
const { DEFAULT_PLATFORM_RULES } = await import('../src/core/platform-rules.js');

function textOf(node){
  if(node==null)return '';
  if(typeof node==='string'||typeof node==='number')return String(node);
  return (node.children||[]).map(textOf).join(' ');
}
function countDataRiskLines(node){
  if(!node||typeof node!=='object')return 0;
  let n=node.props&&node.props['data-risk-line']?1:0;
  for(const c of node.children||[])n+=countDataRiskLines(c);
  return n;
}
const noop=()=>{};
const actions=new Proxy({}, {get:()=>noop});
const risk={entry:2431.8,stopLoss:2425.1,takeProfit:2444.2,riskPercent:2,plan:{lotSize:.15,riskAmount:200,rewardRisk:1.85}};

test('mobile Trade control toggles concept and quick strip can fully disappear',()=>{
  const state={tradePanelVisible:true,tradeSizingMode:'risk',riskPercent:2,quickLotSize:.15,connectionStatus:'live',platformMode:'normal',tradeDockPosition:'top-right',riskToolActive:false,mobileToolsOpen:false,indicatorsOpen:false,bottomTab:'positions',bottomOpen:false,mobileMenuOpen:false};
  const dock=MobileDock({state,actions});
  assert.match(textOf(dock),/Trade/);
  const strip=QuickTradeDock({state,actions,risk});
  assert.match(textOf(strip),/Risk %/);
  assert.match(textOf(strip),/SELL/);
  assert.equal(QuickTradeDock({state:{...state,tradePanelVisible:false},actions,risk}),null);
});

test('risk lines are clean by default and appear only in risk-edit mode',()=>{
  const bars=generateBars({count:80,start:2430,seed:10,stepMs:1000});
  const base={symbol:'XAUUSD',timeframe:'15s',indicators:[],riskToolActive:false,dragRiskLine:null};
  const clean=ChartSurface({bars,state:base,risk,actions});
  assert.equal(countDataRiskLines(clean),0);
  const edit=ChartSurface({bars,state:{...base,riskToolActive:true},risk,actions});
  assert.equal(countDataRiskLines(edit),3);
});

test('owner operations includes usage, health and backend rules surfaces',()=>{
  const state={opsTab:'overview',platformMode:'normal'};
  const view=PlatformOps({state,actions,analytics:DEMO_OWNER_ANALYTICS,health:DEMO_HEALTH,rules:DEFAULT_PLATFORM_RULES});
  const t=textOf(view);
  assert.match(t,/Users today/);
  assert.match(t,/Trading users/);
  assert.match(t,/Chart-only users/);
});

test('chart surface exposes professional navigation and synchronization controls',()=>{
  const bars=generateBars({count:400,start:2430,seed:11,stepMs:1000});
  const state={symbol:'XAUUSD',timeframe:'15s',indicators:[{id:'ema200',label:'EMA 200',kind:'ema',visible:true,length:200,source:'close'}],riskToolActive:false,dragRiskLine:null,chartVisibleBars:125,chartOffsetBars:80,chartPriceScale:1,chartRightSpacePct:22,chartFollow:false,chartGesture:null,lastTickAt:Date.now(),feedLatencyMs:18,platformRules:{maxPriceAgeMs:2500}};
  const view=ChartSurface({bars,state,risk,actions});
  const t=textOf(view);
  assert.match(t,/LIVE/);
  assert.match(t,/FREE/);
  assert.match(t,/SHIFT 22%/);
  assert.match(t,/RESET/);
  assert.match(t,/SYNC/);
});

test('chart metadata overlays can be hidden without changing chart geometry',()=>{
  const bars=generateBars({count:180,start:2430,seed:19,stepMs:1000});
  const base={symbol:'XAUUSD',timeframe:'15s',indicators:[{id:'ema20',label:'EMA 20',kind:'ema',visible:true,length:20,source:'close'}],riskToolActive:false,dragRiskLine:null,chartVisibleBars:125,chartOffsetBars:0,chartPriceScale:1,chartRightSpacePct:22,chartFollow:true,lastTickAt:Date.now(),feedLatencyMs:18,platformRules:{maxPriceAgeMs:2500}};
  const shown=textOf(ChartSurface({bars,state:base,risk,actions}));
  assert.match(shown,/XAUUSD/); assert.match(shown,/EMA 20/);
  const hidden=textOf(ChartSurface({bars,state:{...base,showSymbolOverlay:false,showIndicatorOverlay:false,showOHLCOverlay:false,showLatencyOverlay:false},risk,actions}));
  assert.doesNotMatch(hidden,/EMA 20 close/);
  assert.match(hidden,/FOLLOW/);
});
