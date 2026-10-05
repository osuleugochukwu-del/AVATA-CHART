export const PLAN_CATALOG = Object.freeze({
  free:{id:'free',name:'Free',savedWorkspaces:3,alerts:10,replayDays:7,ai:false,ads:true,privateIndicators:false},
  pro:{id:'pro',name:'Pro',savedWorkspaces:25,alerts:100,replayDays:90,ai:true,ads:false,privateIndicators:true},
  owner:{id:'owner',name:'Owner',savedWorkspaces:999,alerts:999,replayDays:365,ai:true,ads:false,privateIndicators:true}
});

export const DEFAULT_MONETIZATION_POLICY = Object.freeze({
  enabled:false,
  previewPlan:'owner',
  promotionsEnabled:false,
  promotionAudience:'free',
  promotionPlacement:'bottom',
  promotionDismissible:true
});

export function planFor(id='free'){ return PLAN_CATALOG[id] || PLAN_CATALOG.free; }
export function canUseFeature(planId,feature){ return !!planFor(planId)[feature]; }
export function shouldShowPromotion({planId='free',policy=DEFAULT_MONETIZATION_POLICY,dismissed=false}={}){
  if(dismissed || !policy?.promotionsEnabled) return false;
  return policy.promotionAudience==='all' || planId===policy.promotionAudience;
}
