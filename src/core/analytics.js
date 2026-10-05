export function computeTradeAnalytics(trades = []) {
  const closed = trades.filter(t => Number.isFinite(t.pnl));
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const grossProfit = wins.reduce((s,t)=>s+t.pnl,0);
  const grossLoss = Math.abs(losses.reduce((s,t)=>s+t.pnl,0));
  const netPnl = closed.reduce((s,t)=>s+t.pnl,0);
  let equity = 0, peak = 0, maxDrawdown = 0;
  for (const t of closed) {
    equity += t.pnl;
    peak = Math.max(peak,equity);
    maxDrawdown = Math.max(maxDrawdown, peak-equity);
  }
  return {
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? (wins.length/closed.length)*100 : 0,
    netPnl,
    averageWin: wins.length ? grossProfit/wins.length : 0,
    averageLoss: losses.length ? grossLoss/losses.length : 0,
    profitFactor: grossLoss ? grossProfit/grossLoss : grossProfit ? Infinity : 0,
    maxDrawdown
  };
}
