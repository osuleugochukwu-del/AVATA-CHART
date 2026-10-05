import { h, cx, number } from './ui.js';

export function TradeTicket({ticket,risk,onChange,onClose,onPlace}){
  const input=(key,type='number',extra={})=>h('input',{type,value:ticket[key],onChange:e=>onChange(key,type==='number'?Number(e.target.value):e.target.value),...extra});
  return h('div',{className:'modal-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)onClose();}},
    h('div',{className:'trade-ticket'},
      h('div',{className:'popover-head'},h('strong',null,'New Trade'),h('button',{onClick:onClose},'×')),
      h('div',{className:'ticket-tabs'},...['Market','Limit','Stop','Stop Limit'].map(t=>h('button',{key:t,className:cx(ticket.type===t&&'active'),onClick:()=>onChange('type',t)},t))),
      h('div',{className:'ticket-side'},h('button',{className:cx('sell',ticket.side==='Sell'&&'active'),onClick:()=>onChange('side','Sell')},'SELL'),h('button',{className:cx('buy',ticket.side==='Buy'&&'active'),onClick:()=>onChange('side','Buy')},'BUY')),
      h('div',{className:'ticket-grid'},
        h('label',null,'Risk %',input('riskPercent','number',{min:.25,max:10,step:.25})),
        h('label',null,'Calculated lots',h('input',{value:number(risk.plan.lotSize,2),readOnly:true})),
        h('label',null,'Entry',input('entry','number',{step:.01})),
        h('label',null,'Stop Loss',input('stopLoss','number',{step:.01})),
        h('label',null,'Take Profit 1',input('tp1','number',{step:.01})),
        h('label',null,'TP1 close %',input('tp1Pct','number',{min:0,max:100,step:5})),
        h('label',null,'Take Profit 2',input('tp2','number',{step:.01})),
        h('label',null,'TP2 close %',input('tp2Pct','number',{min:0,max:100,step:5})),
        h('label',null,'Take Profit 3',input('tp3','number',{step:.01})),
        h('label',null,'TP3 close %',input('tp3Pct','number',{min:0,max:100,step:5}))
      ),
      h('div',{className:'ticket-options'},
        h('label',null,h('input',{type:'checkbox',checked:ticket.breakEven,onChange:e=>onChange('breakEven',e.target.checked)}),' Move to break-even after TP1'),
        h('label',null,h('input',{type:'checkbox',checked:ticket.trailing,onChange:e=>onChange('trailing',e.target.checked)}),' Trailing stop'),
        ticket.trailing?h('label',{className:'trail-setting'},'Trail distance',input('trailDistance','number',{min:.1,step:.1})):null
      ),
      h('div',{className:'ticket-summary'},
        h('span',null,`Risk: $${number(risk.plan.riskAmount,2)} · ${number(ticket.riskPercent,2)}%`),
        h('span',null,`R:R 1 : ${number(risk.plan.rewardRisk,2)}`)
      ),
      h('button',{className:cx('place-order',ticket.side==='Buy'?'buy':'sell'),onClick:onPlace},`Place ${ticket.type} ${ticket.side}`)
    )
  );
}
