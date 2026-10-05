# Trade Avata Chart — Build Status 0.4.0 Final Frontend Baseline

## Consolidated update implemented

### Chart behavior / synchronization
- Added professional free-pan history navigation with `FREE` / `FOLLOW` state.
- Added one-click `LIVE` return and full `RESET`.
- Added mouse-wheel time zoom plus native pointer handling for chart pan, price-scale drag and time-scale drag.
- Added right-side chart shift / breathing-space cycling.
- Added latency + price-age strip and stale-price display state.
- Added stale-price validation to the trading gate.
- Increased demo history to 1,400 bars for deeper navigation testing.
- Indicator calculations now run against the full synchronized bar series and are then sliced to the exact candle viewport.
- Added indicator warm-up calculation and synchronization badge to prevent long MA/EMA detachment while moving through history.

### Trading / clean chart
- Preserved mobile blue Trade toggle and independent Positions panel collapse.
- Preserved desktop hide/show/reposition behavior.
- Percentage-risk sizing remains the default, fixed lots remain optional.
- Draggable Entry / SL / TP risk lines remain hidden until requested.
- Moving protection lines updates the automatic risk/lot model.
- Existing individual, partial and protected bulk-close workflows remain intact.

### Security / indicator gate
- Added owner-only JavaScript/TypeScript build-gate module.
- Added indicator-format scan, prohibited-code scan, source fingerprint/build ID and future security-strike policy.
- Serious security checks include environment/filesystem/shell/dynamic execution/network/dynamic import/DOM/worker access.
- Production sandbox requirements are explicitly represented but not falsely marked as connected.

### Retention / lightweight storage policy
- Added configurable drawing retention with 7-day launch default.
- Added first-drawing notice and policy wording.
- Added owner-configurable 30/90/180/365/permanent retention options.
- Added separate temporary-retention policy seams for screenshots, raw analytics, replay artifacts and build artifacts.

### Operations / resilience
- Expanded Owner Operations with Resilience, Security, Storage and Rules tabs.
- Added Oracle-primary / Google-warm-standby failover preview with one-leader lease, reconciliation state and controlled failback.
- Added feed/order-route/price-age telemetry surfaces.
- Added owner/admin MFA requirement marker, idempotency requirement, stale-price rule and private-indicator runtime limits.

## Verification — final run

- `npm test`: **25/25 PASS**
- `npm run verify`: **PASS** — 35 resolved project/service-worker references
- Recursive `node --check` on source JS + service worker: **PASS**
- Local HTTP fetch of explicit service-worker pre-cache paths: **34/34 PASS**
- Chromium in-memory browser smoke: **PASS, 0 page errors, 0 console errors**

Browser smoke specifically exercised:
1. Desktop app/chart render and LIVE broker-demo state
2. Native chart pan into history → FREE mode + LIVE return button
3. Native non-passive wheel zoom
4. LIVE return and RESET
5. Risk % sizing + draggable Entry/SL/TP lines
6. Desktop clean-chart state
7. Oracle → Google failover preview and controlled recovery
8. Security operations page
9. Owner-only safe indicator Build & Validate PASS
10. Prohibited `fetch()` indicator Build & Validate REJECT
11. Mobile clean-chart mode with no permanent right rail
12. Temporary Draw drawer + first-drawing 7-day retention notice
13. Mobile blue Trade toggle shows/hides entire Sell/Risk/Buy strip

Screenshots from that passing run are stored as `docs/tested-final-*.png`.

## Still intentionally pending production connections

- Firebase auth/role enforcement/settings sync
- Real cTrader feed/order gateway
- Real broker/VPS latency measurements and region tuning
- Real distributed leader lease for Oracle/Google failover
- Real service monitoring/analytics/audit pipeline
- Production OS/container indicator sandbox/Vault
- Hosted screenshot/Journal storage

The frontend must remain demo-only until these are connected and tested with demo broker accounts before any live-money release.
