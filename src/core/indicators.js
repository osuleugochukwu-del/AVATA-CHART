export function ema(values, period) {
  if (!values.length || period <= 0) return [];
  const k = 2 / (period + 1);
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) result.push(values[i] * k + result[i - 1] * (1 - k));
  return result;
}

export function sma(values, period) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i-period];
    out.push(i + 1 < period ? null : sum / period);
  }
  return out;
}

export function atr(bars, period = 14) {
  if (!bars.length) return [];
  const tr = bars.map((b, i) => {
    if (i === 0) return b.high - b.low;
    const prev = bars[i-1].close;
    return Math.max(b.high-b.low, Math.abs(b.high-prev), Math.abs(b.low-prev));
  });
  return ema(tr, period);
}

export function rsi(values, period = 14) {
  if (values.length < 2) return values.map(() => null);
  const out = [null];
  let avgGain = 0, avgLoss = 0;
  for (let i=1;i<values.length;i++) {
    const d = values[i]-values[i-1];
    const gain = Math.max(0,d), loss = Math.max(0,-d);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      out.push(i < period ? null : 100 - 100/(1 + avgGain/Math.max(avgLoss,1e-12)));
    } else {
      avgGain = (avgGain*(period-1)+gain)/period;
      avgLoss = (avgLoss*(period-1)+loss)/period;
      out.push(100 - 100/(1 + avgGain/Math.max(avgLoss,1e-12)));
    }
  }
  return out;
}
