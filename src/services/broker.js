import { DuplicateGuard, SlidingWindowRateLimiter, DEFAULT_PLATFORM_RULES } from '../core/platform-rules.js';

export class BrokerAdapter {
  async connect() { throw new Error('Not implemented'); }
  async placeOrder() { throw new Error('Not implemented'); }
  async modifyPosition() { throw new Error('Not implemented'); }
  async closePosition() { throw new Error('Not implemented'); }
  async closePositions(ids=[]) { return Promise.all(ids.map(id=>this.closePosition(id,1))); }
  async cancelOrder() { throw new Error('Not implemented'); }
  async positions() { return []; }
  async orders() { return []; }
  async account() { return {}; }
}

export class MockBrokerAdapter extends BrokerAdapter {
  constructor() {
    super();
    this.connected = false;
    this._seq = 1001;
    this._orders = [];
    this._positions = [{ id:'P-1001', symbol:'XAUUSD', side:'Buy', size:0.15, entry:2431.80, current:2432.71, sl:2425.10, tp:2444.20, pnl:13.65, pnlPct:0.56 }];
    this._account = { equity:10013.65, balance:10000, marginUsed:243.18, unrealized:13.65, latency:12, server:'London' };
    this._duplicates=new DuplicateGuard(DEFAULT_PLATFORM_RULES.duplicateOrderWindowMs);
    this._orderLimiter=new SlidingWindowRateLimiter(DEFAULT_PLATFORM_RULES.orderRequestsPerSecond,1000);
  }
  async connect() { this.connected = true; return { connected:true }; }
  async placeOrder(order) {
    if(!this.connected)throw new Error('Broker is offline');
    const clientOrderId=order.clientOrderId||`MOCK-${++this._seq}`;
    if(!this._duplicates.accept(clientOrderId))throw new Error('Duplicate order request blocked');
    if(!this._orderLimiter.allow('demo-user'))throw new Error('Order rate limit reached');
    if(order.type && order.type!=='Market'){ const o={id:`O-${++this._seq}`,clientOrderId,status:'Pending',...order}; this._orders.push(o); return o; }
    const p={id:`P-${++this._seq}`,clientOrderId,...order,current:order.entry,pnl:0,pnlPct:0}; this._positions.push(p); return p;
  }
  async modifyPosition(id, patch) { const p=this._positions.find(x=>x.id===id); if(!p) throw new Error('Position not found'); Object.assign(p,patch); return p; }
  async closePosition(id, fraction=1) { const i=this._positions.findIndex(x=>x.id===id); if(i<0) throw new Error('Position not found'); const p=this._positions[i]; if(fraction>=1) this._positions.splice(i,1); else p.size=+(p.size*(1-fraction)).toFixed(2); return p; }
  async cancelOrder(id){ const i=this._orders.findIndex(x=>x.id===id); if(i<0) throw new Error('Order not found'); return this._orders.splice(i,1)[0]; }
  async positions(){ return this._positions.map(x=>({...x})); }
  async orders(){ return this._orders.map(x=>({...x})); }
  async account(){ return {...this._account}; }
}
