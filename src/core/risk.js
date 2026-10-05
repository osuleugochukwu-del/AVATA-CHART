export function calculateRiskPlan({ equity, riskPercent, entry, stopLoss, takeProfit, pipSize, pipValuePerLot }) {
  const riskAmount = equity * (riskPercent / 100);
  const stopDistance = Math.abs(entry - stopLoss);
  const pipDistance = stopDistance / pipSize;
  const lotSize = pipDistance > 0 ? riskAmount / (pipDistance * pipValuePerLot) : 0;
  const rewardDistance = Math.abs(takeProfit - entry);
  const rewardPips = rewardDistance / pipSize;
  const rewardAmount = lotSize * rewardPips * pipValuePerLot;
  return {
    riskAmount,
    pipDistance,
    lotSize,
    rewardPips,
    rewardAmount,
    rewardRisk: riskAmount > 0 ? rewardAmount / riskAmount : 0
  };
}

export function clampRiskPercent(value, max = 10) {
  return Math.min(Math.max(Number(value) || 0, 0), max);
}
