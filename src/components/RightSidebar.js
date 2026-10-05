import { h, cx, number } from './ui.js';

const utility=[['watchlist','▤','Watchlist'],['calendar','▦','Calendar'],['alerts','♢','Alerts'],['news','▧','News'],['objects','◇','Object Tree'],['tools','▦','Tools'],['settings','⚙','Settings'],['ops','◌','Ops'],['more','•••','More']];

export function RightSidebar({state,actions,symbols}){
 const selected=symbols.find(s=>s.symbol===state.symbol)||symbols[0];
 return h('div',{className:cx('right-zone',!state.rightOpen&&'collapsed')},
   state.rightOpen ? h('aside',{className:'right-panel'},
     h('div',{className:'panel-head'},h('strong',null,'Watchlist'),h('div',null,h('button',{onClick:actions.addSymbol},'+'),h('button',null,'•••'))),
     h('div',{className:'watch-head'},h('span',null,'Symbol'),h('span',null,'Last'),h('span',null,'Chg'),h('span',null,'Chg%')),
     h('div',{className:'watch-rows'},...symbols.map(s=>h('button',{key:s.symbol,className:cx('watch-row',s.symbol===state.symbol&&'selected'),onClick:()=>actions.selectSymbol(s.symbol)},
       h('span',{className:'symbol-cell'},h('i',{className:'coin-dot'},s.symbol==='XAUUSD'?'◆':'●'),s.symbol),
       h('span',null,number(s.last,s.last<10?4:2)),
       h('span',{className:s.change>=0?'positive':'negative'},`${s.change>=0?'+':''}${number(s.change,s.last<10?4:2)}`),
       h('span',{className:s.changePct>=0?'positive':'negative'},`${s.changePct>=0?'+':''}${number(s.changePct,2)}%`)
     ))),
     h('section',{className:'instrument-card'},
       h('div',{className:'instrument-title'},h('span',{className:'big-coin'},'◆'),h('strong',null,selected.symbol),h('button',null,'•••')),
       h('p',null,selected.name,' · ',selected.asset),
       h('div',{className:'big-price'},number(selected.last,selected.last<10?4:2),h('small',null,' USD')),
       h('div',{className:'big-change positive'},`${selected.change>=0?'+':''}${number(selected.change)}  ${selected.changePct>=0?'+':''}${number(selected.changePct)}%`),
       h('div',{className:'market-open'},h('i',null), 'Market open'),
       h('div',{className:'news-card'},h('span',{className:'news-icon'},'▣'),h('span',null,'Market update, session context and upcoming events will appear here.'),h('span',null,'›'))
     )
   ):null,
   h('aside',{className:'utility-rail'},
     h('button',{className:'collapse-right',onClick:actions.toggleRight,title:state.rightOpen?'Collapse sidebar':'Open sidebar'},state.rightOpen?'»':'«'),
     ...utility.map(([id,icon,label])=>h('button',{key:id,className:cx('utility-item',state.utility===id&&'active'),onClick:()=>actions.setUtility(id),title:label},h('span',{className:'utility-icon'},icon),h('span',{className:'utility-label'},label)))
   )
 );
}
