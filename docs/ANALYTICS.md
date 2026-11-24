# Space Chicken analytics

Anonymous gameplay analytics backed by Cloudflare D1. Answers "how many
people play, which levels they play, and for how long" with no personal
data: random per-visit session ids, no names, no IPs, no cookies, 120-day
retention, and debug/bot sessions excluded.

## Pieces

- `AnalyticsManager.js` — game client. Queues events and POSTs batches to
  `/api/analytics` (fetch with keepalive, `sendBeacon` on pagehide).
  Session state survives scene recreations (level transitions rebuild the
  scene) via a page-level holder. Tracking never throws into gameplay.
- `functions/api/analytics.js` — Pages Function. POST ingests batches into
  the `analytics_events` D1 table; GET returns aggregate stats only.
- `analytics.html` — dashboard (not linked from the game). Deployed to
  `https://space-chicken.ailardi.com/analytics.html`.
- `schema.sql` — includes the `analytics_events` table and indexes.

## Events

| Type             | Meaning                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `session_start`  | Page load that reached the game (`kind` = touch/desktop/unknown)         |
| `level_start`    | First input on a level (play clock starts)                               |
| `level_complete` | Crown collected (`value_ms` = level time, `amount` = deaths on level)    |
| `death`          | Death (`kind` = fall/laser/boarder/hazard, `value_ms` = ms into attempt) |
| `session_ping`   | Every 60s while the tab is open (`value_ms` = active play ms so far)     |
| `session_end`    | Tab hidden/closed (`value_ms` = final active play ms)                    |

Playtime is active-tab time since first play (backgrounded time excluded).

## Deploy

The table must exist before clients can write (writes fail silently, so the
game is unaffected, but events are lost). The schema file is idempotent:

```bash
npx wrangler whoami
npx wrangler d1 execute space-chicken-leaderboard --remote --file=schema.sql
npm run check
npm run build:cloudflare
npx wrangler pages deploy dist --project-name space-chicken --branch main
```

Then open `https://space-chicken.ailardi.com/analytics.html`.

## Useful queries

```bash
# Sessions and total playtime, last 7 days
npx wrangler d1 execute space-chicken-leaderboard --remote --command \
  "SELECT COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE day >= date('now','-7 days')"
```
