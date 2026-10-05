export class ReplaySession {
  constructor(bars = []) {
    this.bars = bars;
    this.index = Math.min(50, Math.max(0, bars.length - 1));
    this.playing = false;
    this.speed = 1;
  }
  visible() { return this.bars.slice(0, this.index + 1); }
  step(amount = 1) { this.index = Math.min(this.bars.length - 1, Math.max(0, this.index + amount)); return this.visible(); }
  jumpTo(index) { this.index = Math.min(this.bars.length - 1, Math.max(0, index)); return this.visible(); }
}

export function createOfflineReplayPackage({ symbol, timeframe, bars, privateOutputs = {} }) {
  return JSON.stringify({ version: 1, symbol, timeframe, createdAt: Date.now(), bars, privateOutputs });
}

export function parseOfflineReplayPackage(text) {
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.bars)) throw new Error('Unsupported replay package');
  return data;
}
