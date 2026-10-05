import { h, cx, number, money } from './ui.js';

const tabs=['orders','positions','analytics','replay','alerts','history'];
export function BottomPanel({state,actions,positions,orders,account,analytics}){
 const status=state.connectionStatus||'offline';
 const statusLabel=status==='live'?'Live':status==='connecting'?'Reconnecting':'Offline';
 return h('section',{className:cx('bottom-panel',!state.bottomOpen&&'collapsed')},
   h('button',{className:'bottom-handle',onClick:actions.toggleBottom,title:state.bottomOpen?'Collapse panel':'Open panel'},state.bottomOpen?'⌄':'⌃'),
   h('div',{className:'bottom-tabs'},...tabs.map(t=>h('button',{key:t,className:cx(state.bottomTab===t&&'active'),onClick:()=>actions.openBottom(t)},t[0].toUpperCase()+t.slice(1), t==='positions'?h('span',{className:'badge'},positions.length):null))),
   state.bottomOpen ? h('div',{className:'bottom-content'},
      state.bottomTab==='positions' ? positionPanel(positions,state,actions) :
      state.bottomTab==='analytics' ? analyticsPanel(analytics) :
      state.bottomTab==='replay' ? replayPanel(state,actions) :
      state.bottomTab==='alerts' ? alertsPanel(state,actions) :
      state.bottomTab==='history' ? historyPanel() :
      ordersPanel(orders,actions),
      h('div',{className:'account-summary'},
        h('div',{className:cx('live-row',`status-${status}`)},h('span',{className:'live-dot'}),statusLabel,h('span',{className:'muted'},`· ${account.server||'Broker'} · feed ${state.feedLatencyMs??account.latency??'—'} ms · route ${state.orderRouteLatencyMs??'—'} ms`)),
        h('div',{className:'account-metrics'},
          h('div',null,h('span',null,'Equity'),h('b',null,money(account.equity))),
          h('div',null,h('span',null,'Unrealized P&L'),h('b',{className:Number(account.unrealized)>=0?'positive':'negative'},`${money(account.unrealized)} (${Number(account.unrealized)>=0?'+':''}0.56%)`)),
          h('div',null,h('span',null,'Margin Used'),h('b',null,`${money(account.marginUsed)} (2.4%)`))
        )
      )
   ):null
 );
}

function positionPanel(positions,state,actions){
 const allSelected=positions.length>0&&state.selectedPositionIds.length===positions.length;
 return h('div',{className:'positions-panel'},
   h('div',{className:'position-bulkbar'},
     h('label',{className:'select-all'},h('input',{type:'checkbox',checked:allSelected,onChange:actions.toggleSelectAllPositions}),h('span',null,state.selectedPositionIds.length?`${state.selectedPositionIds.length} selected`:'Select')),
     h('div',{className:'bulk-actions-wrap'},
       h('button',{className:'secondary-btn small',onClick:actions.toggleBulkPositionMenu},'Position actions ▾'),
       state.bulkPositionMenuOpen?h('div',{className:'bulk-menu'},
         h('button',{disabled:!state.selectedPositionIds.length,onClick:()=>actions.requestBulkClose('selected')},'Close selected'),
         h('button',{onClick:()=>actions.requestBulkClose('symbol')},`Close all ${state.symbol}`),
         h('button',{onClick:()=>actions.requestBulkClose('profitable')},'Close profitable'),
         h('button',{onClick:()=>actions.requestBulkClose('losing')},'Close losing'),
         h('div',{className:'bulk-divider'}),
         h('button',{className:'danger-item',onClick:()=>actions.requestBulkClose('all')},'Close ALL positions…')
       ):null
     )
   ),
   positions.length?positionTable(positions,state,actions):h('div',{className:'empty-state'},'No open positions.')
 );
}

