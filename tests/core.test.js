import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTimeBars, toHeikinAshi, buildRenko, buildRangeBars, generateBars } from '../src/core/market.js';
import { calculateRiskPlan, clampRiskPercent } from '../src/core/risk.js';
import { ema, rsi, atr } from '../src/core/indicators.js';
import { computeTradeAnalytics } from '../src/core/analytics.js';
import { createOfflineReplayPackage, parseOfflineReplayPackage, ReplaySession } from '../src/core/replay.js';
import { MockBrokerAdapter } from '../src/services/broker.js';

test('time aggregation builds OHLC correctly',()=>{
  const ticks=[
    {time:1000,price:10},{time:1200,price:12},{time:1800,price:9},{time:2100,price:11}
  ];
  const bars=aggregateTimeBars(ticks,1000);
  assert.equal(bars.length,2);
  assert.deepEqual([bars[0].open,bars[0].high,bars[0].low,bars[0].close],[10,12,9,9]);
});

test('heikin ashi preserves bar count and valid OHLC',()=>{
  const bars=generateBars({count:30,start:100,seed:2,stepMs:1000});
  const ha=toHeikinAshi(bars);
  assert.equal(ha.length,bars.length);
  for(const b of ha){assert.ok(b.high>=Math.max(b.open,b.close));assert.ok(b.low<=Math.min(b.open,b.close));}
});

test('renko bricks use exact brick size',()=>{
  const bars=[{time:1,open:100,high:100,low:100,close:100,volume:1},{time:2,open:100,high:104,low:100,close:104,volume:1}];
  const r=buildRenko(bars,1);
  assert.equal(r.length,4);
  assert.ok(r.every(b=>Math.abs(b.close-b.open)===1));
});

test('range bars finish around configured range',()=>{
  const bars=generateBars({count:50,start:100,seed:4,stepMs:1000});
  const r=buildRangeBars(bars,2);
  assert.ok(r.length>0);
});

test('risk plan keeps exact monetary risk',()=>{
  const p=calculateRiskPlan({equity:10000,riskPercent:1,entry:2431.8,stopLoss:2425.1,takeProfit:2444.2,pipSize:.1,pipValuePerLot:10});
  assert.equal(p.riskAmount,100);
  assert.ok(Math.abs(p.lotSize-0.1492537313)<1e-6);
  assert.ok(p.rewardRisk>1.8&&p.rewardRisk<1.9);
  assert.equal(clampRiskPercent(25,10),10);
});

test('indicator calculations return stable shapes',()=>{
  const bars=generateBars({count:100,start:100,seed:8,stepMs:1000});
  const closes=bars.map(b=>b.close);
  assert.equal(ema(closes,20).length,100);
  assert.equal(rsi(closes,14).length,100);
  assert.equal(atr(bars,14).length,100);
});

test('analytics computes wins and drawdown',()=>{
  const a=computeTradeAnalytics([{pnl:100},{pnl:-50},{pnl:25},{pnl:-10}]);
  assert.equal(a.trades,4);assert.equal(a.wins,2);assert.equal(a.losses,2);assert.equal(a.netPnl,65);assert.ok(a.maxDrawdown>=50);
});

test('offline replay package round-trips',()=>{
  const bars=generateBars({count:8,start:50,seed:1,stepMs:1000});
  const text=createOfflineReplayPackage({symbol:'XAUUSD',timeframe:'1s',bars});
  const parsed=parseOfflineReplayPackage(text);
  assert.equal(parsed.symbol,'XAUUSD');assert.equal(parsed.bars.length,8);
  const s=new ReplaySession(bars);assert.ok(s.visible().length>0);s.step(1);
});

test('mock broker supports modify and partial close',async()=>{
  const b=new MockBrokerAdapter();await b.connect();let p=(await b.positions())[0];await b.modifyPosition(p.id,{sl:2426});p=(await b.positions())[0];assert.equal(p.sl,2426);await b.closePosition(p.id,.5);p=(await b.positions())[0];assert.equal(p.size,.07);
});


test('mock broker supports pending orders and cancellation',async()=>{
  const b=new MockBrokerAdapter(); await b.connect();
  const o=await b.placeOrder({type:'Limit',symbol:'XAUUSD',side:'Buy',size:.1,entry:2400,sl:2390,tp:2420});
  assert.ok(o.id.startsWith('O-'));
  assert.equal((await b.orders()).length,1);
  await b.cancelOrder(o.id);
  assert.equal((await b.orders()).length,0);
});

import { timeframeToMs, normalizeCustomTimeframe, toggleFavorite } from '../src/core/timeframes.js';

test('timeframe utilities support seconds, custom intervals and favorites',()=>{
  assert.equal(timeframeToMs('1s'),1000);
  assert.equal(timeframeToMs('12s'),12000);
  assert.equal(timeframeToMs('2m'),120000);
  assert.equal(timeframeToMs('3h'),10800000);
  assert.equal(normalizeCustomTimeframe('12','s'),'12s');
  assert.deepEqual(toggleFavorite(['1s','5s'],'15s'),['1s','5s','15s']);
  assert.deepEqual(toggleFavorite(['1s','5s'],'5s'),['1s']);
});


