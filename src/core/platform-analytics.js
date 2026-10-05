function dayKey(ts){return new Date(ts).toISOString().slice(0,10);}
export function aggregateUsageEvents(events=[], now=Date.now()){
  const today=dayKey(now);const yesterday=dayKey(now-86400000);
  const byDay=new Map();const countryCounts=new Map();const online=new Set();
  for(const e of events){
    const d=dayKey(e.time||now);if(!byDay.has(d))byDay.set(d,new Map());
    const users=byDay.get(d);if(!users.has(e.userId))users.set(e.userId,{traded:false});
    if(e.type==='trade')users.get(e.userId).traded=true;
    if(d===today&&e.country)countryCounts.set(e.country,(countryCounts.get(e.country)||0)+1);
    if(e.online&&d===today)online.add(e.userId);
  }
  const todayUsers=byDay.get(today)||new Map();const yesterdayUsers=byDay.get(yesterday)||new Map();
  const traders=[...todayUsers.values()].filter(x=>x.traded).length;
  const countries=[...countryCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([country,events])=>({country,events}));
  return {todayUsers:todayUsers.size,yesterdayUsers:yesterdayUsers.size,online:online.size,traders,chartOnly:Math.max(0,todayUsers.size-traders),countries};
}

export const DEMO_OWNER_ANALYTICS = Object.freeze({
  todayUsers: 428,
  yesterdayUsers: 391,
  online: 73,
  traders: 118,
  chartOnly: 310,
  newUsers: 44,
  returningUsers: 384,
  peakConcurrent: 96,
  replayUsers: 84,
  offlineReplayDownloads: 27,
  ordersSubmitted: 625,
  orderSuccessRate: 99.4,
  avgApiLatencyMs: 82,
  countries:[
    {country:'Nigeria',users:184,pct:43},
    {country:'United Kingdom',users:51,pct:12},
    {country:'South Africa',users:42,pct:10},
    {country:'Ghana',users:31,pct:7},
    {country:'United States',users:27,pct:6},
    {country:'Other',users:93,pct:22}
  ]
});

export const DEMO_HEALTH = Object.freeze({
  overall:'healthy',
  uptimePct:99.98,
  cpuPct:24,
  ramPct:41,
  diskPct:28,
  websockets:73,
  services:[
    {name:'Market data',status:'healthy',detail:'Live feed'},
    {name:'Broker gateway',status:'healthy',detail:'12 ms'},
    {name:'Firebase',status:'healthy',detail:'Connected'},
    {name:'Private indicators',status:'healthy',detail:'Sandbox ready'},
    {name:'Replay service',status:'healthy',detail:'Ready'},
    {name:'Alerts',status:'healthy',detail:'Ready'}
  ]
});
