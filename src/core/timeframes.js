export const TIMEFRAME_GROUPS = [
  { id:'seconds', label:'Seconds', items:['1s','2s','3s','5s','10s','15s','20s','30s','45s'] },
  { id:'minutes', label:'Minutes', items:['1m','2m','3m','5m','10m','15m','30m','45m'] },
  { id:'hours', label:'Hours', items:['1h','2h','3h','4h','6h','8h','12h'] },
  { id:'days', label:'Days+', items:['D','W','M'] }
];

export const RENKO_PIP_SIZES = [1,2,3,5,10,15,20,25,30,50,75,100,150,200];
export const RANGE_PIP_SIZES = [1,2,3,5,10,15,20,25,30,50,75,100];

// Backward compatible: older saved favourites were plain timeframe strings.
export const DEFAULT_FAVORITES = ['1s','5s','15s','30s','1m','5m','15m'];

export function timeframeToMs(value){
  if(value==='D') return 86400000;
  if(value==='W') return 604800000;
  if(value==='M') return 2592000000;
  const m=String(value||'').trim().match(/^(\d+)(s|m|h)$/i);
  if(!m) return 300000;
  const n=Math.max(1,Number(m[1]));
  const unit=m[2].toLowerCase();
  return n*(unit==='s'?1000:unit==='m'?60000:3600000);
}

export function normalizeCustomTimeframe(value,unit='s'){
  const n=Math.max(1,Math.min(999,Math.round(Number(value)||1)));
  const u=['s','m','h'].includes(unit)?unit:'s';
  return `${n}${u}`;
}

export function intervalKey(kind='time',value='5m'){
  const cleanKind=['time','renko-time','renko-pips','range-pips'].includes(kind)?kind:'time';
  return cleanKind==='time'?String(value):`${cleanKind}:${value}`;
}

export function parseIntervalSpec(spec){
  const raw=String(spec||'5m');
  if(!raw.includes(':')) return {kind:'time',value:raw};
  const idx=raw.indexOf(':');
  const kind=raw.slice(0,idx);
  const value=raw.slice(idx+1);
  if(!['renko-time','renko-pips','range-pips','time'].includes(kind)) return {kind:'time',value:raw};
  return {kind,value};
}

export function intervalLabel(spec){
  const {kind,value}=parseIntervalSpec(spec);
  if(kind==='renko-time') return `R·${value}`;
  if(kind==='renko-pips') return `R·${value}p`;
  if(kind==='range-pips') return `RG·${value}p`;
  return value;
}

export function intervalTitle(spec){
  const {kind,value}=parseIntervalSpec(spec);
  if(kind==='renko-time') return `Renko · ${value} source interval`;
  if(kind==='renko-pips') return `Renko · ${value} pip brick`;
  if(kind==='range-pips') return `Range · ${value} pip bar`;
  return `Time · ${value}`;
}

export function isIntervalActive(spec,state){
  const {kind,value}=parseIntervalSpec(spec);
  if(kind==='renko-time') return state.chartType==='Renko' && state.renkoMode==='time' && state.timeframe===value;
  if(kind==='renko-pips') return state.chartType==='Renko' && state.renkoMode==='pips' && Number(state.renkoPips)===Number(value);
  if(kind==='range-pips') return state.chartType==='Range' && Number(state.rangePips)===Number(value);
  return !['Renko','Range'].includes(state.chartType) && state.timeframe===value;
}

export function toggleFavorite(list,value,max=9){
  const clean=[...new Set((list||[]).filter(Boolean))];
  if(clean.includes(value)) return clean.filter(x=>x!==value);
  return [...clean,value].slice(-max);
}
