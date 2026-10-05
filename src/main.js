import { TopBar } from './components/TopBar.js';
import { LeftToolbar } from './components/LeftToolbar.js';
import { RightSidebar } from './components/RightSidebar.js';
import { BottomPanel } from './components/BottomPanel.js';
import { TradeCalculator } from './components/TradeCalculator.js';
import { QuickTradeDock } from './components/QuickTradeDock.js';
import { TradeTicket } from './components/TradeTicket.js';
import { ChartSurface } from './components/ChartSurface.js';
import { MobileDock } from './components/MobileDock.js';
import { h, cx, number } from './components/ui.js';
import { SYMBOLS, generateBars, toHeikinAshi, buildRenko, buildRangeBars } from './core/market.js';
import { calculateRiskPlan, clampRiskPercent } from './core/risk.js';
import { computeTradeAnalytics } from './core/analytics.js';
import { MockBrokerAdapter } from './services/broker.js';
import { TIMEFRAME_GROUPS, RENKO_PIP_SIZES, RANGE_PIP_SIZES, DEFAULT_FAVORITES, timeframeToMs, normalizeCustomTimeframe, toggleFavorite, intervalKey, parseIntervalSpec, intervalLabel } from './core/timeframes.js';
import { PlatformOps } from './components/PlatformOps.js';
import { DEFAULT_PLATFORM_RULES, validateTradeRequest } from './core/platform-rules.js';
import { DEMO_OWNER_ANALYTICS, DEMO_HEALTH } from './core/platform-analytics.js';
import { scanIndicatorSource, applyIndicatorSecurityStrike, INDICATOR_SECURITY_POLICY } from './core/indicator-security.js';
import { DEFAULT_RETENTION_POLICY, drawingRetentionLabel } from './core/retention.js';
import { DEFAULT_FAILOVER_POLICY, DEMO_FAILOVER_STATE } from './core/failover.js';
import { clampViewport } from './core/chart-sync.js';
import { DEFAULT_AI_POLICY, canUseAI, validateAIRequest } from './core/ai-policy.js';
import { DEFAULT_MONETIZATION_POLICY, PLAN_CATALOG, planFor, shouldShowPromotion } from './core/entitlements.js';

const DEFAULT_INDICATORS=[
  {id:'ema20',name:'EMA 20',label:'EMA 20',kind:'ema',visible:true,length:20,source:'close',color:'#178eff',lineWidth:1.5,opacity:1,pane:'main',timeframeVisibility:'All'},
  {id:'ema50',name:'EMA 50',label:'EMA 50',kind:'ema',visible:true,length:50,source:'close',color:'#f1a51a',lineWidth:1.5,opacity:1,pane:'main',timeframeVisibility:'All'},
  {id:'volume',name:'Volume',label:'Volume',kind:'volume',visible:true,color:'#16c7bb',opacity:.72,pane:'bottom',timeframeVisibility:'All'},
  {id:'henry-private',name:'Henry Private Indicator',label:'Henry Private Indicator',kind:'private',visible:false,color:'#9a7cff',lineWidth:2,opacity:1,pane:'main',timeframeVisibility:'All',locked:true}
];
const demoTrades=[{pnl:95},{pnl:-40},{pnl:130},{pnl:60},{pnl:-55},{pnl:220},{pnl:-75},{pnl:45},{pnl:85},{pnl:-35},{pnl:110},{pnl:-20}];

