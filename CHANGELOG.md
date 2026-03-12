## 2026-03-11

- **Data correctness**: Fix `clientStats.byPlatform` and `byKeyword` swallowing `undefined` keys; fix division-by-zero in `platformChartData`/`sentimentChartData`; `sentimentChartData` percentage now based on analyzed total (positive+neutral+negative); `mentionCountMetrics.total` uses normalized timeline sum (matches chart); `mentionCountMetrics` and `sentimentPercentChange` now compare first-half vs second-half of selected duration window instead of hardcoded last-7/prior-7 from wall clock; `uniqueUsersMetrics` % change uses the selected duration mid-point.

## 2026-02-26

- **Sentiment Timeline**: Keep clean look while showing Total Mentions — remove MA overlays and ratio axis; render Total as a solid blue line (linear, 2px, no dots) over stacked sentiment areas; harden timeline data normalization so `total` is always numeric.
- **Filters & Duration**: Fix duration deep links accepting numeric `duration` values; duration dropdown no longer blanks for numeric values; fix timezone/day-boundary issues using local `YYYY-MM-DD` formatting/parsing; send precise ISO start/end bounds to backend summary so server/client results match.

## 2026-02-17

- Add manual Facebook pages configuration to `ChannelConfigClient.jsx`, integrating `POST /fb/add-pages` and `GET /fb/listpages` with an Insert form, stored pages list, and shared error banner component.
