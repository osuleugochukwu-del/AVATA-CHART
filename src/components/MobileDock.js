import { h, cx } from './ui.js';

export function MobileDock({ state, actions }) {
  return h('nav',{className:'mobile-dock','aria-label':'Mobile chart tools'},
    h('button',{className:cx(state.mobileToolsOpen&&'active'),onClick:actions.toggleMobileTools,title:'Drawing tools'},h('span',{className:'dock-icon'},'✎'),h('span',null,'Draw')),
    h('button',{className:cx(state.indicatorsOpen&&'active'),onClick:actions.toggleIndicators,title:'Indicators'},h('span',{className:'dock-icon'},'ƒx'),h('span',null,'Indicators')),
    h('button',{className:cx('trade-action',state.tradePanelVisible&&'active'),onClick:actions.toggleTradePanel,title:state.tradePanelVisible?'Hide trading panel':'Show trading panel'},h('span',{className:'dock-icon'},'↕'),h('span',null,'Trade')),
    h('button',{className:cx(state.bottomTab==='replay'&&state.bottomOpen&&'active'),onClick:()=>actions.openBottom('replay'),title:'Replay'},h('span',{className:'dock-icon'},'◀'),h('span',null,'Replay')),
    h('button',{className:cx(state.mobileMenuOpen&&'active'),onClick:actions.toggleMobileMenu,title:'More tools'},h('span',{className:'dock-icon'},'•••'),h('span',null,'More'))
  );
}
