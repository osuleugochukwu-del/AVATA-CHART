# Trade Avata Chart — Project Blueprint

## Product identity

- Product: Trade Avata Chart
- Planned domain: `chart.tradeavata.com`
- Repository strategy: separate repository from main Trade Avata site and Trade Avata Copier
- Shared ecosystem: same Trade Avata Firebase identity/roles/entitlements foundation
- Primary principle: chart-first, mobile-first, lightweight, modular, no unnecessary preloading

## Approved interface

- Slim top toolbar with symbol, favorites-driven timeframes, full interval dropdown, chart type, indicators, alerts, replay, snapshot, undo/redo, layout, settings, fullscreen
- Slim left drawing toolbar on desktop; temporary slide-up/horizontal drawing drawer on mobile
- Large central chart canvas
- Resizable/collapsible right watchlist area plus slim utility rail
- Collapsible bottom panel for Orders, Positions, Analytics, Replay, Alerts and History
- PWA/installable-app behavior
- Official Trade Avata branding/logo in the chart header
- Desktop and mobile layouts treated separately

## Version 1 functional scope

### Chart engines
- Seconds-based time bars from 1 second upward
- Minutes/hours/daily/weekly intervals
- Custom time intervals
- Heikin-Ashi using the same time engine
- Renko from configurable pip/price size
- Range bars
- Hook for custom Sequence/Renko-Time engines once exact rules are supplied

### Trading
- cTrader as first live broker/data adapter
- Broker-neutral internal adapter design
- Market, Limit, Stop and Stop-Limit order UI
- SL/TP at entry and modification
- Direct chart trade management
- Partial close
- Break-even
- Trailing stop
- Multiple take-profit levels
- Quick trade mode with directly editable lot size and one-tap return to automatic risk sizing
- Individual position Close / Modify / partial-close controls
- Multi-select position management with protected Close Selected / Symbol / Profitable / Losing / Close ALL actions
- Close ALL is intentionally hidden behind an actions menu and requires explicit confirmation
- Risk-based position sizing directly from the chart

### Risk manager
- Risk % or monetary risk
- Entry / SL / TP draggable workflow
- Automatic lot calculation
- Reward-to-risk display
- Personal maximum-risk rules
- Extensible to daily/open-risk guards

### Indicators
- Built-in lightweight indicators calculated locally
- Full indicator controls: add, show/hide, edit settings, remove, reorder, hide-all
- Editable EMA length/source/color/width/opacity and pane/visibility preferences
- Private indicator API seam for server-side protected logic
- Private indicator source never shipped to public browser code
- Selected-user sharing/permissions planned through Firebase UID entitlements
- C# indicators to be ported and numerically verified against cTrader output

### Replay and backtesting
- Quick online replay
- Play/pause/step/speed controls
- Offline downloadable replay packages
- Offline replay import
- Replay trade simulation
- Replay analytics
- High-precision replay mode planned for Renko/Range/custom structures

### Analytics
- Net P&L, win rate, trade count, profit factor, average win/loss, drawdown
- Future expansion: expectancy, average R, symbol/session/day performance, MFE/MAE, streaks, commissions, equity curve

### Workspace and customization
- Multiple saved workspaces
- Dark/light theme
- Candle and chart-color customization
- Multi-chart layout seam
- Chart synchronization seam
- Favorite tools/timeframes with star pinning from a complete interval dropdown
- Custom intervals such as 12s can be created and pinned
- Autosave/session recovery

### Mobile/PWA
- Installable PWA
- Cached application shell
- Offline replay support
- Mobile chart-first layout
- Right panel completely hidden on small screens
- Lower Orders/Positions/Analytics/Replay/Alerts panel collapses almost completely on phone, leaving only a small reopen handle; the state is remembered
- Quick chart-type access and favorite timeframes on phone
- Mobile Draw button opens drawing tools temporarily instead of leaving them permanently over the chart

## Lightweight rule

Nothing expensive should load until it is used.

- Analytics lazy-loads when opened
- Replay data is downloaded only when requested
- DOM/news/advanced tools remain optional modules
- Hidden charts should suspend unnecessary rendering
- Private indicators can calculate on the server to keep phones light
- Historical data should load in chunks

