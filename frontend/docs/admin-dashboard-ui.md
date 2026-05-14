# Admin dashboard UI notes

## Route

- `/admin/dashboard` (ADMIN-only via existing route-level guards).

## Live API wiring

- Data source: `GET /api/admin/dashboard` with optional `from` and `to` query params.
- Date-only values are passed through to backend normalization rules (UTC, inclusive `from`, exclusive `to`).

## Fallback behavior

- KPI cards are always rendered when aggregate payload is available.
- Chart widgets are optional:
  - if backend returns series data, charts render via PrimeNG `p-chart`;
  - if series data is absent/malformed, UI derives fallback chart datasets from KPI values and shows a non-blocking warning.
- On refresh failure after at least one successful load, the page keeps the last successful snapshot and shows a warning banner instead of blanking content.

## Manual acceptance checklist

- [ ] Admin can open `/admin/dashboard` from sidebar navigation.
- [ ] KPI values render from live backend payload (zero values still shown).
- [ ] Apply/Clear date filters trigger new API calls.
- [ ] Hard failure state displays retry action.
- [ ] Refresh failure preserves previous data snapshot.
- [ ] Layout remains readable on desktop/tablet/mobile.

Testing artifacts are intentionally manual-only for this task.
