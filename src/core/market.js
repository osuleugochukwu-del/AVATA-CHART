export const SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold Spot / U.S. Dollar', asset: 'Commodity · CFD', last: 2432.71, change: 12.36, changePct: 0.51, pipSize: 0.1, pipValuePerLot: 10 },
  { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', asset: 'Forex', last: 1.0764, change: 0.0021, changePct: 0.20, pipSize: 0.0001, pipValuePerLot: 10 },
  { symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', asset: 'Forex', last: 1.2618, change: -0.0034, changePct: -0.27, pipSize: 0.0001, pipValuePerLot: 10 },
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', asset: 'Crypto', last: 67345.2, change: 892.6, changePct: 1.34, pipSize: 1, pipValuePerLot: 1 },
  { symbol: 'NAS100', name: 'Nasdaq 100', asset: 'Index · CFD', last: 20118.6, change: 54.8, changePct: 0.27, pipSize: 1, pipValuePerLot: 1 },
  { symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', asset: 'Forex', last: 154.21, change: 0.36, changePct: 0.23, pipSize: 0.01, pipValuePerLot: 6.5 },
  { symbol: 'USOIL', name: 'WTI Crude Oil', asset: 'Commodity · CFD', last: 68.42, change: -0.71, changePct: -1.03, pipSize: 0.01, pipValuePerLot: 10 },
  { symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', asset: 'Crypto', last: 2642.8, change: 36.4, changePct: 1.40, pipSize: 0.1, pipValuePerLot: 1 }
];

export const DEFAULT_TIMEFRAMES = ['1s','5s','15s','30s','1m','5m','15m','1h','4h','D','W'];
export const CHART_TYPES = ['Candles','Heikin-Ashi','Renko','Range'];

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateBars({ count = 180, start = 2415, seed = 42, stepMs = 300000 } = {}) {
  const rand = mulberry32(seed);
  const bars = [];
  let price = start;
  let trend = 0.12;
  let ts = Date.now() - count * stepMs;
  for (let i = 0; i < count; i++) {
    if (i % 36 === 0) trend = (rand() - 0.42) * 0.65;
    const noise = (rand() - 0.5) * 2.2;
    const open = price;
    const close = Math.max(1, open + trend + noise);
    const high = Math.max(open, close) + rand() * 1.6;
    const low = Math.min(open, close) - rand() * 1.6;
    const volume = 900 + Math.round(rand() * 3600);
    bars.push({ time: ts, open, high, low, close, volume });
    price = close;
    ts += stepMs;
  }
  return bars;
}

export function aggregateTimeBars(ticksOrBars, intervalMs) {
  if (!ticksOrBars.length) return [];
  const buckets = new Map();
  for (const item of ticksOrBars) {
    const time = item.time;
    const bucket = Math.floor(time / intervalMs) * intervalMs;
    const price = item.price ?? item.close;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, {
        time: bucket,
        open: item.open ?? price,
        high: item.high ?? price,
        low: item.low ?? price,
        close: item.close ?? price,
        volume: item.volume ?? 1
      });
    } else {
      const b = buckets.get(bucket);
      b.high = Math.max(b.high, item.high ?? price);
      b.low = Math.min(b.low, item.low ?? price);
      b.close = item.close ?? price;
      b.volume += item.volume ?? 1;
    }
  }
  return [...buckets.values()].sort((a,b) => a.time - b.time);
}

export function toHeikinAshi(bars) {
  if (!bars.length) return [];
  const out = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const close = (b.open + b.high + b.low + b.close) / 4;
    const open = i === 0 ? (b.open + b.close) / 2 : (out[i-1].open + out[i-1].close) / 2;
    const high = Math.max(b.high, open, close);
    const low = Math.min(b.low, open, close);
    out.push({ ...b, open, high, low, close });
  }
  return out;
}

export function buildRenko(bars, brickSize) {
  if (!bars.length || brickSize <= 0) return [];
  const out = [];
  let anchor = bars[0].close;
  for (const bar of bars) {
    let diff = bar.close - anchor;
    while (Math.abs(diff) >= brickSize) {
      const direction = Math.sign(diff);
      const open = anchor;
      const close = anchor + direction * brickSize;
      out.push({ time: bar.time, open, close, high: Math.max(open, close), low: Math.min(open, close), volume: bar.volume, renko: true });
      anchor = close;
      diff = bar.close - anchor;
    }
  }
  return out;
}

export function buildRangeBars(bars, rangeSize) {
  if (!bars.length || rangeSize <= 0) return [];
  const out = [];
  let current = null;
  for (const bar of bars) {
    if (!current) current = { time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
    else {
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
    }
    if (current.high - current.low >= rangeSize) {
      out.push(current);
      current = null;
    }
  }
  if (current) out.push(current);
  return out;
}
