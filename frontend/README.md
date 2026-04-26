# Deliveryhub

Angular frontend for the Last Mile Delivery Marketplace (Angular CLI 21).

## Commands

```bash
npm install
ng serve
ng build
```

- **`ng serve`** — dev server at `http://localhost:4200/` (live reload).
- **`ng build`** — production output under `dist/`.

Other scripts: `npm start` (alias for `ng serve`), `npm run test`, `npm run lint`, `npm run format`.

## Folder layout

Structure aligned with the project skeleton (see section 6 of the dissertation for the full rationale):

```text
frontend/
├── angular.json
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.ico
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css
    └── app/
        ├── app.config.ts
        ├── app.routes.ts
        ├── app.ts
        ├── app.html
        ├── app.css
        ├── core/
        │   └── README.md
        ├── shared/
        │   └── README.md
        └── features/
            ├── placeholder/
            │   ├── placeholder.ts
            │   ├── placeholder.html
            │   └── placeholder.css
            ├── customer/
            │   ├── customer.routes.ts
            │   └── pages/
            │       └── customer-home/
            ├── courier/
            │   ├── courier.routes.ts
            │   └── pages/
            │       └── courier-home/
            └── admin/
                ├── admin.routes.ts
                └── pages/
                    └── admin-home/
```

## Lazy route map

| URL         | What loads                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Redirects to `/welcome`.                                                                                                                 |
| `/welcome`  | Lazy **standalone** component: `features/placeholder/placeholder` (`Placeholder`).                                                       |
| `/customer` | Lazy **route children**: `features/customer/customer.routes` → default child loads `pages/customer-home/customer-home` (`CustomerHome`). |
| `/courier`  | Lazy **route children**: `features/courier/courier.routes` → default child loads `pages/courier-home/courier-home` (`CourierHome`).      |
| `/admin`    | Lazy **route children**: `features/admin/admin.routes` → default child loads `pages/admin-home/admin-home` (`AdminHome`).                |
| `**`        | Redirects to `/welcome`.                                                                                                                 |

## PrimeNG theme

- **Preset name:** **Aura** (PrimeNG v4+ styled preset from `@primeuix/themes`).
- **Where it is set:** `src/app/app.config.ts` — `providePrimeNG({ theme: { preset: Aura } })` with `import Aura from '@primeuix/themes/aura'`.

## API base URL

HTTP calls will target **`/api`** on the dev server and be forwarded to the backend via a **proxy** (planned in issue **#23**). Until that is merged, configure the proxy locally or use absolute backend URLs as needed.

## HTTP auth interceptor (#27)

- **Bearer token:** After a successful login, the access token is stored in `sessionStorage` under `deliveryhub.accessToken`. All `HttpClient` requests that are **not** on the skip list receive `Authorization: Bearer <token>` when a token exists.
- **Skip list (no Bearer):** paths whose URL (lowercased) contains `/auth/login`, `/auth/register`, or `/actuator/health`. Keep this list aligned with public backend routes so login traffic stays easy to debug and matches acceptance tests.
- **401 policy:** Any **401** on a non–skip-listed request triggers `AuthService.logout()` (clears client session only), then a **single** navigation to `/login` (`replaceUrl: true`) with optional `returnUrl` query param. The same internal path is mirrored in `sessionStorage` under `AUTH_RETURN_URL_SESSION_KEY` (`deliveryhub.returnUrl`); that key is **cleared** on each 401 redirect before storing a new value so stale targets cannot linger. After a **successful** login, `LoginPage` reads `returnUrl` from the query string first, then from that session key, sanitizes it, removes the key, and navigates with `navigateByUrl` when valid; otherwise it falls back to role-based home routes. Route **guards** (`#28`) remain separate from this HTTP-layer behavior. Token **refresh** and silent re-auth are **out of scope** here; an expired JWT is expected to surface as 401 from the API.
- **Bearer scope:** The interceptor only adds `Authorization` for URLs under the configured `environment.apiUrl` (relative paths under that prefix, or absolute URLs that match the same API origin/path when `apiUrl` is absolute). It does not attach the token to unrelated absolute URLs.

## Further reading

- [Angular CLI](https://angular.dev/tools/cli)