class TradeAvataApp extends React.Component {
  constructor(props){
    super(props);
    this.broker = new MockBrokerAdapter();
    this.installPrompt = null;
    this.activeChartGesture = null;
    this.nativeChartSvg = null;
    const saved = this.readSettings();
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 720;
    const savedIndicators=Array.isArray(saved.indicators)&&saved.indicators.length?saved.indicators:DEFAULT_INDICATORS;
    const savedFavorites=Array.isArray(saved.favoriteTimeframes)&&saved.favoriteTimeframes.length?saved.favoriteTimeframes:DEFAULT_FAVORITES;
    const initialSymbol=saved.symbol||'XAUUSD';
    const initialRiskSetup=saved.riskSetup||this.defaultRiskSetup(initialSymbol);
    this.state={
      symbol:initialSymbol, timeframe:saved.timeframe||'5m', chartType:saved.chartType||'Candles', renkoMode:saved.renkoMode||'time', renkoPips:Number(saved.renkoPips)||10, rangePips:Number(saved.rangePips)||10, intervalMenuTab:'time', activeTool:'cursor',
      rightOpen:typeof saved.rightOpen==='boolean'?saved.rightOpen:!mobile, bottomOpen:typeof saved.bottomOpen==='boolean'?saved.bottomOpen:!mobile, bottomTab:'positions', utility:'watchlist',
      indicatorsOpen:false, settingsOpen:false, calculatorOpen:!mobile, theme:saved.theme||'dark', layout:saved.layout||'1',
      mobileToolsOpen:false, mobileMenuOpen:false, mobileSymbolOpen:false, timeframeMenuOpen:false, customTimeframeValue:'12', customTimeframeUnit:'s', favoriteTimeframes:savedFavorites, privateIndicatorEditorOpen:false, privateIndicatorDraft:{name:'',visibility:'Owner only',code:''}, indicatorSettingsId:null, indicators:savedIndicators, indicatorsHiddenAll:!!saved.indicatorsHiddenAll, screenshotOpen:false,
      replayPlaying:false,replaySpeed:1,replayIndex:120, alerts:[{id:1,type:'price',label:'XAUUSD crosses 2440'}],
      history:[], redoStack:[], positions:[], orders:[], tradeTicketOpen:false, positionToolsId:null, positionEditDraft:null, selectedPositionIds:[], bulkPositionMenuOpen:false, bulkCloseConfirm:null,
      ticket:{type:'Market',side:'Buy',riskPercent:1,entry:2431.80,stopLoss:2425.10,tp1:2444.20,tp1Pct:50,tp2:2450,tp2Pct:30,tp3:2456,tp3Pct:20,breakEven:true,trailing:false,trailDistance:2},
      account:{equity:10013.65,balance:10000,marginUsed:243.18,unrealized:13.65,latency:12,server:'London'},
      bars:[], installAvailable:false, toast:'', riskPercent:saved.riskPercent||1, quickLotManual:!!saved.quickLotManual, quickLotSize:Number(saved.quickLotSize)||0.15, connectionStatus:'connecting', candleUp:saved.candleUp||'#13d4be', candleDown:saved.candleDown||'#ff6d51', chartBg:saved.chartBg||'#06101a', workspaces:this.readWorkspaces(),
      tradePanelVisible:typeof saved.tradePanelVisible==='boolean'?saved.tradePanelVisible:true, tradeSizingMode:saved.tradeSizingMode||'risk', tradeDockPosition:saved.tradeDockPosition||'top-right', riskToolActive:false, dragRiskLine:null,
      riskSetup:initialRiskSetup,
      platformOpsOpen:false,opsTab:'overview',platformMode:'normal',healthSnapshot:DEMO_HEALTH,platformRules:DEFAULT_PLATFORM_RULES,
      currentRole:'owner', indicatorSecurityPolicy:INDICATOR_SECURITY_POLICY, indicatorBuildReport:null, indicatorUploadStrikes:0, indicatorUploadBlocked:false,
      retentionPolicy:{...DEFAULT_RETENTION_POLICY,...(saved.retentionPolicy||{})}, retentionNoticeOpen:false,
      failoverPolicy:DEFAULT_FAILOVER_POLICY, failoverState:{...DEMO_FAILOVER_STATE},
      chartVisibleBars:Number(saved.chartVisibleBars)||125, chartOffsetBars:Number(saved.chartOffsetBars)||0, chartPriceScale:Number(saved.chartPriceScale)||1,
      chartRightSpacePct:Number(saved.chartRightSpacePct)||22, chartFollow:typeof saved.chartFollow==='boolean'?saved.chartFollow:true, chartGesture:null,
      lastTickAt:Date.now(), feedLatencyMs:18, orderRouteLatencyMs:42,
      // 0.5 UI/appearance: chart metadata floats over the price canvas instead of pushing candles down.
      showSymbolOverlay:typeof saved.showSymbolOverlay==='boolean'?saved.showSymbolOverlay:true,
      showIndicatorOverlay:typeof saved.showIndicatorOverlay==='boolean'?saved.showIndicatorOverlay:true,
      showOHLCOverlay:typeof saved.showOHLCOverlay==='boolean'?saved.showOHLCOverlay:true,
      showLatencyOverlay:typeof saved.showLatencyOverlay==='boolean'?saved.showLatencyOverlay:true,
      symbolLabelMode:saved.symbolLabelMode||'compact', indicatorLabelMode:saved.indicatorLabelMode||'compact',
      candleWickUp:saved.candleWickUp||saved.candleUp||'#13d4be', candleWickDown:saved.candleWickDown||saved.candleDown||'#ff6d51',
      candleBorderUp:saved.candleBorderUp||saved.candleUp||'#13d4be', candleBorderDown:saved.candleBorderDown||saved.candleDown||'#ff6d51',
      gridColor:saved.gridColor||'#14283a', axisTextColor:saved.axisTextColor||'#8098ae', crosshairColor:saved.crosshairColor||'#90a4b7',
      volumeUp:saved.volumeUp||'#108c87', volumeDown:saved.volumeDown||'#a9464c', currentPriceColor:saved.currentPriceColor||'#14bca9',
      aiPolicy:{...DEFAULT_AI_POLICY,...(saved.aiPolicy||{})}, aiOpen:false, aiPrompt:'', aiMessages:[], aiUsage:{minute:0,daily:0,lastMinute:Date.now()},
      monetizationPolicy:{...DEFAULT_MONETIZATION_POLICY,...(saved.monetizationPolicy||{})}, currentPlan:saved.currentPlan||'owner', promotionDismissed:false,
      tutorialDismissed:true
    };
  }
  componentDidMount(){
    this.loadSymbol(this.state.symbol,this.state.timeframe);
    this.broker.connect().then(()=>Promise.all([this.broker.positions(),this.broker.orders(),this.broker.account()])).then(([positions,orders,account])=>this.setState({positions,orders,account,connectionStatus:'live'})).catch(()=>this.setState({connectionStatus:'offline'}));
    window.addEventListener('beforeinstallprompt', this.onInstallPrompt);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
    this.applyThemeMode(this.state.theme);
    this.applyChartColors();
    this.bindNativeChartEvents();
    this.timer=setInterval(()=>this.simulateTick(),1600);
  }
  componentWillUnmount(){clearInterval(this.timer);window.removeEventListener('beforeinstallprompt',this.onInstallPrompt);this._themeMedia?.removeEventListener?.('change',this._onSystemTheme);this.unbindNativeChartEvents();}
  onInstallPrompt=(e)=>{e.preventDefault();this.installPrompt=e;this.setState({installAvailable:true});}
  readSettings(){try{return JSON.parse(localStorage.getItem('tac-settings')||'{}');}catch{return {};}}
  readWorkspaces(){try{return JSON.parse(localStorage.getItem('tac-workspaces')||'[]');}catch{return [];} }
  applyThemeMode(mode=this.state.theme){
    const resolved=mode==='system'?(window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark'):(mode==='custom'?'dark':mode);
    document.documentElement.dataset.theme=resolved;
    if(mode==='system' && window.matchMedia){this._themeMedia=window.matchMedia('(prefers-color-scheme: light)');this._onSystemTheme=()=>this.applyThemeMode('system');this._themeMedia.removeEventListener?.('change',this._onSystemTheme);this._themeMedia.addEventListener?.('change',this._onSystemTheme);}
  }
  applyChartColors(){const r=document.documentElement.style;const v=(k,d)=>this.state[k]||d;r.setProperty('--candle-up',v('candleUp','#13d4be'));r.setProperty('--candle-down',v('candleDown','#ff6d51'));r.setProperty('--wick-up',v('candleWickUp',v('candleUp','#13d4be')));r.setProperty('--wick-down',v('candleWickDown',v('candleDown','#ff6d51')));r.setProperty('--border-up',v('candleBorderUp',v('candleUp','#13d4be')));r.setProperty('--border-down',v('candleBorderDown',v('candleDown','#ff6d51')));r.setProperty('--chart-bg',v('chartBg','#06101a'));r.setProperty('--grid-color',v('gridColor','#14283a'));r.setProperty('--axis-text-color',v('axisTextColor','#8098ae'));r.setProperty('--crosshair-color',v('crosshairColor','#90a4b7'));r.setProperty('--volume-up',v('volumeUp','#108c87'));r.setProperty('--volume-down',v('volumeDown','#a9464c'));r.setProperty('--current-price-color',v('currentPriceColor','#14bca9'));}
  persist(next=this.state){try{localStorage.setItem('tac-settings',JSON.stringify({symbol:next.symbol,timeframe:next.timeframe,chartType:next.chartType,renkoMode:next.renkoMode,renkoPips:next.renkoPips,rangePips:next.rangePips,rightOpen:next.rightOpen,bottomOpen:next.bottomOpen,theme:next.theme,layout:next.layout,riskPercent:next.riskPercent,candleUp:next.candleUp,candleDown:next.candleDown,candleWickUp:next.candleWickUp,candleWickDown:next.candleWickDown,candleBorderUp:next.candleBorderUp,candleBorderDown:next.candleBorderDown,chartBg:next.chartBg,gridColor:next.gridColor,axisTextColor:next.axisTextColor,crosshairColor:next.crosshairColor,volumeUp:next.volumeUp,volumeDown:next.volumeDown,currentPriceColor:next.currentPriceColor,showSymbolOverlay:next.showSymbolOverlay,showIndicatorOverlay:next.showIndicatorOverlay,showOHLCOverlay:next.showOHLCOverlay,showLatencyOverlay:next.showLatencyOverlay,symbolLabelMode:next.symbolLabelMode,indicatorLabelMode:next.indicatorLabelMode,favoriteTimeframes:next.favoriteTimeframes,indicators:next.indicators,indicatorsHiddenAll:next.indicatorsHiddenAll,quickLotManual:next.quickLotManual,quickLotSize:next.quickLotSize,tradePanelVisible:next.tradePanelVisible,tradeSizingMode:next.tradeSizingMode,tradeDockPosition:next.tradeDockPosition,riskSetup:next.riskSetup,retentionPolicy:next.retentionPolicy,chartVisibleBars:next.chartVisibleBars,chartOffsetBars:next.chartOffsetBars,chartPriceScale:next.chartPriceScale,chartRightSpacePct:next.chartRightSpacePct,chartFollow:next.chartFollow,aiPolicy:next.aiPolicy,monetizationPolicy:next.monetizationPolicy,currentPlan:next.currentPlan}));}catch{ /* storage may be unavailable in preview/private contexts */ }}
  makeBars(symbol,timeframe){
    const s=SYMBOLS.find(x=>x.symbol===symbol)||SYMBOLS[0]; const step=timeframeToMs(timeframe); const raw=generateBars({count:1400,start:s.last-(symbol==='XAUUSD'?8:s.last*.003),seed:symbol.split('').reduce((a,c)=>a+c.charCodeAt(0),0)+step%997,stepMs:step});
    const diff=s.last-raw[raw.length-1].close; return raw.map(b=>({...b,open:b.open+diff,high:b.high+diff,low:b.low+diff,close:b.close+diff}));
  }
  loadSymbol(symbol,timeframe=this.state.timeframe){const bars=this.makeBars(symbol,timeframe);this.setState({bars,replayIndex:Math.max(50,bars.length-30)});}
  transformedBars(){
    const {bars,chartType}=this.state; if(chartType==='Heikin-Ashi') return toHeikinAshi(bars); if(chartType==='Renko'){const sym=SYMBOLS.find(x=>x.symbol===this.state.symbol)||SYMBOLS[0];const brick=this.state.renkoMode==='pips'?Math.max(sym.pipSize,Number(this.state.renkoPips||10)*sym.pipSize):Math.max(sym.pipSize,1.5);return buildRenko(bars,brick);} if(chartType==='Range'){const sym=SYMBOLS.find(x=>x.symbol===this.state.symbol)||SYMBOLS[0];const range=Math.max(sym.pipSize,Number(this.state.rangePips||10)*sym.pipSize);return buildRangeBars(bars,range);} return bars;
  }
  currentBars(){const bars=this.transformedBars();return this.state.bottomTab==='replay' ? bars.slice(0,Math.min(this.state.replayIndex+1,bars.length)) : bars;}
  defaultRiskSetup(symbol=this.state.symbol){
    const s=SYMBOLS.find(x=>x.symbol===symbol)||SYMBOLS[0];const entry=s.last-0.91;return {entry:+entry.toFixed(symbol==='XAUUSD'?2:5),stopLoss:+(entry-(symbol==='XAUUSD'?6.7:s.pipSize*67)).toFixed(symbol==='XAUUSD'?2:5),takeProfit:+(entry+(symbol==='XAUUSD'?12.4:s.pipSize*124)).toFixed(symbol==='XAUUSD'?2:5)};
  }
  riskModel(){
    const s=SYMBOLS.find(x=>x.symbol===this.state.symbol)||SYMBOLS[0]; const setup=this.state.riskSetup||this.defaultRiskSetup(this.state.symbol);const {entry,stopLoss,takeProfit}=setup;
    return {equity:this.state.account.balance||10000,riskPercent:this.state.riskPercent,entry,stopLoss,takeProfit,plan:calculateRiskPlan({equity:this.state.account.balance||10000,riskPercent:this.state.riskPercent,entry,stopLoss,takeProfit,pipSize:s.pipSize,pipValuePerLot:s.pipValuePerLot})};
  }
  ticketRiskModel(){const s=SYMBOLS.find(x=>x.symbol===this.state.symbol)||SYMBOLS[0];const t=this.state.ticket;return {equity:this.state.account.balance||10000,riskPercent:t.riskPercent,entry:t.entry,stopLoss:t.stopLoss,takeProfit:t.tp1,plan:calculateRiskPlan({equity:this.state.account.balance||10000,riskPercent:t.riskPercent,entry:t.entry,stopLoss:t.stopLoss,takeProfit:t.tp1,pipSize:s.pipSize,pipValuePerLot:s.pipValuePerLot})};}
  simulateTick(){
    if(this.state.replayPlaying){this.setState(s=>({replayIndex:Math.min(s.bars.length-1,s.replayIndex+Math.max(1,s.replaySpeed))}));return;}
    this.setState(s=>{if(!s.bars.length)return null;const bars=s.bars.slice();const last={...bars[bars.length-1]};const drift=(Math.random()-.48)*.35;last.close=Math.max(last.low,Math.min(last.high+0.4,last.close+drift));last.high=Math.max(last.high,last.close);last.low=Math.min(last.low,last.close);bars[bars.length-1]=last;return{bars,lastTickAt:Date.now(),feedLatencyMs:Math.max(4,Math.round(12+Math.random()*18)),orderRouteLatencyMs:Math.max(10,Math.round(28+Math.random()*34))};});
  }
  pushHistory(action){this.setState(s=>({history:[...s.history,{action,state:{activeTool:s.activeTool,chartType:s.chartType}}].slice(-30),redoStack:[]}));}
  toast=(msg)=>{this.setState({toast:msg});clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.setState({toast:''}),2200);}
  setTimeframe=(timeframe)=>this.setIntervalSpec(intervalKey('time',timeframe));
  setIntervalSpec=(spec)=>{const parsed=parseIntervalSpec(spec);this.pushHistory('interval');const patch={timeframeMenuOpen:false};if(parsed.kind==='renko-time'){patch.chartType='Renko';patch.renkoMode='time';patch.timeframe=parsed.value;}else if(parsed.kind==='renko-pips'){patch.chartType='Renko';patch.renkoMode='pips';patch.renkoPips=Math.max(1,Number(parsed.value)||1);patch.timeframe='1s';}else if(parsed.kind==='range-pips'){patch.chartType='Range';patch.rangePips=Math.max(1,Number(parsed.value)||1);patch.timeframe='1s';}else{patch.timeframe=parsed.value;if(['Renko','Range'].includes(this.state.chartType))patch.chartType='Candles';}this.setState(patch,()=>{this.loadSymbol(this.state.symbol,this.state.timeframe);this.persist();this.toast(`${intervalLabel(spec)} active`);});};
  toggleTimeframeMenu=()=>this.setState(s=>({timeframeMenuOpen:!s.timeframeMenuOpen,indicatorsOpen:false,mobileMenuOpen:false,mobileToolsOpen:false}));
  setIntervalMenuTab=(intervalMenuTab)=>this.setState({intervalMenuTab});
  toggleFavoriteTimeframe=(timeframe)=>this.toggleFavoriteInterval(intervalKey('time',timeframe));
  toggleFavoriteInterval=(spec)=>this.setState(s=>({favoriteTimeframes:toggleFavorite(s.favoriteTimeframes,spec)}),()=>this.persist());
  setCustomTimeframe=(key,value)=>this.setState({[key]:value});
  addCustomTimeframe=()=>{const tf=normalizeCustomTimeframe(this.state.customTimeframeValue,this.state.customTimeframeUnit);const spec=intervalKey('time',tf);this.setState(s=>({favoriteTimeframes:s.favoriteTimeframes.includes(spec)?s.favoriteTimeframes:toggleFavorite(s.favoriteTimeframes,spec),timeframe:tf,chartType:['Renko','Range'].includes(s.chartType)?'Candles':s.chartType,timeframeMenuOpen:false}),()=>{this.loadSymbol(this.state.symbol,tf);this.persist();this.toast(`${tf} added to favourites`);});};
  selectSymbol=(symbol)=>{this.pushHistory('symbol');this.setState({symbol,timeframeMenuOpen:false,riskSetup:this.defaultRiskSetup(symbol)},()=>{this.loadSymbol(symbol);this.persist();});}
  cycleChartType=()=>{const types=['Candles','Heikin-Ashi','Renko','Range'];const i=(types.indexOf(this.state.chartType)+1)%types.length;this.pushHistory('chart-type');this.setState({chartType:types[i]},()=>this.persist());}
  selectTool=(activeTool)=>{this.pushHistory('tool');const drawingTools=new Set(['trend','horizontal','rectangle','fibonacci','text','risk','measure']);let showRetention=false;if(drawingTools.has(activeTool)){try{showRetention=!localStorage.getItem('ta-drawing-retention-notice');if(showRetention)localStorage.setItem('ta-drawing-retention-notice','shown');}catch{showRetention=false;}}this.setState({activeTool,mobileToolsOpen:false,retentionNoticeOpen:showRetention||this.state.retentionNoticeOpen}); if(activeTool==='risk')this.setState({calculatorOpen:true});}
  toggleRight=()=>this.setState(s=>({rightOpen:!s.rightOpen}),()=>this.persist());
  toggleBottom=()=>this.setState(s=>({bottomOpen:!s.bottomOpen}),()=>this.persist());
  openBottom=(bottomTab)=>this.setState({bottomTab,bottomOpen:true});
  setUtility=(utility)=>{if(utility==='watchlist')this.setState({utility,rightOpen:true});else if(utility==='alerts')this.openBottom('alerts');else if(utility==='settings')this.setState({utility,settingsOpen:true});else if(utility==='ops')this.setState({utility,platformOpsOpen:true,opsTab:'overview'});else this.setState({utility},()=>this.toast(`${utility[0].toUpperCase()+utility.slice(1)} panel is ready for the next module.`));}
  toggleWatchlist=()=>{if(typeof window!=='undefined'&&window.innerWidth<=720)this.setState(s=>({mobileSymbolOpen:!s.mobileSymbolOpen,mobileMenuOpen:false,mobileToolsOpen:false,timeframeMenuOpen:false,screenshotOpen:false}));else this.setState(s=>({rightOpen:!s.rightOpen,timeframeMenuOpen:false,screenshotOpen:false}));};
  openSymbolSettings=()=>{if(typeof window!=='undefined'&&window.innerWidth<=720){this.toggleWatchlist();return;}this.setState({settingsOpen:true,timeframeMenuOpen:false,indicatorsOpen:false});};
  setLabelMode=(key,value)=>this.setState({[key]:value},()=>this.persist());
  toggleMobileTools=()=>this.setState(s=>({mobileToolsOpen:!s.mobileToolsOpen,mobileMenuOpen:false,mobileSymbolOpen:false,timeframeMenuOpen:false,screenshotOpen:false,indicatorsOpen:false}));
  toggleMobileMenu=()=>this.setState(s=>({mobileMenuOpen:!s.mobileMenuOpen,mobileToolsOpen:false,mobileSymbolOpen:false,timeframeMenuOpen:false,screenshotOpen:false,indicatorsOpen:false}));
  toggleIndicators=()=>this.setState(s=>({indicatorsOpen:!s.indicatorsOpen,mobileToolsOpen:false,mobileMenuOpen:false,mobileSymbolOpen:false,timeframeMenuOpen:false,screenshotOpen:false}));
  toggleSettings=()=>this.setState(s=>({settingsOpen:!s.settingsOpen,mobileMenuOpen:false,timeframeMenuOpen:false}));
  toggleTradePanel=()=>this.setState(s=>({tradePanelVisible:!s.tradePanelVisible,tradeTicketOpen:false,riskToolActive:s.tradePanelVisible?false:s.riskToolActive,dragRiskLine:null}),()=>this.persist());
  toggleTradeSizingMode=()=>this.setState(s=>({tradeSizingMode:s.tradeSizingMode==='risk'?'lots':'risk'}),()=>this.persist());
  cycleTradeDockPosition=()=>this.setState(s=>{const a=['top-right','bottom-center','top-left'];const i=(a.indexOf(s.tradeDockPosition)+1)%a.length;return{tradeDockPosition:a[i]};},()=>this.persist());
  toggleRiskTool=()=>this.setState(s=>({riskToolActive:!s.riskToolActive,activeTool:!s.riskToolActive?'risk':s.activeTool,dragRiskLine:null}),()=>{if(this.state.riskToolActive)this.toast('Risk lines enabled — drag Entry, SL or TP on the chart.');});
  startRiskDrag=(line)=>this.setState({dragRiskLine:line,riskToolActive:true});
  updateRiskLine=(line,price)=>this.setState(s=>({riskSetup:{...s.riskSetup,[line]:price}}));
  endRiskDrag=()=>this.setState({dragRiskLine:null},()=>this.persist());
  startChartGesture=(type,x,y)=>{const g={type,startX:x,startY:y,baseOffset:this.state.chartOffsetBars,baseScale:this.state.chartPriceScale,baseVisible:this.state.chartVisibleBars};this.activeChartGesture=g;this.setState({chartGesture:g});};
  updateChartGesture=(x,y)=>this.setState(s=>{
    const g=this.activeChartGesture||s.chartGesture;if(!g)return null;
    const dx=x-g.startX,dy=y-g.startY;
    if(g.type==='pan'){
      const barsPerPx=Math.max(.02,g.baseVisible/900);
      const offset=Math.max(0,Math.round(g.baseOffset+dx*barsPerPx));
      return {chartOffsetBars:offset,chartFollow:offset===0?s.chartFollow:false};
    }
    if(g.type==='price')return {chartPriceScale:Math.max(.25,Math.min(5,g.baseScale*Math.exp(dy/260)))};
    if(g.type==='time')return {chartVisibleBars:Math.max(25,Math.min(420,Math.round(g.baseVisible*Math.exp(dx/420))))};
    return null;
  });
  endChartGesture=()=>{this.activeChartGesture=null;this.setState({chartGesture:null},()=>this.persist());};
  zoomChartWheel=(deltaY)=>this.setState(s=>({chartVisibleBars:Math.max(25,Math.min(420,Math.round(s.chartVisibleBars*(deltaY>0?1.11:.90))))}),()=>this.persist());
  goLive=()=>this.setState({chartOffsetBars:0,chartFollow:true},()=>this.persist());
  toggleChartFollow=()=>this.setState(s=>({chartFollow:!s.chartFollow,chartOffsetBars:!s.chartFollow?0:s.chartOffsetBars}),()=>this.persist());
  cycleRightSpace=()=>this.setState(s=>{const vals=[10,18,22,30,40,50];const i=(vals.indexOf(Number(s.chartRightSpacePct))+1)%vals.length;return{chartRightSpacePct:vals[i]};},()=>this.persist());
  resetPriceScale=()=>this.setState({chartPriceScale:1},()=>this.persist());
  resetTimeScale=()=>this.setState({chartVisibleBars:125},()=>this.persist());
  resetChartNavigation=()=>this.setState({chartVisibleBars:125,chartOffsetBars:0,chartPriceScale:1,chartRightSpacePct:22,chartFollow:true,chartGesture:null},()=>this.persist());
  closeRetentionNotice=()=>this.setState({retentionNoticeOpen:false});
  setDrawingRetention=(days)=>this.setState(s=>({retentionPolicy:{...s.retentionPolicy,drawingsDays:Number(days)}}),()=>{this.persist();this.toast(`Drawing retention set to ${drawingRetentionLabel(days)}.`);});
  bindNativeChartEvents(){
    this._chartPointerDown=(e)=>{const svg=e.target?.closest?.('svg.chart-svg');if(!svg)return;this.nativeChartSvg=svg;const riskEl=e.target?.closest?.('[data-risk-line]');if(riskEl){e.preventDefault();this.startRiskDrag(riskEl.getAttribute('data-risk-line'));return;}const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/Math.max(1,r.width)*1200;const y=(e.clientY-r.top)/Math.max(1,r.height)*640;const right=Number(svg.dataset.chartRight||90),chartBottom=Number(svg.dataset.chartBottom||480);const type=x>=1200-right?'price':y>=chartBottom?'time':'pan';this.startChartGesture(type,e.clientX,e.clientY);};
    this._chartPointerMove=(e)=>{if(this.state.dragRiskLine&&this.nativeChartSvg){const svg=this.nativeChartSvg,r=svg.getBoundingClientRect();const top=Number(svg.dataset.chartTop||16),bottom=Number(svg.dataset.chartBottom||480),lo=Number(svg.dataset.priceLo),hi=Number(svg.dataset.priceHi);let py=(e.clientY-r.top)/Math.max(1,r.height)*640;py=Math.max(top,Math.min(bottom,py));const price=hi-((py-top)/(bottom-top))*(hi-lo);if(Number.isFinite(price))this.updateRiskLine(this.state.dragRiskLine,+price.toFixed(this.state.symbol==='XAUUSD'?2:5));return;}if(this.activeChartGesture)this.updateChartGesture(e.clientX,e.clientY);};
    this._chartPointerUp=()=>{if(this.state.dragRiskLine)this.endRiskDrag();if(this.activeChartGesture)this.endChartGesture();this.nativeChartSvg=null;};
    this._chartDoubleClick=(e)=>{const svg=e.target?.closest?.('svg.chart-svg');if(!svg)return;const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/Math.max(1,r.width)*1200;const y=(e.clientY-r.top)/Math.max(1,r.height)*640;const right=Number(svg.dataset.chartRight||90),chartBottom=Number(svg.dataset.chartBottom||480);if(x>=1200-right)this.resetPriceScale();else if(y>=chartBottom)this.resetTimeScale();};
    this._chartWheel=(e)=>{const svg=e.target?.closest?.('svg.chart-svg');if(!svg)return;e.preventDefault();this.zoomChartWheel(e.deltaY);};
    document.addEventListener('pointerdown',this._chartPointerDown,true);document.addEventListener('pointermove',this._chartPointerMove,true);document.addEventListener('pointerup',this._chartPointerUp,true);document.addEventListener('pointercancel',this._chartPointerUp,true);document.addEventListener('dblclick',this._chartDoubleClick,true);document.addEventListener('wheel',this._chartWheel,{capture:true,passive:false});
  }
  unbindNativeChartEvents(){if(!this._chartPointerDown)return;document.removeEventListener('pointerdown',this._chartPointerDown,true);document.removeEventListener('pointermove',this._chartPointerMove,true);document.removeEventListener('pointerup',this._chartPointerUp,true);document.removeEventListener('pointercancel',this._chartPointerUp,true);document.removeEventListener('dblclick',this._chartDoubleClick,true);document.removeEventListener('wheel',this._chartWheel,true);}
  openPlatformOps=()=>this.setState({platformOpsOpen:true,opsTab:'overview',mobileMenuOpen:false});
  closeOps=()=>this.setState({platformOpsOpen:false});
  setOpsTab=(opsTab)=>this.setState({opsTab});
  setPlatformMode=(platformMode)=>this.setState({platformMode},()=>this.toast(platformMode==='normal'?'Platform returned to NORMAL mode.':'Preview safety mode changed.'));
  simulateHealthIncident=()=>this.setState({healthSnapshot:{...DEMO_HEALTH,overall:'degraded',cpuPct:82,services:DEMO_HEALTH.services.map((x,i)=>i===1?{...x,status:'degraded',detail:'Reconnect required'}:x)}},()=>this.toast('Preview: broker gateway marked DEGRADED.'));
  simulatePrimaryFailure=()=>this.setState(s=>({failoverState:{...s.failoverState,leader:'google',oracle:{...s.failoverState.oracle,status:'offline',role:'RECOVERING'},google:{...s.failoverState.google,status:'healthy',role:'ACTIVE'},leaderLease:'Google owns active lease',reconciliation:'Broker reconciled before orders enabled',lastFailover:new Date().toLocaleTimeString(),duplicateOrders:0}}),()=>this.toast('Failover preview: Google standby became the single trading leader.'));
  simulatePrimaryRecovery=()=>this.setState(s=>({failoverState:{...s.failoverState,leader:'oracle',oracle:{...s.failoverState.oracle,status:'healthy',role:'ACTIVE'},google:{...s.failoverState.google,status:'ready',role:'WARM STANDBY'},leaderLease:'Oracle owns active lease',reconciliation:'Primary synchronized before controlled failback',lastFailover:s.failoverState.lastFailover}}),()=>this.toast('Controlled failback preview: Oracle restored after stability and reconciliation.'));
  addIndicator=(name)=>{const existing=this.state.indicators.find(x=>x.name===name);if(existing){this.setState(s=>({indicators:s.indicators.map(i=>i.id===existing.id?{...i,visible:true}:i)}),()=>this.persist());this.toast(`${name} shown`);return;}const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');const kind=name.startsWith('EMA')?'ema':name==='Volume'?'volume':'study';const length=Number((name.match(/\d+/)||[])[0])||14;const item={id:`${slug}-${Date.now()}`,name,label:name,kind,visible:true,length,source:'close',color:kind==='ema'?'#2aa8ff':'#6fd1ff',lineWidth:1.5,opacity:1,pane:kind==='ema'?'main':'separate',timeframeVisibility:'All'};this.setState(s=>({indicators:[...s.indicators,item]}),()=>this.persist());this.toast(`${name} added`);};
  toggleIndicatorVisibility=(id)=>this.setState(s=>({indicators:s.indicators.map(i=>i.id===id?{...i,visible:!i.visible}:i)}),()=>this.persist());
  removeIndicator=(id)=>this.setState(s=>({indicators:s.indicators.filter(i=>i.id!==id),indicatorSettingsId:s.indicatorSettingsId===id?null:s.indicatorSettingsId}),()=>this.persist());
  moveIndicator=(id,dir)=>this.setState(s=>{const a=s.indicators.slice();const i=a.findIndex(x=>x.id===id);if(i<0)return null;const j=Math.max(0,Math.min(a.length-1,i+dir));if(i===j)return null;const [item]=a.splice(i,1);a.splice(j,0,item);return{indicators:a};},()=>this.persist());
  openIndicatorSettings=(id)=>this.setState({indicatorSettingsId:id,indicatorsOpen:false});
  updateIndicatorSetting=(id,key,value)=>this.setState(s=>({indicators:s.indicators.map(i=>i.id===id?{...i,[key]:value}:i)}),()=>this.persist());
  toggleHideAllIndicators=()=>this.setState(s=>({indicatorsHiddenAll:!s.indicatorsHiddenAll}),()=>this.persist());
  openPrivateIndicatorEditor=()=>{if(this.state.currentRole!=='owner'){this.toast('JavaScript indicator upload is Owner Only in the launch configuration.');return;}if(this.state.indicatorUploadBlocked){this.toast('Indicator upload access is suspended pending owner review.');return;}this.setState({privateIndicatorEditorOpen:true,indicatorsOpen:false,indicatorBuildReport:null,privateIndicatorDraft:{name:'',visibility:'Owner only',code:''}});};
  updatePrivateIndicator=(key,value)=>this.setState(s=>({privateIndicatorDraft:{...s.privateIndicatorDraft,[key]:value},indicatorBuildReport:key==='code'?null:s.indicatorBuildReport}));
  loadPrivateIndicatorFile=async(file)=>{if(!file)return;try{if(!/\.(js|mjs|ts)$/i.test(file.name)){this.toast('Only .js, .mjs or .ts indicator source files are accepted.');return;}const code=await file.text();this.setState(s=>({privateIndicatorDraft:{...s.privateIndicatorDraft,name:s.privateIndicatorDraft.name||file.name.replace(/\.(js|mjs|ts)$/i,''),code},indicatorBuildReport:null}));this.toast('Indicator file loaded. Run Build & Validate before activation.');}catch{this.toast('Could not read indicator file.');}};
  validatePrivateIndicator=()=>{const d=this.state.privateIndicatorDraft;if(!d.name.trim()||!d.code.trim()){this.setState({indicatorBuildReport:{ok:false,issues:[{category:'format',message:'Add an indicator name and source code first.'}]}});return;}const report=scanIndicatorSource(d.code,{maxBytes:this.state.platformRules.indicatorUploadSourceMaxKb*1000});const strike=applyIndicatorSecurityStrike({strikes:this.state.indicatorUploadStrikes,blocked:this.state.indicatorUploadBlocked},report,{limit:this.state.platformRules.indicatorSecurityStrikeLimit,isOwner:this.state.currentRole==='owner'});this.setState({indicatorBuildReport:report,indicatorUploadStrikes:strike.strikes,indicatorUploadBlocked:strike.blocked});this.toast(report.ok?'Build passed locally — secure sandbox execution is the next production gate.':report.securityViolations.length?'Build rejected by security gate.':'Build failed format validation.');};
  savePrivateIndicator=()=>{const d=this.state.privateIndicatorDraft;const report=this.state.indicatorBuildReport;if(!report?.ok){this.toast('Run Build & Validate successfully before activation.');return;}const meta={id:`private-${Date.now()}`,name:d.name.trim(),label:d.name.trim(),kind:'private',visible:true,color:'#9a7cff',lineWidth:2,opacity:1,pane:'main',timeframeVisibility:'All',locked:true,visibility:d.visibility,lookback:600,buildId:report.buildId,sourceHash:report.sourceHash};this.setState(s=>({indicators:[...s.indicators.filter(i=>i.id!=='henry-private'),meta],privateIndicatorEditorOpen:false,indicatorBuildReport:null,privateIndicatorDraft:{name:'',visibility:'Owner only',code:''}}),()=>this.persist());this.toast('Indicator build approved. Only metadata/output contracts are stored in this frontend preview; source belongs in the secure VPS Vault.');};
  openScreenshotMenu=()=>this.setState(s=>({screenshotOpen:!s.screenshotOpen,mobileMenuOpen:false,timeframeMenuOpen:false}));
  captureChart=async()=>{try{const svg=document.querySelector('.chart-svg');if(!svg)throw new Error('Chart not found');const clone=svg.cloneNode(true);const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=`.gridline{stroke:${this.state.gridColor};stroke-width:1}.gridline.vertical{opacity:.5}.divider-line{stroke:#2b4054}.axis-text{fill:${this.state.axisTextColor};font-size:11px}.candle.up{fill:${this.state.candleUp};stroke:${this.state.candleBorderUp}}.candle.down{fill:${this.state.candleDown};stroke:${this.state.candleBorderDown}}.wick.up{stroke:${this.state.candleWickUp}}.wick.down{stroke:${this.state.candleWickDown}}.wick{stroke-width:1.2}.ema{fill:none}.volume-bar.up{fill:${this.state.volumeUp}}.volume-bar.down{fill:${this.state.volumeDown}}.volume-label{fill:#16c7bb;font-size:11px}.risk-zone.reward{fill:rgba(22,180,145,.18)}.risk-zone.loss{fill:rgba(198,55,66,.22)}.trade-line{stroke-width:1.5;stroke-dasharray:6 5}.trade-line.tp{stroke:#18d5b5}.trade-line.entry{stroke:#258df5}.trade-line.sl{stroke:#ff4b5d}.trade-tag-bg.tp{fill:#073a34;stroke:#18d5b5}.trade-tag-bg.entry{fill:#082e55;stroke:#258df5}.trade-tag-bg.sl{fill:#3d151b;stroke:#ff4b5d}.trade-tag-text,.marker-text,.price-pill{fill:white;font-size:11px}.current-line{stroke:${this.state.currentPriceColor};stroke-dasharray:3 3}.price-pill-bg{fill:${this.state.currentPriceColor}}.price-time{fill:#dcfffb;font-size:9px}.marker-triangle.buy,.marker-bg.buy{fill:#13d1ae}.marker-triangle.sell,.marker-bg.sell{fill:#ff4f4f}.crosshair-line{stroke:${this.state.crosshairColor};stroke-dasharray:4 4;opacity:.35}`;clone.insertBefore(style,clone.firstChild);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');const xml=new XMLSerializer().serializeToString(clone);const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const ctx=canvas.getContext('2d');ctx.fillStyle=this.state.chartBg;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.95));const a=document.createElement('a');a.href=URL.createObjectURL(png);a.download=`Trade-Avata-${this.state.symbol}-${this.state.timeframe}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);this.setState({screenshotOpen:false});this.toast('Chart screenshot downloaded.');}catch(e){this.toast('Could not capture chart screenshot.');}};
  copyScreenshotLink=()=>this.toast('Share-link upload is prepared for the storage backend. It will return a private/shareable URL when connected.');
  sendScreenshotToJournal=()=>this.toast('Journal attachment seam is ready. It will attach the snapshot directly after backend connection.');
  reconnectBroker=async()=>{this.setState({connectionStatus:'connecting'});try{await this.broker.connect();const [positions,orders,account]=await Promise.all([this.broker.positions(),this.broker.orders(),this.broker.account()]);this.setState({positions,orders,account,connectionStatus:'live'});this.toast('Broker connection restored and positions synchronized.');}catch{this.setState({connectionStatus:'offline'});this.toast('Broker connection is still offline.');}};
  toggleFullscreen=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();}
  cycleLayout=()=>this.setState(s=>({layout:s.layout==='1'?'2':s.layout==='2'?'4':'1'}),()=>{this.persist();this.toast(`${this.state.layout}-chart layout selected`);});
  undo=()=>this.setState(s=>{if(!s.history.length)return null;const last=s.history[s.history.length-1];return{history:s.history.slice(0,-1),redoStack:[...s.redoStack,last],...last.state};});
  redo=()=>this.setState(s=>{if(!s.redoStack.length)return null;const last=s.redoStack[s.redoStack.length-1];return{redoStack:s.redoStack.slice(0,-1),history:[...s.history,last],...last.state};});
  addSymbol=()=>this.toast('Symbol search/add workflow opened.');
  syncPositions=async()=>{const positions=await this.broker.positions();this.setState(s=>({positions,selectedPositionIds:s.selectedPositionIds.filter(id=>positions.some(p=>p.id===id))}));return positions;}
  closePosition=async(id)=>{if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}await this.broker.closePosition(id,1);await this.syncPositions();this.toast('Position closed in demo broker.');}
  positionTools=(id)=>{const p=this.state.positions.find(x=>x.id===id);if(!p)return;this.setState({positionToolsId:id,positionEditDraft:{sl:p.sl,tp:p.tp,partialPercent:50}});}
  modifyPosition=(id)=>this.positionTools(id);
  updatePositionDraft=(key,value)=>this.setState(s=>({positionEditDraft:{...(s.positionEditDraft||{}),[key]:value}}));
  savePositionProtection=async(id)=>{if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}const d=this.state.positionEditDraft||{};const sl=Number(d.sl),tp=Number(d.tp);if(!Number.isFinite(sl)||!Number.isFinite(tp)){this.toast('Enter valid Stop Loss and Take Profit prices.');return;}await this.broker.modifyPosition(id,{sl,tp});await this.syncPositions();this.setState({positionToolsId:null,positionEditDraft:null});this.toast('Stop Loss and Take Profit updated.');}
  setQuickLotSize=(value)=>{const n=Math.max(0.01,Number(value)||0.01);this.setState({quickLotManual:true,quickLotSize:+n.toFixed(2),tradeSizingMode:'lots'},()=>this.persist());}
  resetQuickLotSize=()=>this.setState({quickLotManual:false,tradeSizingMode:'risk'},()=>{this.persist();this.toast('Sizing returned to percentage risk.');});
  makeClientOrderId=()=>`TA-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  tradeGuard=(size,clientOrderId)=>validateTradeRequest({connectionStatus:this.state.connectionStatus,platformMode:this.state.platformMode,userId:'demo-user',accountOwnerId:'demo-user',riskPercent:this.state.tradeSizingMode==='risk'?this.state.riskPercent:0,size,clientOrderId,maxRiskPercent:this.state.platformRules.maxTradeRiskPercent,priceAgeMs:Date.now()-this.state.lastTickAt,maxPriceAgeMs:this.state.platformRules.maxPriceAgeMs});
  quickTrade=async(side)=>{const r=this.riskModel();const size=this.state.tradeSizingMode==='lots'?this.state.quickLotSize:+r.plan.lotSize.toFixed(2);const clientOrderId=this.makeClientOrderId();const guard=this.tradeGuard(size,clientOrderId);if(!guard.ok){this.toast(guard.errors[0]);return;}const p=await this.broker.placeOrder({clientOrderId,symbol:this.state.symbol,side,size,entry:r.entry,sl:r.stopLoss,tp:r.takeProfit,riskPercent:this.state.tradeSizingMode==='risk'?this.state.riskPercent:null});await this.syncPositions();this.setState({bottomTab:'positions'});this.toast(`${side} demo order placed: ${p.symbol} ${p.size} lots at ${number(this.state.riskPercent,2)}% risk`);}
  openTradeTicket=()=>{const r=this.riskModel();this.setState(s=>({tradeTicketOpen:true,ticket:{...s.ticket,side:'Buy',riskPercent:s.riskPercent,entry:+r.entry.toFixed(2),stopLoss:+r.stopLoss.toFixed(2),tp1:+r.takeProfit.toFixed(2)}}));}
  updateTicket=(key,value)=>this.setState(s=>({ticket:{...s.ticket,[key]:value}}));
  placeTicketOrder=async()=>{const t=this.state.ticket;const r=this.ticketRiskModel();const size=+r.plan.lotSize.toFixed(2);const clientOrderId=this.makeClientOrderId();const guard=validateTradeRequest({connectionStatus:this.state.connectionStatus,platformMode:this.state.platformMode,userId:'demo-user',accountOwnerId:'demo-user',riskPercent:t.riskPercent,size,clientOrderId,maxRiskPercent:this.state.platformRules.maxTradeRiskPercent,priceAgeMs:Date.now()-this.state.lastTickAt,maxPriceAgeMs:this.state.platformRules.maxPriceAgeMs});if(!guard.ok){this.toast(guard.errors[0]);return;}const result=await this.broker.placeOrder({clientOrderId,type:t.type,symbol:this.state.symbol,side:t.side,size,entry:t.entry,sl:t.stopLoss,tp:t.tp1,riskPercent:t.riskPercent,takeProfits:[{price:t.tp1,percent:t.tp1Pct},{price:t.tp2,percent:t.tp2Pct},{price:t.tp3,percent:t.tp3Pct}],breakEven:t.breakEven,trailing:t.trailing,trailDistance:t.trailDistance});const [positions,orders]=await Promise.all([this.broker.positions(),this.broker.orders()]);this.setState({positions,orders,tradeTicketOpen:false,bottomTab:t.type==='Market'?'positions':'orders',bottomOpen:true});this.toast(`${t.type} ${t.side} demo order staged`);return result;};
  cancelOrder=async(id)=>{await this.broker.cancelOrder(id);this.setState({orders:await this.broker.orders()});this.toast('Pending order cancelled');};
  partialClose=async(id,fraction)=>{if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}await this.broker.closePosition(id,fraction);await this.syncPositions();this.setState({positionToolsId:null,positionEditDraft:null});this.toast(`Closed ${Math.round(fraction*100)}% of position`);};
  partialCloseCustom=async(id)=>{const pct=Math.max(1,Math.min(99,Number(this.state.positionEditDraft?.partialPercent)||50));await this.partialClose(id,pct/100);};
  togglePositionSelected=(id)=>this.setState(s=>({selectedPositionIds:s.selectedPositionIds.includes(id)?s.selectedPositionIds.filter(x=>x!==id):[...s.selectedPositionIds,id]}));
  toggleSelectAllPositions=()=>this.setState(s=>({selectedPositionIds:s.selectedPositionIds.length===s.positions.length?[]:s.positions.map(p=>p.id)}));
  toggleBulkPositionMenu=()=>this.setState(s=>({bulkPositionMenuOpen:!s.bulkPositionMenuOpen}));
  requestBulkClose=(mode)=>{let targets=[];if(mode==='selected')targets=this.state.positions.filter(p=>this.state.selectedPositionIds.includes(p.id));else if(mode==='symbol')targets=this.state.positions.filter(p=>p.symbol===this.state.symbol);else if(mode==='profitable')targets=this.state.positions.filter(p=>Number(p.pnl)>0);else if(mode==='losing')targets=this.state.positions.filter(p=>Number(p.pnl)<0);else targets=this.state.positions;if(!targets.length){this.toast('No positions match that action.');return;}const labels={selected:'selected positions',symbol:`${this.state.symbol} positions`,profitable:'profitable positions',losing:'losing positions',all:'ALL open positions'};this.setState({bulkCloseConfirm:{mode,count:targets.length,label:labels[mode]||'positions',ids:targets.map(p=>p.id)},bulkPositionMenuOpen:false});};
  cancelBulkClose=()=>this.setState({bulkCloseConfirm:null});
  confirmBulkClose=async()=>{const c=this.state.bulkCloseConfirm;if(!c)return;if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}await this.broker.closePositions(c.ids);await this.syncPositions();this.setState({bulkCloseConfirm:null,selectedPositionIds:[]});this.toast(`Closed ${c.count} ${c.label}.`);};
  moveBreakEven=async(id)=>{if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}const p=this.state.positions.find(x=>x.id===id);if(!p)return;await this.broker.modifyPosition(id,{sl:p.entry,breakEven:true});await this.syncPositions();this.setState({positionToolsId:null,positionEditDraft:null});this.toast('Stop moved to break-even');};
  enableTrail=async(id)=>{if(this.state.connectionStatus!=='live'||this.state.platformMode!=='normal'){this.toast(this.state.platformMode==='normal'?'Trading is disabled while the broker connection is not LIVE.':'Trading is temporarily disabled by platform safety mode.');return;}await this.broker.modifyPosition(id,{trailing:true,trailDistance:2});await this.syncPositions();this.setState({positionToolsId:null,positionEditDraft:null});this.toast('Trailing stop enabled');};
  toggleReplay=()=>this.setState(s=>({replayPlaying:!s.replayPlaying,bottomTab:'replay'}));
  replayPrev=()=>this.setState(s=>({replayIndex:Math.max(1,s.replayIndex-1),replayPlaying:false}));
  replayNext=()=>this.setState(s=>({replayIndex:Math.min(s.bars.length-1,s.replayIndex+1),replayPlaying:false}));
  setReplaySpeed=(replaySpeed)=>this.setState({replaySpeed});
  downloadReplay=()=>{
    const data={version:1,symbol:this.state.symbol,timeframe:this.state.timeframe,createdAt:Date.now(),bars:this.state.bars.slice(-120)};const blob=new Blob([JSON.stringify(data)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${this.state.symbol}-${this.state.timeframe}.tavreplay.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);this.toast('Offline replay package created.');
  }
  importReplay=async(file)=>{if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.bars)||!data.bars.length)throw new Error('Invalid replay file');this.setState({symbol:data.symbol||this.state.symbol,timeframe:data.timeframe||this.state.timeframe,bars:data.bars,replayIndex:Math.min(50,data.bars.length-1),bottomTab:'replay',bottomOpen:true,replayPlaying:false});this.toast('Offline replay loaded');}catch(e){this.toast('Could not open replay package');}}
  addAlert=()=>this.setState(s=>({alerts:[...s.alerts,{id:Date.now(),type:'price',label:`${s.symbol} price alert`}]}));
  installApp=async()=>{if(this.installPrompt){this.installPrompt.prompt();await this.installPrompt.userChoice;this.installPrompt=null;this.setState({installAvailable:false});}else this.toast('Use your browser menu → Install app / Add to Home screen.');}
  setTheme=(theme)=>{this.setState({theme},()=>{this.applyThemeMode(theme);this.persist();});}
  setRisk=(v)=>this.setState({riskPercent:clampRiskPercent(v,this.state.platformRules.maxTradeRiskPercent),tradeSizingMode:'risk'},()=>this.persist());
  setChartColor=(key,value)=>this.setState({[key]:value},()=>{this.applyChartColors();this.persist();});
  toggleOverlay=(key)=>this.setState(s=>({[key]:!s[key]}),()=>this.persist());
  openAI=()=>{if(!canUseAI({role:this.state.currentRole,policy:this.state.aiPolicy})){this.toast('Trade Avata AI is Owner Only in the launch configuration.');return;}this.setState({aiOpen:true,mobileMenuOpen:false});};
  closeAI=()=>this.setState({aiOpen:false});
  setAIAudience=(audience)=>this.setState(s=>({aiPolicy:{...s.aiPolicy,enabled:audience!=='off',audience}}),()=>{this.persist();this.toast(audience==='owner'?'AI access limited to Owner.':audience==='all'?'AI access enabled for all eligible users.':'AI access disabled.');});
  setAIValue=(key,value)=>this.setState(s=>({aiPolicy:{...s.aiPolicy,[key]:Number(value)||value}}),()=>this.persist());
  submitAI=()=>{const now=Date.now();let usage={...this.state.aiUsage};if(now-usage.lastMinute>=60000)usage={...usage,minute:0,lastMinute:now};const check=validateAIRequest({role:this.state.currentRole,policy:this.state.aiPolicy,prompt:this.state.aiPrompt,recentRequests:usage.minute,dailyRequests:usage.daily});if(!check.ok){this.toast(check.errors[0]);return;}const prompt=this.state.aiPrompt.trim();const answer=`Preview only — production AI will answer through the protected server gateway. I can help explain chart structure, summarize journal/performance data, assist with Trade Avata indicator code, or summarize Owner Operations. I never execute trades or read broker/Firebase secrets.`;this.setState(s=>({aiPrompt:'',aiUsage:{...usage,minute:usage.minute+1,daily:usage.daily+1},aiMessages:[...s.aiMessages,{role:'user',text:prompt},{role:'assistant',text:answer}]}));};
  setPlan=(currentPlan)=>this.setState({currentPlan},()=>this.persist());
  setPromotionPolicy=(key,value)=>this.setState(s=>({monetizationPolicy:{...s.monetizationPolicy,[key]:value}}),()=>this.persist());
  dismissPromotion=()=>this.setState({promotionDismissed:true});
  saveWorkspace=()=>{const limit=planFor(this.state.currentPlan).savedWorkspaces;if(this.state.workspaces.length>=limit){this.toast(`${planFor(this.state.currentPlan).name} plan workspace limit reached (${limit}).`);return;}const name=`Workspace ${this.state.workspaces.length+1}`;const item={id:Date.now(),name,symbol:this.state.symbol,timeframe:this.state.timeframe,chartType:this.state.chartType,layout:this.state.layout,candleUp:this.state.candleUp,candleDown:this.state.candleDown,candleWickUp:this.state.candleWickUp,candleWickDown:this.state.candleWickDown,candleBorderUp:this.state.candleBorderUp,candleBorderDown:this.state.candleBorderDown,chartBg:this.state.chartBg,gridColor:this.state.gridColor,axisTextColor:this.state.axisTextColor,crosshairColor:this.state.crosshairColor,volumeUp:this.state.volumeUp,volumeDown:this.state.volumeDown,currentPriceColor:this.state.currentPriceColor,showSymbolOverlay:this.state.showSymbolOverlay,showIndicatorOverlay:this.state.showIndicatorOverlay,showOHLCOverlay:this.state.showOHLCOverlay,showLatencyOverlay:this.state.showLatencyOverlay,symbolLabelMode:this.state.symbolLabelMode,indicatorLabelMode:this.state.indicatorLabelMode,renkoMode:this.state.renkoMode,renkoPips:this.state.renkoPips,rangePips:this.state.rangePips};const workspaces=[...this.state.workspaces,item];this.setState({workspaces});try{localStorage.setItem('tac-workspaces',JSON.stringify(workspaces));}catch{}this.toast(`${name} saved`);};
  loadWorkspace=(w)=>this.setState({symbol:w.symbol,timeframe:w.timeframe,chartType:w.chartType,layout:w.layout||'1',candleUp:w.candleUp||this.state.candleUp,candleDown:w.candleDown||this.state.candleDown,candleWickUp:w.candleWickUp||this.state.candleWickUp,candleWickDown:w.candleWickDown||this.state.candleWickDown,candleBorderUp:w.candleBorderUp||this.state.candleBorderUp,candleBorderDown:w.candleBorderDown||this.state.candleBorderDown,chartBg:w.chartBg||this.state.chartBg,gridColor:w.gridColor||this.state.gridColor,axisTextColor:w.axisTextColor||this.state.axisTextColor,crosshairColor:w.crosshairColor||this.state.crosshairColor,volumeUp:w.volumeUp||this.state.volumeUp,volumeDown:w.volumeDown||this.state.volumeDown,currentPriceColor:w.currentPriceColor||this.state.currentPriceColor,showSymbolOverlay:w.showSymbolOverlay??this.state.showSymbolOverlay,showIndicatorOverlay:w.showIndicatorOverlay??this.state.showIndicatorOverlay,showOHLCOverlay:w.showOHLCOverlay??this.state.showOHLCOverlay,showLatencyOverlay:w.showLatencyOverlay??this.state.showLatencyOverlay,symbolLabelMode:w.symbolLabelMode||this.state.symbolLabelMode,indicatorLabelMode:w.indicatorLabelMode||this.state.indicatorLabelMode,renkoMode:w.renkoMode||this.state.renkoMode,renkoPips:w.renkoPips||this.state.renkoPips,rangePips:w.rangePips||this.state.rangePips},()=>{this.applyChartColors();this.loadSymbol(this.state.symbol,this.state.timeframe);this.persist();this.toast(`${w.name} loaded`);});
  render(){
    const risk=this.riskModel();const analytics=computeTradeAnalytics(demoTrades);
    const actions={
      setTimeframe:this.setTimeframe,setIntervalSpec:this.setIntervalSpec,toggleTimeframeMenu:this.toggleTimeframeMenu,setIntervalMenuTab:this.setIntervalMenuTab,toggleFavoriteTimeframe:this.toggleFavoriteTimeframe,toggleFavoriteInterval:this.toggleFavoriteInterval,setCustomTimeframe:this.setCustomTimeframe,addCustomTimeframe:this.addCustomTimeframe,
      selectSymbol:this.selectSymbol,openSymbolSettings:this.openSymbolSettings,cycleChartType:this.cycleChartType,selectTool:this.selectTool,toggleRight:this.toggleRight,toggleBottom:this.toggleBottom,openBottom:this.openBottom,setUtility:this.setUtility,toggleWatchlist:this.toggleWatchlist,
      toggleIndicators:this.toggleIndicators,toggleSettings:this.toggleSettings,toggleFullscreen:this.toggleFullscreen,cycleLayout:this.cycleLayout,undo:this.undo,redo:this.redo,addSymbol:this.addSymbol,
      closePosition:this.closePosition,modifyPosition:this.modifyPosition,toggleReplay:this.toggleReplay,replayPrev:this.replayPrev,replayNext:this.replayNext,setReplaySpeed:this.setReplaySpeed,downloadReplay:this.downloadReplay,importReplay:this.importReplay,addAlert:this.addAlert,
      quickTrade:this.quickTrade,openTradeTicket:this.openTradeTicket,cancelOrder:this.cancelOrder,positionTools:this.positionTools,toggleMobileTools:this.toggleMobileTools,toggleMobileMenu:this.toggleMobileMenu,openPrivateIndicatorEditor:this.openPrivateIndicatorEditor,
      addIndicator:this.addIndicator,toggleIndicatorVisibility:this.toggleIndicatorVisibility,removeIndicator:this.removeIndicator,moveIndicator:this.moveIndicator,openIndicatorSettings:this.openIndicatorSettings,toggleHideAllIndicators:this.toggleHideAllIndicators,
      openScreenshotMenu:this.openScreenshotMenu,captureChart:this.captureChart,copyScreenshotLink:this.copyScreenshotLink,sendScreenshotToJournal:this.sendScreenshotToJournal,reconnectBroker:this.reconnectBroker,
      setQuickLotSize:this.setQuickLotSize,resetQuickLotSize:this.resetQuickLotSize,setRisk:this.setRisk,toggleTradeSizingMode:this.toggleTradeSizingMode,toggleTradePanel:this.toggleTradePanel,cycleTradeDockPosition:this.cycleTradeDockPosition,toggleRiskTool:this.toggleRiskTool,startRiskDrag:this.startRiskDrag,updateRiskLine:this.updateRiskLine,endRiskDrag:this.endRiskDrag,
      togglePositionSelected:this.togglePositionSelected,toggleSelectAllPositions:this.toggleSelectAllPositions,toggleBulkPositionMenu:this.toggleBulkPositionMenu,requestBulkClose:this.requestBulkClose,cancelBulkClose:this.cancelBulkClose,confirmBulkClose:this.confirmBulkClose,updatePositionDraft:this.updatePositionDraft,savePositionProtection:this.savePositionProtection,partialCloseCustom:this.partialCloseCustom,
      openPlatformOps:this.openPlatformOps,closeOps:this.closeOps,setOpsTab:this.setOpsTab,setPlatformMode:this.setPlatformMode,simulateHealthIncident:this.simulateHealthIncident,simulatePrimaryFailure:this.simulatePrimaryFailure,simulatePrimaryRecovery:this.simulatePrimaryRecovery,setDrawingRetention:this.setDrawingRetention,
      startChartGesture:this.startChartGesture,updateChartGesture:this.updateChartGesture,endChartGesture:this.endChartGesture,zoomChartWheel:this.zoomChartWheel,goLive:this.goLive,toggleChartFollow:this.toggleChartFollow,cycleRightSpace:this.cycleRightSpace,resetPriceScale:this.resetPriceScale,resetTimeScale:this.resetTimeScale,resetChartNavigation:this.resetChartNavigation,
      toggleOverlay:this.toggleOverlay,setLabelMode:this.setLabelMode,openAI:this.openAI,closeAI:this.closeAI,setAIAudience:this.setAIAudience,setAIValue:this.setAIValue,submitAI:this.submitAI,setPlan:this.setPlan,setPromotionPolicy:this.setPromotionPolicy,dismissPromotion:this.dismissPromotion
    };
    return h('div',{className:'app-shell'},
      h(TopBar,{state:this.state,actions}),
      h('div',{className:'work-area'},
        h(LeftToolbar,{state:this.state,actions}),
        h('main',{className:cx('chart-area',!this.state.tradePanelVisible&&'trade-panel-hidden')},this.renderChartLayout(risk,actions),h(TradeCalculator,{risk,visible:this.state.calculatorOpen,onClose:()=>this.setState({calculatorOpen:false})}),h(QuickTradeDock,{state:this.state,risk,actions})),
        h(RightSidebar,{state:this.state,actions,symbols:SYMBOLS}),
        h(MobileDock,{state:this.state,actions})
      ),
      h(BottomPanel,{state:this.state,actions,positions:this.state.positions,orders:this.state.orders,account:this.state.account,analytics}),
      this.state.indicatorsOpen ? this.renderIndicators() : null,
      this.state.timeframeMenuOpen ? this.renderTimeframeMenu() : null,
      this.state.indicatorSettingsId ? this.renderIndicatorSettings() : null,
      this.state.screenshotOpen ? this.renderScreenshotMenu() : null,
      this.state.mobileSymbolOpen ? this.renderMobileSymbolPicker() : null,
      this.state.mobileMenuOpen ? this.renderMobileMenu() : null,
      this.state.privateIndicatorEditorOpen ? this.renderPrivateIndicatorEditor() : null,
      this.state.settingsOpen ? this.renderSettings() : null,
      this.state.tradeTicketOpen ? h(TradeTicket,{ticket:this.state.ticket,risk:this.ticketRiskModel(),onChange:this.updateTicket,onClose:()=>this.setState({tradeTicketOpen:false}),onPlace:this.placeTicketOrder}) : null,
      this.state.positionToolsId ? this.renderPositionTools() : null,
      this.state.bulkCloseConfirm ? this.renderBulkCloseConfirm() : null,
      this.state.platformOpsOpen ? h(PlatformOps,{state:this.state,actions,analytics:DEMO_OWNER_ANALYTICS,health:this.state.healthSnapshot,rules:this.state.platformRules}) : null,
      this.state.retentionNoticeOpen ? this.renderRetentionNotice() : null,
      this.state.aiOpen ? this.renderAI() : null,
      shouldShowPromotion({planId:this.state.currentPlan,policy:this.state.monetizationPolicy,dismissed:this.state.promotionDismissed}) ? this.renderPromotion() : null,
      this.state.toast ? h('div',{className:'toast'},this.state.toast) : null
    );
  }
  renderChartLayout(risk,actions){const count=Number(this.state.layout)||1;const charts=[];const effectiveIndicators=this.state.indicatorsHiddenAll?this.state.indicators.map(i=>({...i,visible:false})):this.state.indicators;for(let i=0;i<count;i++){charts.push(h('div',{key:i,className:'chart-cell'},h(ChartSurface,{bars:this.currentBars(),state:{...this.state,indicators:effectiveIndicators,layoutCell:i},risk,actions})));}return h('div',{className:`multi-chart-grid layout-${count}`},...charts);}
  renderPositionTools(){const p=this.state.positions.find(x=>x.id===this.state.positionToolsId);if(!p)return null;const d=this.state.positionEditDraft||{sl:p.sl,tp:p.tp,partialPercent:50};return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({positionToolsId:null,positionEditDraft:null});}},h('div',{className:'position-tools'},h('div',{className:'popover-head'},h('strong',null,`${p.symbol} position tools`),h('button',{onClick:()=>this.setState({positionToolsId:null,positionEditDraft:null})},'×')),h('p',{className:'muted'},'Edit protection, scale out, move to break-even or enable trailing without leaving the chart.'),h('div',{className:'position-edit-grid'},h('label',null,'Current size',h('input',{value:number(p.size,2),disabled:true})),h('label',null,'Stop Loss',h('input',{type:'number',step:'0.01',value:d.sl,onChange:e=>this.updatePositionDraft('sl',e.target.value)})),h('label',null,'Take Profit',h('input',{type:'number',step:'0.01',value:d.tp,onChange:e=>this.updatePositionDraft('tp',e.target.value)})),h('label',null,'Partial close %',h('input',{type:'number',min:'1',max:'99',step:'1',value:d.partialPercent,onChange:e=>this.updatePositionDraft('partialPercent',e.target.value)}))),h('div',{className:'position-tool-grid'},h('button',{className:'primary-btn',onClick:()=>this.savePositionProtection(p.id)},'Save SL / TP'),h('button',{className:'secondary-btn',onClick:()=>this.partialCloseCustom(p.id)},'Partial close'),h('button',{className:'secondary-btn',onClick:()=>this.partialClose(p.id,.25)},'Close 25%'),h('button',{className:'secondary-btn',onClick:()=>this.partialClose(p.id,.50)},'Close 50%'),h('button',{className:'primary-btn',onClick:()=>this.moveBreakEven(p.id)},'Move to BE'),h('button',{className:'primary-btn',onClick:()=>this.enableTrail(p.id)},'Enable trailing'),h('button',{className:'danger-btn full-span',onClick:()=>this.closePosition(p.id)},'Close full position'))));}
  renderBulkCloseConfirm(){const c=this.state.bulkCloseConfirm;return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.cancelBulkClose();}},h('section',{className:'close-confirm'},h('div',{className:'danger-symbol'},'!'),h('h3',null,'Confirm bulk close'),h('p',null,`You are about to close ${c.count} ${c.label}. This action is intentionally protected to prevent accidental taps.`),h('div',{className:'confirm-actions'},h('button',{className:'secondary-btn',onClick:this.cancelBulkClose},'Cancel'),h('button',{className:'danger-btn',onClick:this.confirmBulkClose},`Close ${c.count} Position${c.count===1?'':'s'}`))));}
  renderIndicators(){
    const catalog=['EMA 20','EMA 50','RSI','Stochastic','ATR','MACD','Volume'];
    return h('div',{className:'popover indicators-pop'},
      h('div',{className:'popover-head'},h('strong',null,'Indicators'),h('button',{onClick:()=>this.setState({indicatorsOpen:false})},'×')),
      h('input',{placeholder:'Search indicators…'}),
      h('div',{className:'indicator-toolbar'},
        h('button',{className:'secondary-btn small',onClick:this.toggleHideAllIndicators},this.state.indicatorsHiddenAll?'Show all':'Hide all'),
        h('span',{className:'muted'},`${this.state.indicators.length} on workspace`)
      ),
      h('h4',null,'On chart'),
      h('div',{className:'active-indicator-list'},...this.state.indicators.map((ind,index)=>h('div',{key:ind.id,className:cx('active-indicator-row',!ind.visible&&'disabled')},
        h('button',{className:'indicator-main',onClick:()=>this.openIndicatorSettings(ind.id)},h('span',{className:'indicator-dot',style:{background:ind.color||'#6fd1ff'}}),h('span',null,h('b',null,ind.label||ind.name),h('small',null,ind.kind==='private'?'Private · secure server':'Editable indicator'))),
        h('div',{className:'indicator-row-actions'},
          h('button',{title:ind.visible?'Hide':'Show',onClick:()=>this.toggleIndicatorVisibility(ind.id)},ind.visible?'◉':'○'),
          h('button',{title:'Settings',onClick:()=>this.openIndicatorSettings(ind.id)},'⚙'),
          h('button',{title:'Move up',disabled:index===0,onClick:()=>this.moveIndicator(ind.id,-1)},'↑'),
          h('button',{title:'Move down',disabled:index===this.state.indicators.length-1,onClick:()=>this.moveIndicator(ind.id,1)},'↓'),
          h('button',{title:'Remove',onClick:()=>this.removeIndicator(ind.id)},'×')
        )
      ))),
      h('h4',null,'Built-in'),
      h('div',{className:'indicator-catalog'},...catalog.map(x=>h('button',{key:x,className:'list-btn',onClick:()=>this.addIndicator(x)},x,h('span',null,'＋')))),
      h('h4',null,'My Private'),
      this.state.currentRole==='owner'?h('button',{className:'private-add-btn',onClick:this.openPrivateIndicatorEditor},h('span',null,'＋'),h('span',null,h('b',null,'Owner-only JavaScript uploader'),h('small',null,'Build gate → security scan → sandbox → activate'))):h('p',{className:'private-note'},'JavaScript indicator upload is hidden for this account. Only the Owner can upload source code in the launch configuration.'),
      h('p',{className:'private-note'},'Private source code is never included in the public chart bundle. Only authorized indicator outputs are intended to reach chart users.')
    );
  }
  renderTimeframeMenu(){
    const tab=this.state.intervalMenuTab||'time';
    const favorite=(spec)=>this.state.favoriteTimeframes.includes(spec)||(!spec.includes(':')&&this.state.favoriteTimeframes.includes(spec));
    const option=(spec,label,title='')=>h('div',{key:spec,className:'timeframe-option'},h('button',{className:'timeframe-value',title,onClick:()=>this.setIntervalSpec(spec)},label),h('button',{className:cx('favorite-star',favorite(spec)&&'active'),onClick:()=>this.toggleFavoriteInterval(spec),title:'Favourite'},favorite(spec)?'★':'☆'));
    const timeGroups=TIMEFRAME_GROUPS.map(group=>h('section',{key:group.id,className:'timeframe-group'},h('h4',null,group.label),h('div',{className:'timeframe-options'},...group.items.map(tf=>option(intervalKey(tab==='renko-time'?'renko-time':'time',tf),tab==='renko-time'?`R ${tf}`:tf,tab==='renko-time'?'Renko source interval':'Time interval')))));
    return h('div',{className:'timeframe-menu interval-browser'},
      h('div',{className:'popover-head'},h('strong',null,'Chart intervals'),h('button',{onClick:()=>this.setState({timeframeMenuOpen:false})},'×')),
      h('div',{className:'interval-tabs'},
        h('button',{className:cx(tab==='time'&&'active'),onClick:()=>this.setIntervalMenuTab('time')},'Time'),
        h('button',{className:cx(tab==='renko-time'&&'active'),onClick:()=>this.setIntervalMenuTab('renko-time')},'Renko · Time'),
        h('button',{className:cx(tab==='renko-pips'&&'active'),onClick:()=>this.setIntervalMenuTab('renko-pips')},'Renko · Pips'),
        h('button',{className:cx(tab==='range-pips'&&'active'),onClick:()=>this.setIntervalMenuTab('range-pips')},'Range')
      ),
      h('p',{className:'muted timeframe-help'},'Choose an interval or brick size. ★ pins it to the tiny top bar for one-click access.'),
      tab==='time'||tab==='renko-time'?h('div',{className:'timeframe-groups'},...timeGroups):null,
      tab==='renko-pips'?h('section',{className:'timeframe-group'},h('h4',null,'Renko brick size · pips'),h('div',{className:'timeframe-options pip-grid'},...RENKO_PIP_SIZES.map(p=>option(intervalKey('renko-pips',p),`${p}p`,'Renko pip brick size')))):null,
      tab==='range-pips'?h('section',{className:'timeframe-group'},h('h4',null,'Range bar size · pips'),h('div',{className:'timeframe-options pip-grid'},...RANGE_PIP_SIZES.map(p=>option(intervalKey('range-pips',p),`${p}p`,'Range pip size')))):null,
      tab==='time'?h('section',{className:'timeframe-group custom-timeframe'},h('h4',null,'Custom interval'),h('div',{className:'custom-timeframe-row'},h('input',{type:'number',min:'1',max:'999',value:this.state.customTimeframeValue,onChange:e=>this.setCustomTimeframe('customTimeframeValue',e.target.value)}),h('select',{value:this.state.customTimeframeUnit,onChange:e=>this.setCustomTimeframe('customTimeframeUnit',e.target.value)},h('option',{value:'s'},'Seconds'),h('option',{value:'m'},'Minutes'),h('option',{value:'h'},'Hours')),h('button',{className:'primary-btn',onClick:this.addCustomTimeframe},'Add & use'))):null
    );
  }
  renderIndicatorSettings(){const ind=this.state.indicators.find(i=>i.id===this.state.indicatorSettingsId);if(!ind)return null;return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({indicatorSettingsId:null});}},h('section',{className:'indicator-settings-modal'},
    h('div',{className:'popover-head'},h('strong',null,`${ind.label||ind.name} settings`),h('button',{onClick:()=>this.setState({indicatorSettingsId:null})},'×')),
    h('div',{className:'indicator-settings-body'},
      h('div',{className:'indicator-settings-grid'},
        h('label',null,'Name',h('input',{value:ind.label||ind.name,onChange:e=>this.updateIndicatorSetting(ind.id,'label',e.target.value)})),
        ind.kind==='ema'?h('label',null,'Length',h('input',{type:'number',min:'1',max:'500',value:ind.length||20,onChange:e=>this.updateIndicatorSetting(ind.id,'length',Number(e.target.value)||1)})):null,
        h('label',null,'Source',h('select',{value:ind.source||'close',onChange:e=>this.updateIndicatorSetting(ind.id,'source',e.target.value)},...['close','open','high','low'].map(v=>h('option',{key:v,value:v},v)))),
        h('label',null,'Color',h('input',{type:'color',value:ind.color||'#2aa8ff',onChange:e=>this.updateIndicatorSetting(ind.id,'color',e.target.value)})),
        h('label',null,'Line width',h('input',{type:'range',min:'1',max:'5',step:'.5',value:ind.lineWidth||1.5,onChange:e=>this.updateIndicatorSetting(ind.id,'lineWidth',Number(e.target.value))})),
        h('label',null,'Opacity',h('input',{type:'range',min:'.1',max:'1',step:'.1',value:ind.opacity??1,onChange:e=>this.updateIndicatorSetting(ind.id,'opacity',Number(e.target.value))})),
        h('label',null,'Pane',h('select',{value:ind.pane||'main',onChange:e=>this.updateIndicatorSetting(ind.id,'pane',e.target.value)},h('option',{value:'main'},'Main chart'),h('option',{value:'separate'},'Separate pane'),h('option',{value:'bottom'},'Bottom pane'))),
        h('label',null,'Visibility',h('select',{value:ind.timeframeVisibility||'All',onChange:e=>this.updateIndicatorSetting(ind.id,'timeframeVisibility',e.target.value)},h('option',null,'All'),h('option',null,'Current timeframe only')))
      ),
      ind.kind==='private'?h('p',{className:'private-note'},'Private source code is edited only in the secure Indicator Vault. These settings control appearance and allowed chart behavior, not the protected formula.'):null,
      h('div',{className:'indicator-settings-actions'},h('button',{className:'secondary-btn',onClick:()=>this.toggleIndicatorVisibility(ind.id)},ind.visible?'Hide indicator':'Show indicator'),h('button',{className:'danger-btn',onClick:()=>this.removeIndicator(ind.id)},'Remove'),h('button',{className:'primary-btn',onClick:()=>this.setState({indicatorSettingsId:null})},'Done'))
    )
  ));}
  renderScreenshotMenu(){return h('div',{className:'popover screenshot-pop'},h('div',{className:'popover-head'},h('strong',null,'Chart snapshot'),h('button',{onClick:()=>this.setState({screenshotOpen:false})},'×')),h('p',{className:'muted'},'Capture the current chart for your journal or sharing workflow.'),h('button',{className:'list-btn',onClick:this.captureChart},'Download PNG',h('span',null,'↓')),h('button',{className:'list-btn',onClick:this.copyScreenshotLink},'Copy share link',h('span',null,'↗')),h('button',{className:'list-btn',onClick:this.sendScreenshotToJournal},'Send to Trade Avata Journal',h('span',null,'＋')));}
  renderMobileSymbolPicker(){return h('div',{className:'mobile-sheet-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({mobileSymbolOpen:false});}},h('section',{className:'mobile-sheet symbol-sheet'},
    h('div',{className:'mobile-sheet-head'},h('strong',null,'Select symbol'),h('button',{onClick:()=>this.setState({mobileSymbolOpen:false})},'×')),
    h('input',{className:'mobile-search',placeholder:'Search markets…'}),
    h('div',{className:'mobile-symbol-list'},...SYMBOLS.map(sym=>h('button',{key:sym.symbol,className:cx(sym.symbol===this.state.symbol&&'active'),onClick:()=>{this.selectSymbol(sym.symbol);this.setState({mobileSymbolOpen:false});}},h('span',null,h('i',{className:'coin-dot'},sym.symbol==='XAUUSD'?'◆':'●'),h('b',null,sym.symbol),h('small',null,sym.name)),h('span',{className:sym.changePct>=0?'positive':'negative'},`${sym.changePct>=0?'+':''}${number(sym.changePct,2)}%`))))
  ));}
  renderMobileMenu(){const items=[['calendar','▦','Calendar'],['alerts','♢','Alerts'],['news','▧','News'],['objects','◇','Object Tree'],['snapshot','◉','Snapshot'],['layout','▣','Layout'],...(canUseAI({role:this.state.currentRole,policy:this.state.aiPolicy})?[['ai','✦','AI']]:[]),['ops','◌','Owner Ops'],['settings','⚙','Settings'],['fullscreen','⛶','Fullscreen']];return h('div',{className:'mobile-sheet-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({mobileMenuOpen:false});}},h('section',{className:'mobile-sheet tools-sheet'},
    h('div',{className:'mobile-sheet-head'},h('strong',null,'More tools'),h('button',{onClick:()=>this.setState({mobileMenuOpen:false})},'×')),
    h('div',{className:'mobile-tools-grid'},...items.map(([id,icon,label])=>h('button',{key:id,onClick:()=>{if(id==='alerts')this.openBottom('alerts');else if(id==='settings')this.toggleSettings();else if(id==='layout')this.cycleLayout();else if(id==='fullscreen')this.toggleFullscreen();else if(id==='snapshot')this.openScreenshotMenu();else if(id==='ops')this.openPlatformOps();else if(id==='ai')this.openAI();else this.toast(`${label} module is ready for the next connection.`);this.setState({mobileMenuOpen:false});}},h('span',null,icon),h('b',null,label))))
  ));}
  renderPrivateIndicatorEditor(){const d=this.state.privateIndicatorDraft;const r=this.state.indicatorBuildReport;return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({privateIndicatorEditorOpen:false});}},h('section',{className:'private-indicator-editor'},
    h('div',{className:'popover-head'},h('strong',null,'Private Indicator Vault · Owner Only'),h('button',{onClick:()=>this.setState({privateIndicatorEditorOpen:false})},'×')),
    h('div',{className:'private-editor-body'},
      h('div',{className:'security-gate-banner'},h('b',null,'Mandatory build gate'),h('span',null,'Source must pass indicator-format checks and prohibited-code security checks before activation. Production then runs it inside an isolated sandbox with CPU/memory/network/file restrictions.')),
      h('div',{className:'private-editor-grid'},h('label',null,'Indicator name',h('input',{value:d.name,placeholder:'e.g. Henry Sequence Pro',onChange:e=>this.updatePrivateIndicator('name',e.target.value)})),h('label',null,'Visibility',h('select',{value:d.visibility,onChange:e=>this.updatePrivateIndicator('visibility',e.target.value)},h('option',null,'Owner only'),h('option',null,'Owner + selected accounts')))),
      h('label',{className:'private-code-label'},'JavaScript / TypeScript source',h('textarea',{value:d.code,spellCheck:false,placeholder:`Example:
function calculate(ctx) {
  const fast = ta.ema(ctx.close, 20);
  return plot(fast);
}`,onChange:e=>this.updatePrivateIndicator('code',e.target.value)})),
      r?h('div',{className:cx('build-report',r.ok?'pass':'fail')},h('div',{className:'build-report-head'},h('b',null,r.ok?'BUILD PASSED ✓':'BUILD REJECTED'),r.buildId?h('code',null,r.buildId):null),r.ok?h('p',null,'Static gate passed. Production still requires sandbox dry-run, resource test and output-contract validation before activation.'):h('div',{className:'build-issues'},...(r.issues||[]).map((i,idx)=>h('p',{key:idx},h('b',null,i.category==='security'?'SECURITY':'FORMAT'),` · ${i.message}`)))):null,
      h('div',{className:'private-editor-actions'},h('label',{className:'file-btn'},'Upload .js / .ts',h('input',{type:'file',accept:'.js,.mjs,.ts,text/javascript',onChange:e=>this.loadPrivateIndicatorFile(e.target.files&&e.target.files[0])})),h('button',{className:'secondary-btn',onClick:this.validatePrivateIndicator},'Build & Validate'),h('button',{className:'primary-btn',disabled:!r?.ok,onClick:this.savePrivateIndicator},'Activate Approved Build')),
      h('p',{className:'private-note'},`Launch policy: uploader visible to Owner only. Public developer uploads are OFF. Future developer accounts are suspended after ${this.state.platformRules.indicatorSecurityStrikeLimit} serious prohibited-code attempts; normal syntax/format mistakes do not count as security strikes.`)
    )
  ));}
  renderAI(){
    const allowed=canUseAI({role:this.state.currentRole,policy:this.state.aiPolicy});
    const messages=this.state.aiMessages.length?this.state.aiMessages.map((m,i)=>h('div',{key:i,className:`ai-message ${m.role}`},h('b',null,m.role==='user'?'You':'Trade Avata AI'),h('p',null,m.text))):[h('div',{key:'empty',className:'ai-empty'},h('b',null,'What AI can help with'),h('p',null,'Explain chart structure, summarize journal/performance data, assist with indicator code, and summarize Owner Operations. Production requests go through a rate-limited server gateway.'))];
    return h('div',{className:'modal-backdrop ai-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.closeAI();}},h('section',{className:'ai-modal'},
      h('div',{className:'popover-head'},h('div',null,h('strong',null,'Trade Avata AI'),h('small',null,this.state.aiPolicy.audience==='owner'?'Owner Only':'Enabled users')),h('button',{onClick:this.closeAI},'×')),
      h('div',{className:'ai-safety'},h('b',null,'Protected assistant · not in the trade execution path'),h('span',null,`Limit ${this.state.aiPolicy.requestsPerMinute}/min · ${this.state.aiPolicy.dailyRequests}/day · no broker/Firebase secrets · no autonomous trading`)),
      h('div',{className:'ai-messages'},...messages),
      h('div',{className:'ai-compose'},h('textarea',{disabled:!allowed,maxLength:this.state.aiPolicy.maxPromptChars,value:this.state.aiPrompt,placeholder:'Ask about the chart, journal, indicator code, or platform operations…',onChange:e=>this.setState({aiPrompt:e.target.value})}),h('div',null,h('small',null,`${this.state.aiPrompt.length}/${this.state.aiPolicy.maxPromptChars}`),h('button',{className:'primary-btn',disabled:!allowed,onClick:this.submitAI},'Ask AI')))
    ));
  }
  renderPromotion(){return h('aside',{className:'promotion-banner','aria-label':'Trade Avata promotion'},h('span',{className:'promo-badge'},'TRADE AVATA'),h('span',null,'Explore tools, indicators and services'),h('button',{className:'promo-action',onClick:()=>this.toast('Promotion destination is controlled by the Owner backend.')},'View'),this.state.monetizationPolicy.promotionDismissible?h('button',{className:'promo-close',onClick:this.dismissPromotion,'aria-label':'Dismiss promotion'},'×'):null);}
  renderRetentionNotice(){return h('div',{className:'modal-backdrop retention-backdrop'},h('section',{className:'retention-notice'},h('div',{className:'retention-icon'},'✎'),h('h3',null,'Drawing storage notice'),h('p',null,`During Trade Avata's lightweight launch phase, saved drawings are automatically removed ${this.state.retentionPolicy.drawingsDays>0?`after ${drawingRetentionLabel(this.state.retentionPolicy.drawingsDays)} of inactivity`:'only when you delete them'}. Editing a drawing refreshes its retention clock.`),h('p',{className:'muted'},'This policy is controlled from the Owner backend and can later be changed to 30 days, 3 months, 6 months, 1 year or permanent without redesigning the chart.'),h('button',{className:'primary-btn wide',onClick:this.closeRetentionNotice},'I understand')));}
  renderSettings(){
    const color=(label,key)=>[h('label',{key:`${key}-l`},label),h('input',{key,type:'color',value:this.state[key],onChange:e=>this.setChartColor(key,e.target.value)})];
    return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)this.setState({settingsOpen:false});}},
      h('div',{className:'settings-modal'},
        h('div',{className:'popover-head'},h('strong',null,'Chart Settings'),h('button',{onClick:()=>this.setState({settingsOpen:false})},'×')),
        h('section',null,h('h4',null,'Appearance'),h('div',{className:'segmented four'},
          h('button',{className:cx(this.state.theme==='dark'&&'active'),onClick:()=>this.setTheme('dark')},'Dark'),
          h('button',{className:cx(this.state.theme==='light'&&'active'),onClick:()=>this.setTheme('light')},'Light'),
          h('button',{className:cx(this.state.theme==='system'&&'active'),onClick:()=>this.setTheme('system')},'System'),
          h('button',{className:cx(this.state.theme==='custom'&&'active'),onClick:()=>this.setTheme('custom')},'Custom')
        )),
        h('section',null,h('h4',null,'Default risk'),h('div',{className:'risk-setting'},h('input',{type:'range',min:'0.25',max:'10',step:'0.25',value:this.state.riskPercent,onChange:e=>this.setRisk(e.target.value)}),h('b',null,`${number(this.state.riskPercent,2)}%`))),
        h('section',null,h('h4',null,'Trading panel'),h('div',{className:'settings-row'},
          h('button',{className:cx('secondary-btn',this.state.tradePanelVisible&&'active'),onClick:this.toggleTradePanel},this.state.tradePanelVisible?'Hide quick trade':'Show quick trade')
        ),h('p',{className:'muted'},'Desktop quick trade stays tiny and centered at the top of the chart. ⋯ opens the advanced side drawer. Mobile keeps the approved Trade-button layout.')),
        h('section',null,h('h4',null,'Chart customization'),h('div',{className:'color-grid'},
          ...color('Bull body','candleUp'),...color('Bear body','candleDown'),...color('Bull wick','candleWickUp'),...color('Bear wick','candleWickDown'),
          ...color('Bull border','candleBorderUp'),...color('Bear border','candleBorderDown'),...color('Background','chartBg'),...color('Grid','gridColor'),
          ...color('Scale text','axisTextColor'),...color('Crosshair','crosshairColor'),...color('Volume up','volumeUp'),...color('Volume down','volumeDown'),...color('Current price','currentPriceColor')
        ),h('p',{className:'muted'},'Candle bodies, wicks, borders, chart background, grid, scale text, crosshair, volume and live-price colors are independent.')),
        h('section',null,h('h4',null,'Chart overlays'),h('div',{className:'overlay-toggle-grid'},
          h('label',null,h('input',{type:'checkbox',checked:this.state.showSymbolOverlay,onChange:()=>this.toggleOverlay('showSymbolOverlay')}),' Symbol / timeframe'),
          h('label',null,h('input',{type:'checkbox',checked:this.state.showIndicatorOverlay,onChange:()=>this.toggleOverlay('showIndicatorOverlay')}),' Indicator values'),
          h('label',null,h('input',{type:'checkbox',checked:this.state.showOHLCOverlay,onChange:()=>this.toggleOverlay('showOHLCOverlay')}),' OHLC values'),
          h('label',null,h('input',{type:'checkbox',checked:this.state.showLatencyOverlay,onChange:()=>this.toggleOverlay('showLatencyOverlay')}),' Sync / latency')
        ),h('p',{className:'muted'},'These labels float transparently over the chart and never reserve vertical space. Turn any of them off for a completely clean chart.'),h('div',{className:'label-mode-grid'},h('label',null,'Symbol label',h('select',{value:this.state.symbolLabelMode,onChange:e=>this.setLabelMode('symbolLabelMode',e.target.value)},h('option',{value:'full'},'Full'),h('option',{value:'compact'},'Compact'),h('option',{value:'symbol'},'Symbol only'),h('option',{value:'hidden'},'Hidden'))),h('label',null,'Indicator labels',h('select',{value:this.state.indicatorLabelMode,onChange:e=>this.setLabelMode('indicatorLabelMode',e.target.value)},h('option',{value:'full'},'Full'),h('option',{value:'compact'},'Compact'),h('option',{value:'values'},'Values only'),h('option',{value:'hidden'},'Hidden'))))),
        h('section',null,h('h4',null,'Chart navigation'),h('div',{className:'settings-row'},h('button',{className:cx('secondary-btn',this.state.chartFollow&&'active'),onClick:this.toggleChartFollow},this.state.chartFollow?'Follow current price: ON':'Free chart mode'),h('button',{className:'secondary-btn',onClick:this.resetChartNavigation},'Reset position / scale')),h('p',{className:'muted'},`Right-side breathing space: ${this.state.chartRightSpacePct}% · wheel zoom and draggable price/time scales are enabled.`)),
        h('section',null,h('h4',null,'Drawing retention'),h('select',{value:String(this.state.retentionPolicy.drawingsDays),onChange:e=>this.setDrawingRetention(e.target.value)},h('option',{value:'7'},'7 days · lightweight launch default'),h('option',{value:'30'},'30 days'),h('option',{value:'90'},'3 months'),h('option',{value:'180'},'6 months'),h('option',{value:'365'},'1 year'),h('option',{value:'0'},'Keep until manually deleted')),h('p',{className:'muted'},'Owner-controlled policy. Users are notified before their first drawing and before expiry in the production backend.')),
        h('section',null,h('h4',null,'Workspaces'),h('div',{className:'workspace-actions'},h('button',{className:'primary-btn',onClick:this.saveWorkspace},'Save current'),...this.state.workspaces.map(w=>h('button',{key:w.id,className:'workspace-chip',onClick:()=>this.loadWorkspace(w)},w.name)))),
        h('section',null,h('h4',null,'App'),h('button',{className:'primary-btn wide',onClick:this.installApp},this.state.installAvailable?'Install Trade Avata Chart':'Install / Add to Home Screen')),
        h('p',{className:'muted'},'Workspace, layout, overlay and theme preferences are saved locally. Firebase sync can plug into this settings seam later.')
      )
    );
  }

}

ReactDOM.render(h(TradeAvataApp),document.getElementById('root'));
