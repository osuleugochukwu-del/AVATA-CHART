import { h, cx } from './ui.js';
import { intervalLabel, isIntervalActive } from '../core/timeframes.js';

export function TopBar({state, actions}) {
  const favorites=(state.favoriteTimeframes&&state.favoriteTimeframes.length?state.favoriteTimeframes:['1s','5s','15s','30s','1m','5m','15m']);
  const status=state.connectionStatus||'offline';
  const aiVisible=state.currentRole==='owner' && state.aiPolicy?.enabled!==false && state.aiPolicy?.audience!=='off';
  return h('header',{className:'topbar'},
    h('div',{className:'brand'}, h('img',{className:'brand-logo',src:'./public/brand/trade-avata-logo.svg',alt:'Trade Avata',onError:e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='grid';}}),h('span',{className:'brand-mark brand-fallback',style:{display:'none'}},'A'), h('span',null,'Trade Avata ',h('b',null,'Chart'))),
    h('button',{className:cx('connection-pill',`status-${status}`),onClick:actions.reconnectBroker,title:status==='live'?'Broker connection LIVE — tap to resync':status==='connecting'?'Connecting to broker…':'Broker offline — tap to retry'},h('span',{className:'live-dot'}),h('span',{className:'connection-text'},status==='live'?'LIVE':status==='connecting'?'CONNECTING':'OFFLINE')),
    h('div',{className:'symbol-control-group'},
      h('button',{className:'symbol-find desktop-only',onClick:actions.toggleWatchlist,title:'Find / change symbol'},'⌕'),
      h('button',{className:'symbol-search',onClick:actions.openSymbolSettings,title:'Chart / symbol settings'},h('span',null,state.symbol),h('span',{className:'chev'},'⌄'))
    ),
    h('button',{className:'mobile-chart-type',onClick:actions.cycleChartType,title:'Chart type'}, state.chartType==='Heikin-Ashi'?'HA':state.chartType==='Candles'?'C':state.chartType==='Renko'?'R':'RG'),
    h('div',{className:'timeframes'},
      ...favorites.map(spec=>h('button',{key:spec,className:cx('tf',isIntervalActive(spec,state)&&'active'),onClick:()=>actions.setIntervalSpec(spec),title:`Use ${intervalLabel(spec)}`},intervalLabel(spec))),
      h('button',{className:cx('tf','tf-more',state.timeframeMenuOpen&&'active'),onClick:actions.toggleTimeframeMenu,title:'All intervals / Renko / Range'},'⌄')
    ),
    h('div',{className:'top-actions'},
      h('button',{className:'toolbar-select',onClick:actions.cycleChartType},h('span',{className:'tiny-icon'},'⌁'),state.chartType,h('span',{className:'chev'},'⌄')),
      h('div',{className:'indicator-top-group'},
        h('button',{className:'toolbar-select',onClick:actions.toggleIndicators},h('span',{className:'tiny-icon'},'ƒx'),'Indicators',h('span',{className:'chev'},'⌄')),
        h('button',{className:cx('toolbar-btn','compact','indicator-visibility-toggle','desktop-only',state.indicatorsHiddenAll&&'muted-active'),onClick:actions.toggleHideAllIndicators,title:state.indicatorsHiddenAll?'Show all indicators':'Hide all indicators'},state.indicatorsHiddenAll?'○':'◉')
      ),
      h('button',{className:cx('toolbar-btn',state.tradePanelVisible&&'active'),onClick:actions.toggleTradePanel,title:state.tradePanelVisible?'Hide quick trade':'Show quick trade'},'↕',' Trade'),
      h('button',{className:'toolbar-btn',onClick:()=>actions.openBottom('alerts')},'♢',' Alert'),
      h('button',{className:'toolbar-btn',onClick:()=>actions.openBottom('replay')},'◀◀',' Replay'),
      aiVisible?h('button',{className:'toolbar-btn owner-ai-btn',onClick:actions.openAI,title:'Trade Avata AI · Owner Only'},'✦',' AI'):null,
      h('button',{className:'toolbar-btn',onClick:actions.openScreenshotMenu,title:'Chart screenshot'},'◉',' Snapshot'),
      h('div',{className:'undo-group'},
        h('button',{className:'toolbar-btn compact',onClick:actions.undo,title:'Undo'},'↶'),
        h('button',{className:'toolbar-btn compact',onClick:actions.redo,title:'Redo'},'↷')
      ),
      h('button',{className:'toolbar-btn',onClick:actions.cycleLayout},'▣',' Layout'),
      h('button',{className:'toolbar-btn',onClick:actions.toggleSettings},'⚙',' Settings'),
      h('button',{className:'toolbar-btn compact',onClick:actions.toggleFullscreen,title:'Fullscreen'},'⛶')
    )
  );
}