## Backend separation

Browser code must never contain broker credentials, Firebase admin secrets or private indicator source.

Planned server responsibilities:
- cTrader authentication and trading gateway
- Market-data fan-out/WebSocket service
- Historical data cache
- Server-side alerts
- Private indicator sandbox
- Secure trade execution
- VPS health/readiness state and safe reconnect/reconciliation before returning to LIVE
- Trading disabled while the backend is CONNECTING/RECONNECTING/OFFLINE

## Current alpha implementation

The repository currently includes:
- React UI shell matching the approved design direction
- Working chart rendering with generated demo data
- Heikin-Ashi, Renko and Range transformations
- Risk sizing engine
- Demo market/pending orders
- Position modify/close support with editable SL/TP
- Partial-close, custom partial-close %, break-even and trailing controls
- Multi-position selection and protected bulk-close workflow
- Connection-state guard (CONNECTING / LIVE / OFFLINE)
- Offline replay package download/import
- Analytics calculations
- PWA shell
- Responsive desktop/mobile behavior
- cTrader and private-indicator API client seams
- Snapshot PNG download plus future Copy Link / Send to Journal seams
- Favorites-driven timeframe dropdown and custom interval UI
- Full indicator management/settings UI
- Temporary mobile drawing drawer and fully hidden right utility rail on phone
- Mobile lower trade panel fully collapsible with remembered state
- Official Trade Avata SVG logo stored locally for offline/PWA branding

The live broker/Firebase/VPS pieces remain intentionally disconnected until the shared Trade Avata backend and infrastructure are ready.


## Final consolidation decisions (Alpha 0.3.0)

- Mobile blue Trade button is a true toggle: it shows/hides the Buy/Sell/Risk strip.
- The lower Positions/Orders panel remains independently collapsible, enabling a nearly clean-chart phone mode.
- Desktop Trade strip can be hidden and repositioned without removing the chart.
- Percentage-risk sizing is the default; fixed lots are optional.
- Entry / Stop Loss / Take Profit risk lines are hidden by default and appear only when the risk-line tool is enabled; they are draggable and recalculate lot size.
- Owner Operations/Health is kept outside the normal trading canvas and includes platform usage, trading-vs-chart-only users, country-level aggregates, service health, resource usage and safety mode.
- Backend protection rules include user/session/WebSocket/request quotas, duplicate-order protection, rate limits, replay/screenshot quotas, indicator sandbox limits and audit requirements.
- Trading actions are blocked unless broker state is LIVE and platform safety mode allows trading.
- The frontend remains a demo/mock trading alpha until the real Firebase/VPS/cTrader services are connected and demo-tested.

## 0.4.0 chart-navigation and synchronization additions

- Professional chart navigation is treated as core behavior: free history pan, Follow/Free state, one-click Live return, wheel zoom, draggable price/time scales, Reset and adjustable right-side breathing space.
- Candles and indicators share one synchronized bar/time coordinate system.
- Indicators calculate from full synchronized history and reserve hidden warm-up bars before the visible window so long moving averages do not detach while browsing history.
- Remote/private indicator responses must be range/revision tagged so stale results cannot overwrite a newer chart state.

## Low-latency / scalping path

- Live price path: broker/cTrader → VPS → WebSocket → chart.
- Order path: chart → VPS → broker.
- Firebase remains outside the live price/order hot path.
- Price age and network latency are measured; stale prices block new orders rather than being silently presented as current.
- Actual server region is selected after the broker infrastructure region is known.

## Lightweight retention

- Drawings default to seven days of inactivity during the early lightweight phase.
- First-drawing notice explains the policy; production warns before expiry.
- Owner can change retention centrally to 30/90/180/365 days or permanent without a frontend redesign.

## Resilience

- Target production topology: Oracle primary + Google warm standby.
- A shared single-leader lease prevents split-brain trading.
- Failover requires health detection + lease expiry + broker reconciliation before new orders are enabled.
- Failback is controlled after the primary is stable and synchronized.
