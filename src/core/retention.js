export const DEFAULT_RETENTION_POLICY=Object.freeze({
  drawingsDays:7,
  drawingWarningHours:24,
  screenshotsDays:7,
  rawAnalyticsDays:7,
  indicatorBuildArtifactsHours:24,
  replayTempDays:7
});

export function retentionExpiry(updatedAt=Date.now(),days=7){
  const d=Number(days);
  if(!Number.isFinite(d)||d<=0)return null;
  return Number(updatedAt)+d*86400000;
}

export function drawingRetentionLabel(days){
  const d=Number(days);
  if(!Number.isFinite(d)||d<=0)return 'Keep until manually deleted';
  if(d===1)return '1 day';
  if(d<30)return `${d} days`;
  if(d===30)return '1 month';
  if(d===90)return '3 months';
  if(d===180)return '6 months';
  if(d===365)return '1 year';
  return `${d} days`;
}

export function shouldWarnBeforeExpiry({expiresAt,now=Date.now(),warningHours=24}={}){
  if(!expiresAt)return false;
  const remaining=Number(expiresAt)-Number(now);
  return remaining>0&&remaining<=Number(warningHours)*3600000;
}
