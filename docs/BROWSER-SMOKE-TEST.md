# Browser Smoke Test — Trade Avata Chart 0.4.0

Date: 2026-10-05

The final UI was rendered in Chromium from the current source through an in-memory module harness. Direct localhost/file navigation is restricted in this execution environment, so the harness loaded the same current JavaScript modules, local vendored React/ReactDOM, CSS and official Trade Avata logo into Chromium without changing the application source.

## Result

**PASS — 0 page errors / 0 console errors**

## Interactions exercised

- Desktop render / demo broker LIVE state
- Historical chart pan using native pointer events
- FOLLOW → FREE transition
- LIVE return button
- Mouse wheel zoom using a non-passive native wheel listener
- RESET chart navigation
- Percentage Risk sizing
- Draggable Entry / Stop Loss / Take Profit lines
- Desktop trading strip hide + Positions panel collapse
- Oracle primary → Google warm-standby failover preview
- Controlled failback to Oracle
- Security operations UI
- Owner-only JavaScript indicator safe build PASS
- Prohibited arbitrary-network indicator build REJECT
- Mobile clean-chart state
- Mobile has no permanent right utility rail
- Temporary Draw drawer
- First drawing shows 7-day retention notice
- Mobile Trade button shows/hides entire Sell / Risk / Buy strip

## Tested screenshots

- `tested-final-desktop.png`
- `tested-final-history-navigation.png`
- `tested-final-risk-trade.png`
- `tested-final-desktop-clean-chart.png`
- `tested-final-failover.png`
- `tested-final-security-ops.png`
- `tested-final-indicator-build-gate.png`
- `tested-final-mobile-clean-chart.png`
- `tested-final-mobile-trade-visible.png`

These screenshots demonstrate the frontend states only. They do not prove a live Firebase/cTrader/VPS connection; those remain intentionally disconnected in this baseline.
