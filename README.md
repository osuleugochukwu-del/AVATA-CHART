# Trade Avata Chart — Advanced UI 0.5.2

Trade Avata Chart 0.5.2 preserves the professional 0.4.0 visual shell and adds the requested zero-gap chart overlays, deeper chart customization, mobile safe-area handling, Owner-only AI controls and monetization/entitlement seams without simplifying the interface.

## What is coded in this baseline

### Professional chart behavior
- Free horizontal history pan with automatic switch from **FOLLOW** to **FREE** mode.
- One-click **LIVE** return to the newest market bar after browsing history.
- Mouse-wheel zoom; draggable time scale and price scale; double-click scale reset.
- **RESET** restores time position, zoom, price scale, right spacing and Follow state.
- Configurable right-side breathing space / chart shift.
- EMA/indicator calculation is performed on the synchronized full bar series and sliced to the exact candle viewport.
- Indicator warm-up reserve prevents long moving averages from being calculated from an incomplete visible window.
- Old/stale chart requests can be discarded by the production data-revision contract.
- Price age and feed-latency status are visible; stale-price validation blocks new trading when the configured age limit is exceeded.
- Candles, Heikin-Ashi, Renko and Range transformations remain available.
- Favorite/custom intervals, including seconds intervals, remain available.

### Clean mobile and desktop trading
- Mobile bottom dock remains **Draw / Indicators / Trade / Replay / More** with no permanent right utility rail.
- Blue **Trade** button toggles the entire Sell / Risk / Buy strip on and off.
- Positions/Orders panel is independently collapsible.
- Desktop Trade control can hide/show the strip; the strip can be moved between supported positions.
- Default sizing is **Risk %**; fixed lots remain optional.
- Entry / Stop Loss / Take Profit risk lines are hidden until requested and can be dragged.
- Changing the stop updates the automatic percentage-risk sizing model.
- Individual close, editable SL/TP, partial close, break-even, trailing stop and protected multi-position bulk close remain present.

### Lightweight retention
- Saved drawing retention defaults to **7 days of inactivity** in the launch policy.
- The first drawing shows a user-facing storage notice.
- Editing a drawing refreshes its retention clock in the production data model.
- Owner can change retention to 30/90/180/365 days or no automatic expiry without redesigning the UI.
- Temporary screenshots, raw operational analytics, replay artifacts and indicator build artifacts have separate retention seams.

### JavaScript indicator security
- JavaScript/TypeScript uploader is **Owner Only** in the launch configuration.
- Mandatory **Build & Validate** gate checks indicator shape and prohibited code before activation.
- Static gate rejects filesystem/server-environment access, shell/child-process access, dynamic execution, arbitrary networking, dynamic imports, DOM/browser storage access and worker creation.
- Normal code/format mistakes are distinguishable from serious security violations.
- Future non-owner developer accounts can be suspended from indicator uploads after repeated serious prohibited-code attempts.
- Production still requires a separate unprivileged sandbox with CPU/memory/time/network/file restrictions. Indicator source must never share privileges with Firebase Admin or the broker gateway.

### Owner Operations / platform health
- Users today/yesterday, online/peak, trading vs chart-only, replay/order usage and country-level aggregates.
- Feed-to-chart, chart-to-broker route and current price-age telemetry surfaces.
- CPU/RAM/disk/WebSocket and service-health preview surfaces.
- Normal / Trading Disabled / Read Only / Maintenance safety modes.
- Oracle-primary / Google-warm-standby failover model with one trading leader, lease state, broker reconciliation and controlled failback.
- Backend rule surfaces for rate limits, sessions, WebSockets, replay/storage quotas, stale-price lock, private-indicator limits and order idempotency.


### 0.5.1 additions without redesigning the shell
- The 0.4 advanced toolbar/sidebar/bottom-panel/mobile navigation remains the visual baseline.
- Price canvas starts immediately under the toolbar; symbol/OHLC/indicator/sync data floats transparently over candles and can be hidden independently.
- Buy / Risk % / Sell is deliberately compact and floating; Trade toggles it off completely.
- Chart customization now separates candle body/wick/border, background, grid, scale text, crosshair, volume and current-price colors.
- Theme modes include Dark / Light / System / Custom.
- Mobile controls honor device safe-area insets above Android/iOS system navigation.
- Trade Avata AI is Owner Only by default with per-minute, daily and prompt-size limits; Owner can later enable eligible users or switch AI off. AI is outside broker execution and cannot autonomously trade.
- Free / Pro / Owner entitlement and small promotion-slot seams exist for future monetization; promotions are OFF by default.

## Run locally

No npm install is required for the current preview because React is vendored locally.

```bash
cd trade-avata-chart
python -m http.server 4173
```

Then open `http://localhost:4173/`.


## 0.5.2 compact desktop update
- Tiny centered desktop SELL / Risk% / BUY strip; independently hideable.
- Advanced trade controls slide in as a right-side drawer on desktop.
- One-click hide/show-all indicators plus normal indicator dropdown/edit controls.
- Desktop symbol click opens Chart Settings; a separate symbol-search control remains.
- Full/compact/hidden symbol and indicator label modes.
- Interval browser now includes Time, Renko source-time, Renko pip bricks and Range pip bars; every option can be favorited to the top bar.
- Owner-only AI entry is visible to the Owner in the desktop toolbar.
- Approved mobile design is intentionally unchanged.

## Verification performed for 0.5.2

- Node automated suite: **33/33 PASS**.
- JavaScript syntax validation: **PASS**.
- Project integrity verifier: **PASS** (`37` service-worker assets resolved).
- Local HTTP fetch check of explicit service-worker pre-cache paths: **PASS**.
- Layout-regression tests specifically protect the 0.4 top toolbar and compact Buy/Risk/Sell strip while confirming zero-gap overlays and mobile safe-area rules.
- The current execution environment blocks Chromium navigation to local/private URLs by administrator policy, so this revision does not claim a fresh browser-navigation screenshot. The previously tested 0.4 visual-reference screenshots remain in `docs/` because that is the interface intentionally preserved.

## Production boundary — important

This package is still a **frontend/demo baseline**. The current broker is a local mock adapter. The following are architecture seams/previews and are **not yet live production services**:

- Firebase shared authentication/roles/settings sync
- cTrader live market data and real order execution
- measured real-world VPS/broker latency
- Oracle/Google automatic production failover and distributed leader lock
- real owner analytics/health ingestion and audit storage
- production private-indicator sandbox/Vault
- hosted screenshot links / direct Journal storage

Do not use this package for live-money trading until the real backend, broker gateway, security controls, reconciliation, failover and demo stress tests are connected and verified.
