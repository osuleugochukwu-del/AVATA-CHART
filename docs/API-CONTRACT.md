# Trade Avata Chart — Backend API Contract Draft

The frontend is written against stable seams so production services can be connected without redesigning the chart interface.

## 1. Trading / cTrader gateway

Base: `/api/ctrader`

- `GET /health` — gateway readiness: `LIVE`, `RECONNECTING`, `OFFLINE`, plus synchronized-at timestamp
- `GET /session` — authenticated broker session state
- `GET /account` — balance/equity/margin/server/latency
- `GET /positions`
- `PATCH /positions/:id` — SL/TP/trailing/break-even changes
- `POST /positions/:id/close` — full/fractional close
- `POST /positions/close-batch` — selected/symbol/profitable/losing/all IDs with idempotency key
- `GET /orders`
- `POST /orders` — Market/Limit/Stop/Stop-Limit; requires unique client order ID
- `DELETE /orders/:id`
- `GET /symbols`
- `GET /history`
- WebSocket/SSE — live price, order, position, account and health events

### Required trade safeguards
- Authenticated UID owns/controls selected broker account
- Gateway must be `LIVE` and synchronized
- Platform mode must allow trading
- Unique idempotency/client-order ID
- Per-user order rate limits
- Valid symbol/volume/price/SL/TP and sufficient broker margin
- Duplicate requests must never create duplicate orders
- Broker-side SL/TP preferred for essential protection

## 2. Private indicator service

Base: `/api/private-indicators`

- `GET /` — indicators available to authenticated UID
- `POST /validate` — owner-only sandbox validation
- `POST /:indicatorId/calculate` — protected outputs only
- `POST /` — owner/admin create/update metadata/source
- `POST /:indicatorId/permissions` — owner grants/revokes selected UID access

Private source must never be returned to ordinary clients. Runtime must deny arbitrary filesystem, secrets and unrestricted network access and enforce CPU/memory/time quotas.

## 3. Screenshot / Journal service

Base: `/api/chart-snapshots`

- `POST /` — upload compressed screenshot, private by default
- `POST /:id/share` — generate/revoke share token/link
- `POST /:id/journal` — attach snapshot to selected Trade Avata Journal entry
- `DELETE /:id` — delete unattached/temporary snapshot

Enforce upload size/rate/storage quotas.

## 4. Platform analytics

Base: `/api/platform-analytics`

- `POST /events` — batched operational events (view, replay, trade, feature use, error)
- `GET /owner/summary?date=` — owner/admin aggregate dashboard
- `GET /owner/countries?range=` — country-level aggregate only
- `GET /owner/features?range=` — most-used features/symbols/timeframes/chart types

Raw events should be short-lived. Daily aggregates can be retained longer. Exact physical location is not required.

## 5. Platform health / owner operations

Base: `/api/ops`

- `GET /health` — overall/service health, CPU/RAM/disk/WebSockets/latency
- `GET /audit` — owner/admin audit log
- `GET /rules` — effective server limits
- `POST /mode` — owner-only: Normal / Trading Disabled / Maintenance

Services should report individual health so charting can remain available even if trading/private indicators are degraded.

## 6. Firebase role

Firebase is planned for:
- UID/authentication
- roles and entitlements
- settings/workspaces/watchlists/drawings
- private-indicator permissions
- product access
- lightweight account/feature metadata

Firebase is not the raw tick warehouse.

## 7. Outage behavior

- Frontend/PWA can still load from static/PWA cache when VPS is unavailable
- Offline replay remains usable if already downloaded
- New trading is disabled whenever broker gateway is not LIVE/synchronized
- After reconnect, positions/orders/account state must be reconciled before returning to LIVE
- A future active/passive standby server may take over, but only one server may be leader for trade execution at a time

## 7. Live chart synchronization / latency contract

Every live market event should include at minimum:

- `symbol`
- `timeframe` / source stream identifier
- broker/source timestamp
- server receive timestamp
- sequence/revision identifier
- bid/ask/last fields appropriate to the instrument

The browser tracks current price age. Orders are rejected when the displayed market state is older than the configured stale-price threshold.

Historical/private-indicator responses should include a request/range/revision identifier. The browser must discard responses that no longer match the current symbol, timeframe, range or revision.

## 8. Drawing retention contract

Persisted drawing records should support:

- owner UID / workspace ID / symbol / timeframe
- drawing payload
- `createdAt`
- `updatedAt`
- `expiresAt` or a permanent-retention marker

A meaningful drawing edit refreshes `updatedAt`/`expiresAt`. Retention duration is read from owner-controlled backend policy rather than hard-coded in the client.

## 9. Failover / leader contract

Only the server holding the active trading lease may submit broker mutations. The standby must not submit orders merely because it can reach the broker. Promotion requires lease eligibility and broker-state reconciliation. Recovery of the preferred primary uses a stability window and controlled failback rather than immediate pre-emption.
