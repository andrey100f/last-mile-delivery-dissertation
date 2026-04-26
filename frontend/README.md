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

| URL          | What loads                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | Redirects to `/login`.                                                                                                                     |
| `/welcome`   | Lazy **standalone** component: `features/placeholder/placeholder` (`Placeholder`).                                                         |
| `/forbidden` | Lazy **standalone** page: `pages/forbidden/forbidden` (`ForbiddenPage`) — wrong-role or policy messaging; no portal data.                    |
| `/customer`  | **`authGuard` + `roleGuard`** (`CUSTOMER`). Lazy children: `features/customer/customer.routes` → `CustomerHome`.                           |
| `/courier`   | **`authGuard` + `roleGuard`** (`COURIER`). Lazy children: `features/courier/courier.routes` → `CourierHome`.                               |
| `/admin`     | **`authGuard` + `roleGuard`** (`ADMIN`). Lazy children: `features/admin/admin.routes` → `AdminHome`.                                       |
| `/login`     | **`loginGuestGuard`** (signed-in users redirect to their portal). Lazy `pages/login/login` (`LoginPage`).                                   |
| `**`         | Redirects to `/welcome`.                                                                                                                     |

### Authorization UX (#28)

- **Unauthenticated protected URL:** `authGuard` redirects to **`/login`** without a `returnUrl` query string; the attempted path is stored only under `sessionStorage` (`deliveryhub.returnUrl`) for post-login navigation. The same applies to **`roleGuard`** when the session has no role and to **401** via `AuthRedirectService`.
- **Authenticated, wrong role (policy A):** `roleGuard` navigates to **`/forbidden`** and shows a short **PrimeNG** toast (“Access denied”). The forbidden page offers **“Go to your portal”** using the role stored at login.
- **Stale role / profile:** MVP — **role or profile changes in the DB require signing in again**; there is no silent refresh of `UserService.currentUser()`.
- **Role at login:** `POST /auth/login` sends **email, password, and role** (`LoginRequestDto`). The backend resolves the user with `findByEmailAndRole`; wrong password, unknown email, or **wrong portal for that account** all return **401** with no token. Missing/blank email or password is also rejected with **401** (avoids server errors on bad JSON). After success, `AuthService` persists the token and the **selected portal role** in `sessionStorage` for route guards; the **JWT carries only `sub` and standard time claims** (no `role` claim). Client-side, `isJwtExpired` treats **unreadable payloads or missing/non-finite `exp`** like an expired token so guards redirect to `/login` instead of accepting garbage until the next API **401**.
- **Current user in the UI:** `provideUserBootstrapInitializer()` runs at app start: when a valid access token exists, `UserService.refreshCurrentUser()` loads `GET /users/{sub}` (JWT `sub` = user id) and exposes the result via `UserService.currentUser()` (signal), including **authoritative `role` from the API**. The same refresh runs after a successful login; `AuthService.logout()` clears the cached user.
- **Forbidden → portal:** “Go to your portal” / “Sign in” use `Router.navigateByUrl(..., { replaceUrl: true })` so the browser does not keep a previous URL’s query string (e.g. `returnUrl`) on the history entry.
- **`returnUrl` after login:** Paths are sanitized (internal, no open redirects), then **must be under the portal matching the signed-in role** (`/customer`, `/courier`, or `/admin`) before navigation; otherwise the app falls back to the default home for that role.

### Routes vs guards (summary)

| Path            | `authGuard` | `loginGuestGuard` | `roles` in `data` |
| --------------- | ----------- | ----------------- | ----------------- |
| `/login`        | no          | yes               | —                 |
| `/forbidden`    | no          | no                | —                 |
| `/welcome`      | no          | no                | —                 |
| `/customer/**`  | yes         | no                | `CUSTOMER`        |
| `/courier/**`   | yes         | no                | `COURIER`         |
| `/admin/**`     | yes         | no                | `ADMIN`           |

### Manual check matrix (PR / QA)

| Actor     | URL          | Expected                                                         |
| --------- | ------------ | ---------------------------------------------------------------- |
| Guest     | `/customer`  | `/login` (deep link target in `sessionStorage` only)              |
| Customer  | `/customer`  | OK                                                               |
| Customer  | `/admin`     | `/forbidden` (+ toast)                                           |
| Courier   | `/courier`   | OK                                                               |
| Courier   | `/customer`  | `/forbidden`                                                     |
| Admin     | `/admin`     | OK                                                               |
| Admin     | `/courier`   | `/forbidden`                                                     |
| Guest     | `/login`     | OK                                                               |
| Authenticated | `/login` | Redirect to the matching role portal (customer, courier, or admin root). |
| Guest → `/customer` → login as customer | — | Lands on `returnUrl` when it matches the customer portal prefix. |

## PrimeNG theme

- **Preset name:** **Aura** (PrimeNG v4+ styled preset from `@primeuix/themes`).
- **Where it is set:** `src/app/app.config.ts` — `providePrimeNG({ theme: { preset: Aura } })` with `import Aura from '@primeuix/themes/aura'`.

## API base URL

HTTP calls will target **`/api`** on the dev server and be forwarded to the backend via a **proxy** (planned in issue **#23**). Until that is merged, configure the proxy locally or use absolute backend URLs as needed.

## HTTP auth interceptor (#27)

- **Bearer token:** After a successful login, the access token is stored in `sessionStorage` under `deliveryhub.accessToken`. All `HttpClient` requests that are **not** on the skip list receive `Authorization: Bearer <token>` when a token exists.
- **Skip list (no Bearer):** paths whose URL (lowercased) contains `/auth/login`, `/auth/register`, or `/actuator/health`. Keep this list aligned with public backend routes so login traffic stays easy to debug and matches acceptance tests.
- **401 policy:** Any **401** on a non–skip-listed request triggers `AuthService.logout()` (clears client session only), then a **single** navigation to **`/login`** (`replaceUrl: true`) **without** `?returnUrl=` in the URL. The internal return path is written only to `sessionStorage` under `AUTH_RETURN_URL_SESSION_KEY` (`deliveryhub.returnUrl`); that key is **cleared** on each 401 redirect before storing a new value so stale targets cannot linger. After a **successful** login, `LoginPage` reads an optional legacy `returnUrl` query param and the session key, then **always removes** the session key so a rejected or unused deep link cannot affect a later sign-in; it navigates when the target is valid for the role, else falls back to role-based home. Route **guards** (`#28`) use the same session mirror. Token **refresh** and silent re-auth are **out of scope** here; an expired JWT is expected to surface as 401 from the API.
- **Bearer scope:** The interceptor only adds `Authorization` for URLs under the configured `environment.apiUrl` (relative paths under that prefix, or absolute URLs that match the same API origin/path when `apiUrl` is absolute). It does not attach the token to unrelated absolute URLs.

## Further reading

- [Angular CLI](https://angular.dev/tools/cli)
