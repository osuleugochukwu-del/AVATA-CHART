import { h, cx, number } from './ui.js';
import { platformModeLabel } from '../core/platform-rules.js';
import { drawingRetentionLabel } from '../core/retention.js';

export function PlatformOps({state,actions,analytics,health,rules}){
  const tab=state.opsTab||'overview';
  const tabs=['overview','health','resilience','security','storage','monetization','rules'];
  return h('div',{className:'modal-backdrop ops-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)actions.closeOps();}},
    h('section',{className:'ops-modal'},
      h('div',{className:'ops-head'},
        h('div',null,
          h('span',{className:'ops-kicker'},'OWNER OPERATIONS · PREVIEW / ARCHITECTURE CONTROL SURFACE'),
          h('h2',null,'Trade Avata Chart Operations')
        ),
        h('button',{onClick:actions.closeOps},'×')
      ),
      h('div',{className:'ops-tabs'},...tabs.map(x=>h('button',{key:x,className:cx(tab===x&&'active'),onClick:()=>actions.setOpsTab(x)},x[0].toUpperCase()+x.slice(1)))),
      h('div',{className:'ops-body'},
        tab==='health'?healthTab(health,state,actions):
        tab==='resilience'?resilienceTab(state,actions):
        tab==='security'?securityTab(state,rules):
        tab==='storage'?storageTab(state,actions):
        tab==='monetization'?monetizationTab(state,actions):
        tab==='rules'?rulesTab(rules,actions):
        overviewTab(analytics,state)
      )
    )
  );
}

function metric(label,value,sub){return h('div',{className:'ops-metric'},h('span',null,label),h('b',null,value),sub?h('small',null,sub):null);}

function overviewTab(a,state){
  const countryRows=a.countries.map(c=>h('div',{key:c.country},h('span',null,c.country),h('div',{className:'country-bar'},h('i',{style:{width:`${c.pct}%`}})),h('b',null,`${c.users} · ${c.pct}%`)));
  return h('div',null,
    h('div',{className:'ops-metrics'},
      metric('Users today',a.todayUsers,`Yesterday ${a.yesterdayUsers}`),metric('Online now',a.online,`Peak ${a.peakConcurrent}`),metric('Trading users',a.traders,'Placed/managed trades'),metric('Chart-only users',a.chartOnly,'No trade submitted'),metric('Replay users',a.replayUsers,`${a.offlineReplayDownloads} offline downloads`),metric('Orders today',a.ordersSubmitted,`${number(a.orderSuccessRate,1)}% success`)
    ),
    h('div',{className:'ops-two-col'},
      h('section',{className:'ops-card'},h('h3',null,'Usage mix'),h('div',{className:'ops-split'},h('div',null,h('b',null,a.newUsers),h('span',null,'New users')),h('div',null,h('b',null,a.returningUsers),h('span',null,'Returning users')),h('div',null,h('b',null,`${a.avgApiLatencyMs} ms`),h('span',null,'Avg API latency')))),
      h('section',{className:'ops-card'},h('h3',null,'Countries · country-level only'),h('div',{className:'country-list'},...countryRows))
    ),
    h('section',{className:'ops-card latency-card'},h('h3',null,'Scalping-path telemetry'),h('div',{className:'ops-split'},h('div',null,h('b',null,`${state.feedLatencyMs??'—'} ms`),h('span',null,'Broker feed → chart')),h('div',null,h('b',null,`${state.orderRouteLatencyMs??'—'} ms`),h('span',null,'Chart → broker route')),h('div',null,h('b',null,`${Math.max(0,Date.now()-(state.lastTickAt||Date.now()))} ms`),h('span',null,'Current price age'))),h('p',{className:'ops-note'},'Production values are measured continuously. Firebase is deliberately kept out of the live price/order execution path.')),
    h('p',{className:'ops-note'},'Production analytics should use aggregated operational events and country-level information. Exact physical location is not required for this dashboard.')
  );
}

function healthTab(hs,state,actions){
  const serviceRows=hs.services.map(s=>h('div',{key:s.name},h('span',{className:cx('service-dot',s.status)},'●'),h('b',null,s.name),h('span',null,s.detail),h('em',null,s.status.toUpperCase())));
  return h('div',null,
    h('div',{className:'health-banner'},h('span',{className:cx('health-dot',hs.overall)},'●'),h('div',null,h('b',null,'Platform health'),h('span',null,` ${hs.overall.toUpperCase()} · ${number(hs.uptimePct,2)}% uptime`))),
    h('div',{className:'ops-metrics compact'},metric('CPU',`${hs.cpuPct}%`),metric('RAM',`${hs.ramPct}%`),metric('Disk',`${hs.diskPct}%`),metric('WebSockets',hs.websockets)),
    h('section',{className:'ops-card'},h('h3',null,'Services'),h('div',{className:'service-list'},...serviceRows)),
    h('section',{className:'ops-card'},h('h3',null,'Owner safety mode'),h('p',{className:'muted'},'Preview control only. Production enforcement belongs on the VPS/API layer.'),h('div',{className:'mode-buttons'},...['normal','trading-disabled','read-only','maintenance'].map(m=>h('button',{key:m,className:cx(state.platformMode===m&&'active'),onClick:()=>actions.setPlatformMode(m)},platformModeLabel(m))))),
    h('button',{className:'secondary-btn',onClick:actions.simulateHealthIncident},'Preview degraded broker gateway')
  );
}

function resilienceTab(state,actions){
  const f=state.failoverState;
  const server=(x)=>h('div',{className:cx('failover-server',x.status)},h('div',{className:'server-top'},h('span',{className:'server-dot'},'●'),h('b',null,x.name),h('strong',null,x.role)),h('p',null,x.region),h('small',null,`Health: ${String(x.status).toUpperCase()} · network ${x.latencyMs} ms`));
  return h('div',null,
    h('div',{className:'failover-flow'},server(f.oracle),h('div',{className:'failover-link'},h('span',null,'single-leader lease'),h('b',null,f.leader==='oracle'?'→':'←')),server(f.google)),
    h('section',{className:'ops-card'},h('h3',null,'Automatic failover contract'),h('div',{className:'rules-grid'},h('div',null,h('span',null,'Current trading leader'),h('b',null,String(f.leader||'none').toUpperCase())),h('div',null,h('span',null,'Leader lock'),h('b',null,f.leaderLease)),h('div',null,h('span',null,'Broker reconciliation'),h('b',null,f.reconciliation)),h('div',null,h('span',null,'Duplicate orders'),h('b',null,f.duplicateOrders)),h('div',null,h('span',null,'Last failover'),h('b',null,f.lastFailover)),h('div',null,h('span',null,'Failback stability wait'),h('b',null,`${Math.round(state.failoverPolicy.primaryStableBeforeFailbackMs/60000)} min`))),h('p',{className:'ops-note'},'Only one server may execute orders. On failure the standby waits for the leader lease to expire, becomes leader, reconciles against the broker, then re-enables trading. Recovery uses controlled failback rather than instant bouncing.')),
    h('div',{className:'resilience-actions'},h('button',{className:'danger-btn',onClick:actions.simulatePrimaryFailure},'Simulate Oracle failure'),h('button',{className:'primary-btn',onClick:actions.simulatePrimaryRecovery},'Simulate stable recovery / failback')),
    h('p',{className:'ops-note'},'This screen models the intended Oracle-primary / Google-warm-standby architecture. Real failover requires a shared distributed lease/lock and production health probes.')
  );
}

function securityTab(state,rules){
  const items=[
    ['Owner/Admin MFA','Required',rules.ownerMfaRequired],['Secrets in browser/GitHub','Forbidden',true],['Backend authorization per action','Required',true],['Order idempotency','Required',rules.requireIdempotencyKey],['Stale-price trading lock',`${rules.maxPriceAgeMs} ms`,true],['Indicator uploader at launch','Owner Only',state.currentRole==='owner'],['Public developer uploads','OFF',!state.indicatorSecurityPolicy.publicDeveloperUploadsEnabled],['Private indicator filesystem','Blocked',!state.indicatorSecurityPolicy.sandbox.filesystem],['Private indicator outside network','Blocked',!state.indicatorSecurityPolicy.sandbox.arbitraryNetwork],['Indicator CPU limit',`${rules.privateIndicatorCpuMs} ms`,true],['Security strike limit',rules.indicatorSecurityStrikeLimit,true],['Close All confirmation','Required',true]
  ];
  return h('div',null,
    h('section',{className:'ops-card'},h('h3',null,'Launch security gates'),h('div',{className:'security-checklist'},...items.map(([name,value,ok])=>h('div',{key:name},h('span',{className:ok?'ok':'warn'},ok?'✓':'!'),h('b',null,name),h('strong',null,String(value)))))),
    h('section',{className:'ops-card rule-principles'},h('h3',null,'Indicator Build Gate'),h('p',null,'1. Owner-only upload at launch.'),h('p',null,'2. Indicator-format check: unrelated scripts are rejected.'),h('p',null,'3. Prohibited-code scan: filesystem, environment secrets, shell, arbitrary networking and dynamic execution are rejected.'),h('p',null,'4. Production sandbox dry-run with CPU/memory/time limits.'),h('p',null,'5. Output-contract validation before activation.'),h('p',null,'6. Future developer accounts: normal coding errors can be corrected; repeated serious prohibited-code attempts trigger upload suspension.')),
    h('p',{className:'ops-note'},'Frontend checks are only an early gate. Production security must be enforced server-side even if the browser is modified or bypassed.')
  );
}

function storageTab(state,actions){
  const p=state.retentionPolicy;
  return h('div',null,
    h('section',{className:'ops-card'},h('h3',null,'Lightweight retention policy'),h('div',{className:'retention-grid'},
      h('label',null,'Saved drawings',h('select',{value:String(p.drawingsDays),onChange:e=>actions.setDrawingRetention(e.target.value)},h('option',{value:'7'},'7 days'),h('option',{value:'30'},'30 days'),h('option',{value:'90'},'3 months'),h('option',{value:'180'},'6 months'),h('option',{value:'365'},'1 year'),h('option',{value:'0'},'No automatic expiry'))),
      h('div',null,h('span',null,'Current policy'),h('b',null,drawingRetentionLabel(p.drawingsDays))),
      h('div',null,h('span',null,'User warning'),h('b',null,`${p.drawingWarningHours}h before expiry`)),
      h('div',null,h('span',null,'Temporary screenshots'),h('b',null,`${p.screenshotsDays} days`)),
      h('div',null,h('span',null,'Raw operational events'),h('b',null,`${p.rawAnalyticsDays} days`)),
      h('div',null,h('span',null,'Indicator build artifacts'),h('b',null,`${p.indicatorBuildArtifactsHours} hours`))
    ),h('p',{className:'ops-note'},'A drawing edit refreshes its expiry clock. Daily aggregate analytics can be retained longer than raw event records. Policy values are backend-configurable so retention can be extended later without redesigning the chart.'))
  );
}


function monetizationTab(state,actions){
  const ai=state.aiPolicy||{}; const m=state.monetizationPolicy||{};
  return h('div',null,
    h('section',{className:'ops-card'},h('h3',null,'AI access · launch default Owner Only'),
      h('div',{className:'mode-buttons'},...['owner','all','off'].map(v=>h('button',{key:v,className:cx((ai.audience||'owner')===v&&'active'),onClick:()=>actions.setAIAudience(v)},v==='owner'?'Owner Only':v==='all'?'All eligible users':'AI Off'))),
      h('div',{className:'rules-grid ai-rule-grid'},
        h('div',null,h('span',null,'Requests / minute'),h('b',null,ai.requestsPerMinute)),
        h('div',null,h('span',null,'Daily requests'),h('b',null,ai.dailyRequests)),
        h('div',null,h('span',null,'Max prompt'),h('b',null,`${ai.maxPromptChars} chars`)),
        h('div',null,h('span',null,'Autonomous trade execution'),h('b',null,'BLOCKED'))
      ),
      h('div',{className:'resilience-actions'},h('button',{className:'primary-btn',onClick:actions.openAI},'Open Owner AI')),h('p',{className:'ops-note'},'AI is outside the live broker execution path. Production requests require authenticated server-side rate limits, quota checks, audit events and redaction of secrets.')),
    h('section',{className:'ops-card'},h('h3',null,'Monetization / entitlement foundation'),
      h('div',{className:'settings-row'},h('label',null,'Preview plan',h('select',{value:state.currentPlan,onChange:e=>actions.setPlan(e.target.value)},h('option',{value:'free'},'Free'),h('option',{value:'pro'},'Pro'),h('option',{value:'owner'},'Owner'))),h('label',{className:'toggle-line'},h('input',{type:'checkbox',checked:!!m.promotionsEnabled,onChange:e=>actions.setPromotionPolicy('promotionsEnabled',e.target.checked)}),' Enable small promotion slot')),
      h('div',{className:'rules-grid'},
        h('div',null,h('span',null,'Free'),h('b',null,'Limited storage/features · ads eligible')),
        h('div',null,h('span',null,'Pro'),h('b',null,'Expanded limits · ads off')),
        h('div',null,h('span',null,'Owner'),h('b',null,'All controls · AI by default')),
        h('div',null,h('span',null,'Promotion placement'),h('b',null,'Bottom safe-area slot'))
      ),
      h('p',{className:'ops-note'},'The plan/entitlement seam exists now so future pricing, feature limits and promotions can be changed from backend policy instead of redesigning the chart. Promotions must never cover trade controls, price scales or Close All.'))
  );
}

function rulesTab(r,actions){
  const entries=[['Active sessions / user',r.maxActiveSessionsPerUser],['WebSocket connections / user',r.maxWebSocketConnectionsPerUser],['Market requests / second',r.marketRequestsPerSecond],['Historical requests / minute',r.historicalRequestsPerMinute],['Order requests / second',r.orderRequestsPerSecond],['Duplicate order window',`${r.duplicateOrderWindowMs/1000}s`],['Maximum price age',`${r.maxPriceAgeMs} ms`],['Maximum trade risk',`${r.maxTradeRiskPercent}%`],['Replay download range',`${r.maxReplayDownloadDays} days`],['Screenshot uploads / minute',r.screenshotUploadsPerMinute],['Screenshot max size',`${r.maxScreenshotMb} MB`],['Private indicator CPU',`${r.privateIndicatorCpuMs} ms`],['Private indicator memory',`${r.privateIndicatorMemoryMb} MB`],['Indicator security strikes',r.indicatorSecurityStrikeLimit],['Max alerts',r.maxAlertsPerUser],['Saved workspaces',r.maxSavedWorkspaces]];
  return h('div',null,
    h('section',{className:'ops-card'},h('h3',null,'Backend protection rules'),h('div',{className:'rules-grid'},...entries.map(([k,v])=>h('div',{key:k},h('span',null,k),h('b',null,v))))),
    h('section',{className:'ops-card rule-principles'},h('h3',null,'Enforcement principles'),h('p',null,'✓ Every expensive or dangerous action gets a limit, permission check, validation and audit trail.'),h('p',null,'✓ Duplicate order IDs are rejected, order bursts are rate-limited, stale prices are blocked, and trading requires LIVE broker state.'),h('p',null,'✓ Private indicators run outside the trusted broker/auth backend and never receive secrets.'),h('p',null,'✓ Close All / cancel-all actions remain confirmation-protected and sensitive owner actions are audited.'),h('p',null,'✓ Raw analytics and temporary artifacts expire; long-lived aggregates remain lightweight.'))
  );
}
