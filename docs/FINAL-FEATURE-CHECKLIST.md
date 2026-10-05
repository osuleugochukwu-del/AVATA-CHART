# Trade Avata Chart — Consolidated Launch Checklist

This checklist captures the product behavior agreed before production backend deployment. Items described as **coded preview** exist in the current frontend/mock build. Items described as **production connection** require Firebase/VPS/cTrader infrastructure and are not yet live.

## 1. Interface / clean-chart behavior
- Chart remains the dominant surface on desktop and mobile.
- Mobile has no permanent right utility rail.
- Mobile dock: **Draw / Indicators / Trade / Replay / More**.
- Draw tools open temporarily and close after a tool is selected.
- Positions/Orders panel collapses independently.
- Blue mobile Trade button shows/hides the entire Sell / Risk / Buy strip.
- Desktop trading strip can hide/show and move between supported positions.
- Full clean-chart state is possible with trading strip and bottom panel hidden.
- Favorite timeframes occupy the top bar; full dropdown includes seconds upward and custom intervals.
- User workspace/layout/theme settings have persistence seams.

## 2. Professional chart navigation
- Free drag backward/forward through history.
- Moving away from current market switches Follow to **FREE**.
- One-click **LIVE** returns to present market.
- **FOLLOW** mode keeps current market anchored.
- Mouse wheel zooms time/candle density.
- Price scale can be manually stretched/compressed.
- Time scale can be manually changed.
- Price/time scale double-click reset behavior is supported in the native interaction layer.
- **RESET** restores position/zoom/price scale/right spacing/Follow.
- Right-side breathing space / chart shift is adjustable.
- Panel resizing should preserve useful visible range rather than unexpectedly jumping the chart.

## 3. Chart / indicator synchronization
- Candles and indicators use one timestamp/index coordinate system.
- Indicators calculate from the same complete synchronized bar series as the chart.
- Long indicators reserve hidden warm-up history before the visible viewport.
- Indicator values are sliced to the exact visible candle range after calculation.
- Production remote/private indicator responses must include symbol, timeframe, requested range/data revision and request identity.
- Late/out-of-date responses must be ignored rather than plotted onto a newer chart state.
- Incomplete indicator results must not distort autoscaling.
- Historical cache should avoid repeatedly downloading/recalculating already-loaded ranges.
- Stress test requirement before launch: long MA/EMA + rapid historical pan + interval changes + Live return without indicator detachment.

## 4. Chart engines / displays
- Time charts from seconds upward.
- Heikin-Ashi on the same time engine.
- Renko from configurable brick sizes.
- Range bars.
- Custom Sequence / Renko-Time engine seam pending exact formulas.
- Candles/OHLC/line/area display expansion can sit on top of the bar-building engine.
- Custom candle/background/grid/text/indicator/drawing/order colors.
- Log/percent/indexed scale expansion remains a professional-chart enhancement target.

## 5. Trading / risk manager
- cTrader is first planned real broker adapter; internal engine remains broker-neutral.
- Market / Limit / Stop / Stop-Limit where broker supports them.
- Default sizing = **Risk %**.
- Optional Fixed Lot / future Fixed Cash Risk modes.
- User places/adjusts Entry / Stop Loss / Take Profit lines visually.
- Account equity + chosen risk % + stop distance + symbol contract/pip/tick value determine automatic size.
- Moving SL recalculates volume so chosen risk remains approximately constant.
- Pre-trade overlay can show money risk, %, calculated lots, distance, potential reward and R multiple.
- Multiple take-profits / scale-outs.
- Individual close, partial close, editable SL/TP, break-even and trailing-stop controls.
- Multi-select positions.
- Close Selected / current symbol / profitable / losing / protected Close ALL.
- Close ALL requires explicit confirmation.
- Broker-native SL/TP protection preferred whenever available.
- User-configurable risk safeguards: max risk/trade, daily loss, max open risk, warn/confirm/block mode.

## 6. Low-latency / scalping safety
- Intended live data path: **broker/cTrader → VPS → WebSocket → chart**.
- Intended order path: **chart → VPS → broker**.
- Firebase is not placed in the live price/order hot path.
- Broker feed used for charting should match execution source wherever practical.
- Every live price/update carries timestamps and price age is monitored.
- Stale price state is visible and new trading is blocked when price age exceeds configured threshold.
- Owner telemetry includes broker-feed latency, chart-to-broker route latency and price age.
- Production VPS should be located close to broker infrastructure after actual broker region is known.
- Slippage/deviation controls and suitable pending orders should protect fast-market execution expectations.
- No marketing claim of “zero latency”; latency is measured and exposed.