test('mock broker supports protected bulk-close primitive',async()=>{
  const b=new MockBrokerAdapter(); await b.connect();
  await b.placeOrder({type:'Market',symbol:'EURUSD',side:'Sell',size:.10,entry:1.10,sl:1.11,tp:1.08});
  await b.placeOrder({type:'Market',symbol:'GBPUSD',side:'Buy',size:.20,entry:1.25,sl:1.24,tp:1.27});
  const before=await b.positions();
  assert.ok(before.length>=3);
  const ids=before.slice(0,2).map(p=>p.id);
  await b.closePositions(ids);
  const after=await b.positions();
  assert.equal(after.length,before.length-2);
  assert.ok(after.every(p=>!ids.includes(p.id)));
});

import { SlidingWindowRateLimiter, DuplicateGuard, validateTradeRequest } from '../src/core/platform-rules.js';
import { aggregateUsageEvents } from '../src/core/platform-analytics.js';

test('platform rules rate-limit bursts and block duplicates',()=>{
  const limiter=new SlidingWindowRateLimiter(2,1000);
  assert.equal(limiter.allow('u',1000),true);
  assert.equal(limiter.allow('u',1100),true);
  assert.equal(limiter.allow('u',1200),false);
  assert.equal(limiter.allow('u',2101),true);
  const dup=new DuplicateGuard(1000);
  assert.equal(dup.accept('order-1',1000),true);
  assert.equal(dup.accept('order-1',1500),false);
  assert.equal(dup.accept('order-1',2501),true);
});

test('trade request validation enforces LIVE state, ownership and risk cap',()=>{
  const ok=validateTradeRequest({connectionStatus:'live',platformMode:'normal',userId:'u1',accountOwnerId:'u1',riskPercent:2,size:.2,clientOrderId:'A'});
  assert.equal(ok.ok,true);
  const bad=validateTradeRequest({connectionStatus:'offline',platformMode:'normal',userId:'u1',accountOwnerId:'u2',riskPercent:12,size:0,clientOrderId:null});
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.length>=4);
});

test('usage analytics distinguishes trading and chart-only users',()=>{
  const now=Date.UTC(2026,9,4,12,0,0);
  const events=[
    {time:now,userId:'a',type:'view',country:'Nigeria',online:true},
    {time:now+100,userId:'a',type:'trade',country:'Nigeria',online:true},
    {time:now+200,userId:'b',type:'view',country:'Ghana',online:true},
    {time:now-86400000,userId:'c',type:'view',country:'Nigeria'}
  ];
  const a=aggregateUsageEvents(events,now);
  assert.equal(a.todayUsers,2);
  assert.equal(a.yesterdayUsers,1);
  assert.equal(a.traders,1);
  assert.equal(a.chartOnly,1);
  assert.equal(a.online,2);
});

import { scanIndicatorSource, applyIndicatorSecurityStrike } from '../src/core/indicator-security.js';
import { retentionExpiry, shouldWarnBeforeExpiry } from '../src/core/retention.js';
import { decideFailover, DEFAULT_FAILOVER_POLICY } from '../src/core/failover.js';
import { clampViewport, indicatorWarmupBars, synchronizedSlice, isStalePrice } from '../src/core/chart-sync.js';

test('indicator build gate accepts indicator-shaped code and rejects prohibited code',()=>{
  const good=scanIndicatorSource('function calculate(ctx){ const x=ta.ema(ctx.close,20); return plot(x); }');
  assert.equal(good.ok,true);
  assert.match(good.buildId,/^TA-IND-/);
  const bad=scanIndicatorSource('function calculate(){ return fetch("https://evil.example"); }');
  assert.equal(bad.ok,false);
  assert.ok(bad.securityViolations.some(x=>x.id==='network-fetch'));
  const unrelated=scanIndicatorSource('console.log("hello")');
  assert.equal(unrelated.ok,false);
  assert.ok(unrelated.formatErrors.some(x=>x.id==='not-indicator'));
});

test('security strikes block repeated future developer attacks but not normal errors',()=>{
  const securityReport=scanIndicatorSource('function calculate(){ return process.env.SECRET; }');
  let s=applyIndicatorSecurityStrike({strikes:0,blocked:false},securityReport,{limit:2,isOwner:false});
  assert.equal(s.strikes,1);assert.equal(s.blocked,false);
  s=applyIndicatorSecurityStrike(s,securityReport,{limit:2,isOwner:false});
  assert.equal(s.strikes,2);assert.equal(s.blocked,true);
  const formatOnly=scanIndicatorSource('hello world');
  const f=applyIndicatorSecurityStrike({strikes:0,blocked:false},formatOnly,{limit:2,isOwner:false});
  assert.equal(f.strikes,0);assert.equal(f.blocked,false);
});

test('drawing retention can expire, warn, or be permanent',()=>{
  const t=1_000_000;
  assert.equal(retentionExpiry(t,7),t+7*86400000);
  assert.equal(retentionExpiry(t,0),null);
  const exp=t+10*3600000;
  assert.equal(shouldWarnBeforeExpiry({expiresAt:exp,now:t,warningHours:24}),true);
});

