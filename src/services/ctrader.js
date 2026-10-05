import { BrokerAdapter } from './broker.js';

// Production connector seam. Secrets/tokens must live on the VPS, never in the browser.
export class CTraderBrokerAdapter extends BrokerAdapter {
  constructor({ apiBase = '/api/ctrader' } = {}) { super(); this.apiBase = apiBase; }
  async request(path, options={}) {
    const res = await fetch(`${this.apiBase}${path}`, { ...options, headers:{'content-type':'application/json', ...(options.headers||{})} });
    if(!res.ok) throw new Error(`cTrader gateway error ${res.status}`);
    return res.json();
  }
  connect(){ return this.request('/session'); }
  placeOrder(order){ return this.request('/orders',{method:'POST',body:JSON.stringify(order)}); }
  modifyPosition(id,patch){ return this.request(`/positions/${id}`,{method:'PATCH',body:JSON.stringify(patch)}); }
  closePosition(id,fraction=1){ return this.request(`/positions/${id}/close`,{method:'POST',body:JSON.stringify({fraction})}); }
  cancelOrder(id){ return this.request(`/orders/${id}`,{method:'DELETE'}); }
  positions(){ return this.request('/positions'); }
  orders(){ return this.request('/orders'); }
  account(){ return this.request('/account'); }
}
