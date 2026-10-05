export const DEFAULT_PLATFORM_RULES = Object.freeze({
  maxActiveSessionsPerUser: 3,
  maxWebSocketConnectionsPerUser: 2,
  marketRequestsPerSecond: 20,
  historicalRequestsPerMinute: 60,
  orderRequestsPerSecond: 5,
  duplicateOrderWindowMs: 15000,
  maxTradeRiskPercent: 10,
  maxReplayDownloadDays: 31,
  replayJobsPerUser: 2,
  screenshotUploadsPerMinute: 10,
  maxScreenshotMb: 8,
  maxPrivateIndicatorsPerUser: 25,
  privateIndicatorCpuMs: 1500,
  privateIndicatorMemoryMb: 64,
  maxAlertsPerUser: 100,
  maxSavedWorkspaces: 20,
  maxPriceAgeMs: 2500,
  indicatorSecurityStrikeLimit: 2,
  indicatorUploadSourceMaxKb: 200,
  ownerMfaRequired: true,
  adminMfaRequired: true,
  requireIdempotencyKey: true
});

export class SlidingWindowRateLimiter {
  constructor(limit, windowMs) {
    this.limit = Math.max(1, Number(limit) || 1);
    this.windowMs = Math.max(1, Number(windowMs) || 1000);
    this.events = new Map();
  }
  allow(key='global', now=Date.now()) {
    const existing=(this.events.get(key)||[]).filter(t=>now-t<this.windowMs);
    if(existing.length>=this.limit){this.events.set(key,existing);return false;}
    existing.push(now);this.events.set(key,existing);return true;
  }
  reset(key){this.events.delete(key);}
}

export class DuplicateGuard {
  constructor(windowMs=15000){this.windowMs=windowMs;this.seen=new Map();}
  accept(key,now=Date.now()){
    if(!key)return false;
    const previous=this.seen.get(key);
    this.seen.set(key,now);
    for(const [k,t] of this.seen){if(now-t>this.windowMs)this.seen.delete(k);}
    return previous==null || now-previous>this.windowMs;
  }
}

export function validateTradeRequest({
  connectionStatus,
  platformMode='normal',
  userId='demo-user',
  accountOwnerId='demo-user',
  riskPercent=0,
  size=0,
  clientOrderId,
  maxRiskPercent=DEFAULT_PLATFORM_RULES.maxTradeRiskPercent,
  priceAgeMs=0,
  maxPriceAgeMs=DEFAULT_PLATFORM_RULES.maxPriceAgeMs
}={}){
  const errors=[];
  if(connectionStatus!=='live')errors.push('Broker connection is not LIVE.');
  if(platformMode==='maintenance')errors.push('Platform is in maintenance mode.');
  if(platformMode==='trading-disabled')errors.push('New trading is temporarily disabled.');
  if(!userId || !accountOwnerId || userId!==accountOwnerId)errors.push('Trading account ownership could not be verified.');
  if(!clientOrderId)errors.push('Missing idempotency/order request ID.');
  if(!(Number(size)>0))errors.push('Order size must be greater than zero.');
  if(Number(riskPercent)<0 || Number(riskPercent)>Number(maxRiskPercent))errors.push(`Risk exceeds the configured ${maxRiskPercent}% safety limit.`);
  if(Number(priceAgeMs)>Number(maxPriceAgeMs))errors.push(`Displayed price is stale (${Math.round(Number(priceAgeMs))} ms old). Trading is temporarily blocked.`);
  return {ok:errors.length===0,errors};
}

export function platformModeLabel(mode){
  if(mode==='maintenance')return 'MAINTENANCE';
  if(mode==='trading-disabled')return 'TRADING DISABLED';
  if(mode==='read-only')return 'READ ONLY';
  return 'NORMAL';
}
