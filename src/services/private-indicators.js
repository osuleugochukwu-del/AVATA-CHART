export class PrivateIndicatorClient {
  constructor({ apiBase='/api/private-indicators' }={}) { this.apiBase=apiBase; }
  async list(){ const r=await fetch(this.apiBase); if(!r.ok) throw new Error('Unable to load private indicators'); return r.json(); }
  async calculate(indicatorId, payload){ const r=await fetch(`${this.apiBase}/${encodeURIComponent(indicatorId)}/calculate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error('Private indicator calculation failed'); return r.json(); }
}
