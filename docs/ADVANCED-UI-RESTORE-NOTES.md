# Trade Avata Chart 0.5.1 — Advanced UI Restore

This revision deliberately restores and preserves the visual shell from the 0.4.0 Final Frontend Baseline. It does not replace the professional desktop/mobile interface with a simplified demo layout.

## Visual rules locked
- 0.4 top toolbar height, watchlist/right utility rail, left drawing toolbar, bottom positions panel and mobile dock remain the baseline.
- The chart price canvas begins immediately under the top toolbar. Symbol/OHLC/indicator/sync labels float transparently over the chart instead of reserving a header gap.
- The Buy / Risk % / Sell strip is a compact floating control, not a large dashboard. It can be hidden with the Trade toggle.
- The Positions/Orders area remains independently collapsible.
- Mobile keeps Draw / Indicators / Trade / Replay / More and safe-area spacing above Android/iOS system navigation.

## Added without redesigning the shell
- Dark / Light / System / Custom theme architecture.
- Independent candle body, wick, border, grid, scale text, crosshair, volume and current-price colors.
- Overlay visibility toggles for symbol/timeframe, indicators, OHLC and latency.
- Owner-only AI by default with per-minute, daily and prompt-size abuse controls; Owner can later enable eligible users or turn AI off.
- AI remains outside broker execution and cannot autonomously trade or receive broker/Firebase secrets.
- Free / Pro / Owner entitlement seams and a small dismissible promotion slot, disabled by default.
- Dynamic mobile safe-area behavior.
- Existing 0.4 chart navigation, synchronized indicators, Risk %, replay, Build Gate, retention, health/security and Oracle/Google failover remain intact.

## TradingView reference used only for interaction sizing
TradingView's current documentation confirms that Buy/Sell controls can be shown as compact chart controls/floating panels and that the mobile Trade button can show/hide a floating Buy/Sell panel. Trade Avata uses its own design and keeps its compact floating strip rather than copying TradingView's interface.
