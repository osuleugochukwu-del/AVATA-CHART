import { h, number, money } from './ui.js';
export function TradeCalculator({risk, visible, onClose}){
 if(!visible) return null;
 return h('div',{className:'trade-calculator'},
   h('div',{className:'calc-title'},h('strong',null,'Trade Calculator'),h('div',null,h('button',{title:'Settings'},'⚙'),h('button',{onClick:onClose,title:'Close'},'×'))),
   h('div',{className:'calc-grid'},
     h('span',null,'Risk %'),h('b',null,`${number(risk.riskPercent,1)}%`),
     h('span',null,'Account Balance'),h('b',null,money(risk.equity)),
     h('span',null,'Entry Price'),h('b',null,number(risk.entry,2)),
     h('span',null,'Stop Loss'),h('b',null,number(risk.stopLoss,2)),
     h('span',null,'Take Profit'),h('b',null,number(risk.takeProfit,2)),
     h('span',null,'Risk (pips)'),h('b',null,number(risk.plan.pipDistance,1)),
     h('span',null,'Reward (pips)'),h('b',null,number(risk.plan.rewardPips,1)),
     h('span',null,'Risk / Reward'),h('b',null,`1 : ${number(risk.plan.rewardRisk,1)}`)
   ),
   h('div',{className:'lot-row'},h('strong',null,'Lot Size'),h('b',{className:'accent'},number(risk.plan.lotSize,2)))
 );
}
