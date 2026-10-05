const FORBIDDEN = [
  {id:'process-env',severity:'critical',message:'Server environment access is prohibited.',re:/\bprocess\s*\.\s*env\b/i},
  {id:'node-require',severity:'critical',message:'Node require() is prohibited.',re:/\brequire\s*\(/i},
  {id:'node-fs',severity:'critical',message:'Filesystem access is prohibited.',re:/\b(?:node:)?fs\b|\bfs\s*\./i},
  {id:'child-process',severity:'critical',message:'Shell / child-process access is prohibited.',re:/\bchild_process\b|\bexecSync\b|\bspawn\s*\(/i},
  {id:'dynamic-eval',severity:'critical',message:'Dynamic code execution is prohibited.',re:/\beval\s*\(|\bnew\s+Function\b/i},
  {id:'network-fetch',severity:'high',message:'Arbitrary external network access is prohibited.',re:/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\s*\(/i},
  {id:'dynamic-import',severity:'high',message:'Arbitrary module imports are prohibited.',re:/\bimport\s*\(|\bimport\s+.+\s+from\s+/i},
  {id:'dom-access',severity:'high',message:'DOM/window access is not available inside indicator sandboxes.',re:/\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b/i},
  {id:'worker-create',severity:'high',message:'Indicators cannot create their own workers.',re:/\bnew\s+(?:Shared)?Worker\s*\(/i}
];

const INDICATOR_HINTS=[/\bta\s*\./i,/\bplot\s*\(/i,/\bsignal\s*\(/i,/\bcalculate\s*\(/i,/\bonBar\s*\(/i,/\bindicator\s*\(/i];

export function fingerprintSource(source=''){
  let h=2166136261;
  for(let i=0;i<source.length;i++){h^=source.charCodeAt(i);h=Math.imul(h,16777619);}
  return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}`;
}

export function scanIndicatorSource(source='', {maxBytes=200000}={}){
  const code=String(source||'');
  const issues=[];
  if(!code.trim())issues.push({id:'empty',severity:'error',category:'format',message:'Indicator source is empty.'});
  if(new TextEncoder().encode(code).length>maxBytes)issues.push({id:'too-large',severity:'error',category:'format',message:`Indicator source exceeds ${Math.round(maxBytes/1000)} KB.`});
  for(const rule of FORBIDDEN){if(rule.re.test(code))issues.push({...rule,category:'security'});}
  const looksLikeIndicator=INDICATOR_HINTS.some(re=>re.test(code));
  if(code.trim()&&!looksLikeIndicator)issues.push({id:'not-indicator',severity:'error',category:'format',message:'Code does not expose a recognized Trade Avata indicator calculation/plot interface.'});
  const securityViolations=issues.filter(x=>x.category==='security');
  const formatErrors=issues.filter(x=>x.category==='format');
  return {
    ok:issues.length===0,
    issues,
    securityViolations,
    formatErrors,
    sourceHash:fingerprintSource(code),
    buildId:`TA-IND-${fingerprintSource(code).slice(-8).toUpperCase()}`,
    looksLikeIndicator
  };
}

export function applyIndicatorSecurityStrike({strikes=0,blocked=false}={}, report, {limit=2,isOwner=false}={}){
  if(blocked)return {strikes,blocked:true,reason:'Indicator upload access is already suspended.'};
  const serious=!!report?.securityViolations?.length;
  if(!serious)return {strikes,blocked:false,reason:null};
  // Owner code is still rejected by the build gate and sandbox, but the owner account cannot be auto-locked out.
  if(isOwner)return {strikes,blocked:false,reason:'Owner build rejected; owner upload access remains available for recovery.'};
  const next=strikes+1;
  return {strikes:next,blocked:next>=limit,reason:next>=limit?'Repeated prohibited-code attempts triggered automatic indicator-upload suspension.':'Security violation recorded.'};
}

export const INDICATOR_SECURITY_POLICY=Object.freeze({
  uploaderDefaultRole:'owner',
  publicDeveloperUploadsEnabled:false,
  strikeLimit:2,
  sourceNeverSentToChartUsers:true,
  sandbox:{filesystem:false,environmentSecrets:false,brokerSecrets:false,arbitraryNetwork:false,shell:false,maxCpuMs:1500,maxMemoryMb:64}
});