test('failover waits for leader lease then elects warm standby and uses controlled failback',()=>{
  const now=100000;
  const waiting=decideFailover({now,leader:'oracle',leaderLeaseExpiresAt:now+5000,oracleHealthy:false,googleHealthy:true});
  assert.equal(waiting.action,'wait-for-lease-expiry');assert.equal(waiting.tradingAllowed,false);
  const failover=decideFailover({now:now+20000,leader:'oracle',leaderLeaseExpiresAt:now,oracleHealthy:false,googleHealthy:true});
  assert.equal(failover.leader,'google');assert.equal(failover.reconcile,true);assert.equal(failover.tradingAllowed,false);
  const failback=decideFailover({now:now+DEFAULT_FAILOVER_POLICY.primaryStableBeforeFailbackMs+5000,leader:'google',leaderLeaseExpiresAt:now,oracleHealthy:true,googleHealthy:true,oracleStableSince:now});
  assert.equal(failback.action,'controlled-failback');assert.equal(failback.reconcile,true);
});

test('chart viewport and indicator warm-up remain synchronized through history',()=>{
  const vp=clampViewport({totalBars:1400,visibleBars:125,offsetBars:300});
  assert.deepEqual([vp.start,vp.end],[975,1100]);
  const series=Array.from({length:1400},(_,i)=>i);
  const slice=synchronizedSlice(series,vp);
  assert.equal(slice.length,125);assert.equal(slice[0],975);assert.equal(slice.at(-1),1099);
  assert.equal(indicatorWarmupBars([{kind:'ema',length:200,visible:true},{kind:'private',lookback:600,visible:true}]),600);
});

test('stale prices are detected and trading validation blocks them',()=>{
  assert.equal(isStalePrice(1000,4000,2500),true);
  const bad=validateTradeRequest({connectionStatus:'live',platformMode:'normal',userId:'u',accountOwnerId:'u',riskPercent:1,size:.1,clientOrderId:'x',priceAgeMs:3000,maxPriceAgeMs:2500});
  assert.equal(bad.ok,false);assert.ok(bad.errors.some(x=>/stale/i.test(x)));
});

import { DEFAULT_AI_POLICY, canUseAI, validateAIRequest } from '../src/core/ai-policy.js';
import { planFor, shouldShowPromotion } from '../src/core/entitlements.js';

test('AI launch policy is owner-only and rate limited',()=>{
  assert.equal(canUseAI({role:'owner',policy:DEFAULT_AI_POLICY}),true);
  assert.equal(canUseAI({role:'member',policy:DEFAULT_AI_POLICY}),false);
  const ok=validateAIRequest({role:'owner',policy:DEFAULT_AI_POLICY,prompt:'Explain this chart',recentRequests:0,dailyRequests:0});
  assert.equal(ok.ok,true);
  const blocked=validateAIRequest({role:'owner',policy:DEFAULT_AI_POLICY,prompt:'Again',recentRequests:DEFAULT_AI_POLICY.requestsPerMinute,dailyRequests:0});
  assert.equal(blocked.ok,false);
  assert.ok(blocked.errors.some(x=>/rate limit/i.test(x)));
});

test('AI prompt length and daily quota are enforced',()=>{
  const long='x'.repeat(DEFAULT_AI_POLICY.maxPromptChars+1);
  assert.equal(validateAIRequest({role:'owner',policy:DEFAULT_AI_POLICY,prompt:long}).ok,false);
  assert.equal(validateAIRequest({role:'owner',policy:DEFAULT_AI_POLICY,prompt:'test',dailyRequests:DEFAULT_AI_POLICY.dailyRequests}).ok,false);
});

test('plan entitlements and promotion eligibility are policy driven',()=>{
  assert.equal(planFor('free').ads,true);
  assert.equal(planFor('pro').ads,false);
  assert.equal(planFor('owner').ai,true);
  assert.equal(shouldShowPromotion({planId:'free',policy:{promotionsEnabled:true,promotionAudience:'free'},dismissed:false}),true);
  assert.equal(shouldShowPromotion({planId:'pro',policy:{promotionsEnabled:true,promotionAudience:'free'},dismissed:false}),false);
  assert.equal(shouldShowPromotion({planId:'free',policy:{promotionsEnabled:true,promotionAudience:'free'},dismissed:true}),false);
});

test('professional interval specs support time, time-source Renko and pip Renko favourites',async()=>{
  const tf=await import('../src/core/timeframes.js');
  assert.equal(tf.intervalLabel('15s'),'15s');
  assert.equal(tf.intervalLabel('renko-time:5s'),'R·5s');
  assert.equal(tf.intervalLabel('renko-pips:10'),'R·10p');
  assert.deepEqual(tf.parseIntervalSpec('renko-pips:25'),{kind:'renko-pips',value:'25'});
  assert.ok(tf.RENKO_PIP_SIZES.includes(1));
  assert.ok(tf.RENKO_PIP_SIZES.includes(100));
});
