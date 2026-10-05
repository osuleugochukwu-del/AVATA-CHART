# Trade Avata Chart 0.5.2 — Compact Desktop Trade Update

This release preserves the advanced 0.4/0.5.1 visual shell and makes only the requested desktop refinements.

## Desktop trading control
- Buy / Risk% / Sell is now a very small centered strip at the top of the chart.
- Risk % remains the default sizing method and the calculated lot size is shown beneath it.
- The strip can be hidden completely from its own collapse control or the top Trade button.
- The `…` control opens the advanced trade ticket as a right-side drawer on desktop.
- Mobile keeps the previously approved Trade-button / bottom-dock behavior.

## Indicator quick controls
- Indicators still open from the Indicators dropdown for editing.
- A separate quick eye control hides/shows all indicator plots instantly without deleting them.
- Indicator labels on the chart are clickable to open that indicator's settings.
- Indicator label display can be Full, Compact, Values only, or Hidden.

## Symbol and chart settings
- Desktop symbol click opens Chart Settings.
- A dedicated search button remains beside it for market/symbol selection.
- Symbol overlay can be Full, Compact, Symbol only, or Hidden.
- Chart metadata remains a transparent overlay; it reserves no vertical space.

## Interval browser
The interval dropdown now separates:
- Time intervals (seconds through monthly + custom)
- Renko using a selected source time interval
- Renko using a pip brick size
- Range bars using a pip size

Every item can be starred. Starred items appear directly in the tiny top bar, including Renko and Range shortcuts such as `R·5s`, `R·10p`, and `RG·10p`.

## Owner AI
The Owner-only AI control is visible in the desktop toolbar for the Owner account. Existing abuse limits and execution-path isolation remain unchanged.

## Verification
- 37/37 automated tests passed.
- JavaScript syntax checks passed.
- Integrity verifier passed and resolved all 37 service-worker assets.
