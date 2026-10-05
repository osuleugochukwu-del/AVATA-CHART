import { h, number, cx } from './ui.js';

export function QuickTradeDock({state,risk,actions}){
  if(!state.tradePanelVisible)return null;
  const riskMode=state.tradeSizingMode!=='lots';
  const size=riskMode?risk.plan.lotSize:state.quickLotSize;
  const disabled=state.connectionStatus!=='live'||state.platformMode!=='normal';
  return h('div',{className:cx('quick-trade','desktop-center-trade',disabled&&'trade-disabled')},
    h('button',{className:'qt-sell',disabled,onClick:()=>actions.quickTrade('Sell'),title:disabled?'Trading is disabled until platform and broker are LIVE':'Market sell'},h('span',null,'SELL'),h('b',null,number(risk.entry-0.10,2))),
    h('div',{className:'qt-size'},
      h('button',{className:'qt-mode-label',onClick:actions.toggleTradeSizingMode,title:riskMode?'Switch to fixed lots':'Switch to percentage risk'},riskMode?'Risk %':'Lots'),
      riskMode
        ? h('input',{type:'number',min:'0.1',max:'10',step:'0.25',value:number(state.riskPercent,2),onChange:e=>actions.setRisk(e.target.value),'aria-label':'Risk percent'})
        : h('input',{type:'number',min:'0.01',step:'0.01',value:number(size,2),onChange:e=>actions.setQuickLotSize(e.target.value),'aria-label':'Lot size'}),
      h('small',{className:'qt-calc'},riskMode?`${number(size,2)} lots`:'fixed lots')
    ),
    h('button',{className:'qt-buy',disabled,onClick:()=>actions.quickTrade('Buy'),title:disabled?'Trading is disabled until platform and broker are LIVE':'Market buy'},h('span',null,'BUY'),h('b',null,number(risk.entry+0.10,2))),
    h('div',{className:'qt-mini-actions'},
      h('button',{className:cx(state.riskToolActive&&'active'),onClick:actions.toggleRiskTool,title:'Show / hide Entry, Stop Loss and Take Profit lines'},'⌁'),
      h('button',{onClick:actions.openTradeTicket,title:'Advanced trade controls'},'⋯'),
      h('button',{onClick:actions.toggleTradePanel,title:'Hide quick trade'},'⌃')
    )
  );
}
