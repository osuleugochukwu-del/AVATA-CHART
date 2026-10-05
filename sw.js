const CACHE='trade-avata-chart-v5-2';
const CORE=[
  './index.html','./manifest.webmanifest','./public/styles.css','./public/icon.svg','./public/brand/trade-avata-logo.svg',
  './public/vendor/react.production.min.js','./public/vendor/react-dom.production.min.js',
  './src/main.js','./src/components/TopBar.js','./src/components/LeftToolbar.js','./src/components/RightSidebar.js',
  './src/components/BottomPanel.js','./src/components/TradeCalculator.js','./src/components/QuickTradeDock.js','./src/components/TradeTicket.js','./src/components/ChartSurface.js','./src/components/MobileDock.js','./src/components/PlatformOps.js','./src/components/ui.js',
  './src/core/market.js','./src/core/indicators.js','./src/core/risk.js','./src/core/analytics.js','./src/core/replay.js','./src/core/timeframes.js','./src/core/platform-rules.js','./src/core/platform-analytics.js','./src/core/indicator-security.js','./src/core/retention.js','./src/core/failover.js','./src/core/chart-sync.js','./src/core/ai-policy.js','./src/core/entitlements.js',
  './src/services/broker.js','./src/services/ctrader.js','./src/services/private-indicators.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
    const clone=res.clone();
    caches.open(CACHE).then(c=>c.put(e.request,clone));
    return res;
  }).catch(()=>caches.match('./index.html'))));
});
