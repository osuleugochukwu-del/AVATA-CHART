export const DEFAULT_AI_POLICY = Object.freeze({
  enabled:true,
  audience:'owner', // owner | all | off
  requestsPerMinute:6,
  dailyRequests:100,
  maxPromptChars:1200,
  allowTradeExecution:false,
  allowSecretAccess:false,
  audit:true
});

export function canUseAI({role='member',policy=DEFAULT_AI_POLICY}={}){
  if(!policy?.enabled || policy.audience==='off') return false;
  if(policy.audience==='all') return true;
  return role==='owner';
}

export function validateAIRequest({role='member',policy=DEFAULT_AI_POLICY,prompt='',recentRequests=0,dailyRequests=0}={}){
  const errors=[];
  if(!canUseAI({role,policy})) errors.push('AI access is not enabled for this account.');
  const text=String(prompt||'').trim();
  if(!text) errors.push('Enter a question first.');
  if(text.length>Number(policy.maxPromptChars||1200)) errors.push(`Prompt exceeds ${policy.maxPromptChars} characters.`);
  if(recentRequests>=Number(policy.requestsPerMinute||6)) errors.push('AI rate limit reached. Try again shortly.');
  if(dailyRequests>=Number(policy.dailyRequests||100)) errors.push('Daily AI allowance reached.');
  return {ok:errors.length===0,errors};
}

export function safeAICapabilities(){
  return ['chart-explanation','journal-summary','performance-review','indicator-assistant','owner-ops-summary'];
}