## 7. Replay / workspaces
- Quick online replay controls.
- Offline replay package download/import.
- Simulated trading can reuse risk/SL/TP/partial-close logic.
- Compact vs precision replay data strategy.
- Private indicator output may be packaged without source where appropriate.
- 1/2/4 chart layouts.
- Optional sync switches for symbol/time/crosshair/zoom/drawings in future production workspace layer.
- Maximize one chart from a multi-chart layout target.

## 8. Drawings / lightweight retention
- Core drawing set: cursor/crosshair/trend/horizontal/rectangle/Fibonacci/text/risk/measure/magnet.
- Object Tree/lock/hide/duplicate expansion remains part of professional workspace direction.
- Launch drawing retention default: **7 days of inactivity**.
- User receives first-drawing retention notice.
- Production should warn shortly before expiry.
- Meaningful edit refreshes drawing expiry clock.
- Owner can change retention to 30/90/180/365 days or no automatic expiry without redesigning frontend.
- Similar short-retention philosophy applies to temporary screenshots, raw operational events, replay temp files and indicator build artifacts.

## 9. Indicators / secure JavaScript uploader
- Built-in public indicators can calculate client-side/worker-side when appropriate.
- Proprietary/private indicators belong in server-side protected execution.
- JavaScript/TypeScript uploader is **Owner Only** at launch.
- Owner can keep indicator Owner Only or grant selected-account access.
- Private source is never delivered to ordinary chart users.
- Mandatory gate: Upload → Build & Validate → static security scan → sandbox dry run → resource test → output-contract validation → Activate.
- Reject unrelated scripts that do not satisfy the Trade Avata indicator contract.
- Reject filesystem/environment/shell/dynamic execution/arbitrary network/dynamic import/DOM/worker access.
- Normal coding mistakes do not equal attacks.
- Repeated serious prohibited-code attempts can suspend future developer upload privilege.
- Even Owner indicators remain sandboxed in production so compromised pasted code cannot access broker/Firebase secrets.
- Production sandbox runs in separate unprivileged process/container/runtime with CPU/memory/time/network/file limits.

## 10. Browser / API / account security
- Owner/Admin MFA required for production.
- No broker credentials, Firebase Admin secrets or private indicator source in browser/public GitHub.
- Every sensitive backend action re-checks authentication and authorization.
- Least-privilege Firebase/Storage rules.
- Rate limits for login, API, market/history, alerts, screenshots, replay, indicator builds and trading actions.
- Session/WebSocket limits.
- Unique order idempotency keys prevent duplicate orders on retries/double taps.
- Validate account ownership, symbol, size, margin, connection state and current price freshness before order submission.
- Strong CSP/XSS-safe rendering, HTTPS/WSS, HSTS/security headers and restrictive CORS/origins in production.
- Secure/revocable sessions; future cross-subdomain SSO should not expose long-lived secrets in browser storage.
- Broker tokens encrypted and available only to broker gateway.
- Development/demo and production credentials/environments separated.
- Dependency lock/scanning and protected production branch/CI security checks.

## 11. VPS resilience / failover
- Planned **Oracle Primary + Google Warm Standby**.
- Exactly one trading leader at a time through shared lease/lock.
- Standby may take over only after health criteria and leader lease expiry.
- Before enabling orders after takeover, reconcile positions/orders/SL/TP against broker truth.
- Returning primary does not instantly seize leadership; stability wait + synchronization + controlled failback.
- Health probes evaluate broker gateway, market data, core API and trading engine, not only machine ping.
- Broker-native SL/TP remains protection if Trade Avata servers temporarily disappear.
- Split-brain/double-order prevention is mandatory before live trading.

## 12. Owner operations / analytics
- Users today/yesterday/this week/month.
- Online now / peak concurrent.
- New vs returning users.
- Trading users vs chart-only users.
- Replay/offline downloads/order activity.
- Country-level aggregate usage; exact physical location not required.
- Most-used features/symbols/timeframes/indicators can be added to aggregated production events.
- API/feed/order latency and price age.
- CPU/RAM/disk/WebSocket/service health.
- Broker/Firebase/private-indicator/replay/alerts health states.
- Platform modes: Normal / Trading Disabled / Read Only / Maintenance.
- Audit trail for sensitive admin/security/trading actions.
- Raw events short-lived; long-term daily aggregates retained more efficiently.

## 13. Screenshots / Journal / PWA
- Screenshot PNG download.
- Share-link backend seam.
- Send-to-Journal backend seam.
- Private-by-default sharing direction.
- Installable PWA, cached shell and offline replay support.
- Lazy/on-demand loading philosophy so advanced modules do not make normal chart use heavy.

## 14. Real-money release gate
- Public frontend/demo mode may launch before real-money trading.
- Live money remains disabled until real Firebase roles, cTrader gateway, stale-price protection, idempotency, reconciliation, audit/health monitoring, secure indicator sandbox and failover protections are connected and demo stress-tested.