function positionTable(positions,state,actions){
 return h('div',{className:'table-wrap'},h('table',{className:'positions-table'},
   h('thead',null,h('tr',null,h('th',null,''),...['Symbol','Side','Size','Entry','Current','SL','TP','P&L','P&L %','Actions'].map(x=>h('th',{key:x},x)))),
   h('tbody',null,...positions.map(p=>h('tr',{key:p.id,className:cx(state.selectedPositionIds.includes(p.id)&&'selected-row')},
     h('td',null,h('input',{type:'checkbox',checked:state.selectedPositionIds.includes(p.id),onChange:()=>actions.togglePositionSelected(p.id)})),
     h('td',null,h('span',{className:'small-coin'},'◆'),' ',p.symbol),h('td',{className:p.side==='Buy'?'positive':'negative'},p.side),h('td',null,number(p.size,2)),h('td',null,number(p.entry,2)),h('td',null,number(p.current,2)),h('td',{className:'negative'},number(p.sl,2)),h('td',{className:'positive'},number(p.tp,2)),h('td',{className:Number(p.pnl)>=0?'positive':'negative'},money(p.pnl)),h('td',{className:Number(p.pnlPct)>=0?'positive':'negative'},`${Number(p.pnlPct)>=0?'+':''}${number(p.pnlPct,2)}%`),
     h('td',{className:'actions-cell'},h('button',{className:'secondary-btn',onClick:()=>actions.closePosition(p.id)},'Close'),h('button',{className:'primary-btn',onClick:()=>actions.modifyPosition(p.id)},'Modify'),h('button',{className:'dots-btn',onClick:()=>actions.positionTools(p.id)},'•••'))
   )))
 ));
}
function analyticsPanel(a){ return h('div',{className:'mini-grid'},
  metric('Trades',a.trades),metric('Win rate',`${number(a.winRate,1)}%`),metric('Net P&L',money(a.netPnl),'positive'),metric('Profit factor',Number.isFinite(a.profitFactor)?number(a.profitFactor,2):'∞'),metric('Max DD',money(-a.maxDrawdown),'negative'),metric('Average win',money(a.averageWin),'positive')
 ); }
function metric(label,value,cls=''){return h('div',{className:'metric-card'},h('span',null,label),h('b',{className:cls},value));}
function replayPanel(state,actions){return h('div',{className:'replay-controls'},h('button',{className:'secondary-btn',onClick:actions.replayPrev},'|◀'),h('button',{className:'primary-btn',onClick:actions.toggleReplay},state.replayPlaying?'Pause':'Play'),h('button',{className:'secondary-btn',onClick:actions.replayNext},'▶|'),h('label',null,'Speed',h('select',{value:state.replaySpeed,onChange:e=>actions.setReplaySpeed(+e.target.value)},...['1','2','5','10','50'].map(x=>h('option',{key:x,value:x},`${x}×`)))),h('button',{className:'secondary-btn',onClick:actions.downloadReplay},'Download offline'),h('label',{className:'file-btn'},'Open offline',h('input',{type:'file',accept:'.json,.tavreplay',onChange:e=>actions.importReplay(e.target.files&&e.target.files[0])})),h('span',{className:'muted'},`Bar ${state.replayIndex+1}`));}
function alertsPanel(state,actions){return h('div',{className:'alert-panel'},h('div',null,h('b',null,'Server-ready alert rules'),h('p',null,'Price, line, private-indicator and Renko alerts are represented here.')),h('button',{className:'primary-btn',onClick:actions.addAlert},'+ New alert'),h('span',{className:'muted'},`${state.alerts.length} active demo rule(s)`));}
function historyPanel(){return h('div',{className:'empty-state'},'Trade history and replay-session history will load here.');}
function ordersPanel(orders,actions){if(!orders.length)return h('div',{className:'empty-state'},'No pending demo orders.');return h('div',{className:'table-wrap'},h('table',{className:'positions-table'},h('thead',null,h('tr',null,...['Symbol','Type','Side','Size','Entry','SL','TP','Status','Actions'].map(x=>h('th',{key:x},x)))),h('tbody',null,...orders.map(o=>h('tr',{key:o.id},h('td',null,o.symbol),h('td',null,o.type),h('td',{className:o.side==='Buy'?'positive':'negative'},o.side),h('td',null,number(o.size,2)),h('td',null,number(o.entry,2)),h('td',{className:'negative'},number(o.sl,2)),h('td',{className:'positive'},number(o.tp,2)),h('td',null,o.status),h('td',null,h('button',{className:'secondary-btn',onClick:()=>actions.cancelOrder(o.id)},'Cancel')))))));}
