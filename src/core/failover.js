export const DEFAULT_FAILOVER_POLICY=Object.freeze({
  leaseMs:15000,
  primaryStableBeforeFailbackMs:180000,
  staleLeaderGraceMs:3000,
  reconcileBeforeTrading:true,
  singleLeaderRequired:true
});

export function decideFailover({
  now=Date.now(),
  leader='oracle',
  leaderLeaseExpiresAt=0,
  oracleHealthy=true,
  googleHealthy=true,
  oracleStableSince=0,
  policy=DEFAULT_FAILOVER_POLICY
}={}){
  const leaseExpired=Number(now)>Number(leaderLeaseExpiresAt||0)+Number(policy.staleLeaderGraceMs||0);
  if(leader==='oracle'){
    if(oracleHealthy)return {leader:'oracle',action:'hold-primary',tradingAllowed:true,reconcile:false};
    if(!leaseExpired)return {leader:'oracle',action:'wait-for-lease-expiry',tradingAllowed:false,reconcile:false};
    if(googleHealthy)return {leader:'google',action:'failover-to-standby',tradingAllowed:false,reconcile:true};
    return {leader:null,action:'no-healthy-server',tradingAllowed:false,reconcile:false};
  }
  if(leader==='google'){
    if(!googleHealthy){
      if(!leaseExpired)return {leader:'google',action:'wait-for-lease-expiry',tradingAllowed:false,reconcile:false};
      if(oracleHealthy)return {leader:'oracle',action:'recover-to-primary',tradingAllowed:false,reconcile:true};
      return {leader:null,action:'no-healthy-server',tradingAllowed:false,reconcile:false};
    }
    const stableFor=oracleHealthy?Math.max(0,Number(now)-Number(oracleStableSince||now)):0;
    if(oracleHealthy&&stableFor>=policy.primaryStableBeforeFailbackMs)return {leader:'oracle',action:'controlled-failback',tradingAllowed:false,reconcile:true};
    return {leader:'google',action:'hold-standby-as-leader',tradingAllowed:true,reconcile:false};
  }
  if(oracleHealthy)return {leader:'oracle',action:'elect-primary',tradingAllowed:false,reconcile:true};
  if(googleHealthy)return {leader:'google',action:'elect-standby',tradingAllowed:false,reconcile:true};
  return {leader:null,action:'no-healthy-server',tradingAllowed:false,reconcile:false};
}

export const DEMO_FAILOVER_STATE=Object.freeze({
  leader:'oracle',
  oracle:{name:'Oracle Primary',status:'healthy',role:'ACTIVE',region:'Broker-near region',latencyMs:18},
  google:{name:'Google Standby',status:'ready',role:'WARM STANDBY',region:'Secondary region',latencyMs:26},
  leaderLease:'Valid',
  reconciliation:'Ready',
  lastFailover:'None in current demo session',
  duplicateOrders:0
});
