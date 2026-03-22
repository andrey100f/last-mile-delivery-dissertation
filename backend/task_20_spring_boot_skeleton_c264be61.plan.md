---
name: Task 20 Spring Boot Skeleton
overview: "A step-by-step implementation plan for GitHub issue #20 (GH-01): create a runnable Spring Boot 3 modular-monolith skeleton with six bounded-context packages, health visibility, committed build wrapper, and README—aligned with [DEEP_DELIVERY_PLAN.md](DEEP_DELIVERY_PLAN.md) E1 and [issue-bodies/020.md](last-mile-delivery-dissertation/scripts/issue-bodies/020.md). No database wiring yet (that is task #21)."
todos:
  - id: decide-tooling
    content: Lock Maven vs Gradle, Java 17/21, base package (e.g. com.deliveryhub), backend folder path
    status: pending
  - id: initializr-generate
    content: "Generate Spring Boot 3 project with Web, Security, Validation, Actuator; omit JPA until task #21 unless using H2 test profile"
    status: pending
  - id: package-layout
    content: Create identity/delivery/matching/tracking/notification/admin each with config,domain,repository,service,web; single @SpringBootApplication
    status: pending
  - id: security-stub
    content: "Configure SecurityFilterChain: permit actuator (and optional /api/v1/ping); document TODO for E2 JWT lockdown"
    status: pending
  - id: actuator-config
    content: "application.yml: port 8080, expose health/info; verify curl actuator/health"
    status: pending
  - id: tests-readme
    content: MockMvc health test (+ ping if added); README prerequisites, run, verify, package tree; .gitattributes optional
    status: pending
  - id: github-handoff
    content: "Comment on issue #20 with coordinates; prepare branch for task #21 (Postgres + Flyway + JPA)"
    status: pending
isProject: false
---

# Detailed plan: Task #20 — Spring Boot modular monolith skeleton

## Scope and out-of-scope

**In scope**

- New backend project under your dissertation repo (recommended: `[last-mile-delivery-dissertation/backend/](last-mile-delivery-dissertation/)` or repo root `backend/`—pick one location and keep it for tasks #21+).
- Spring Boot **3.x**, Java **17 or 21** (LTS only).
- Package layout for: `identity`, `delivery`, `matching`, `tracking`, `notification`, `admin` — each with placeholder layers: `config`, `domain`, `repository`, `service`, `web` (empty or minimal classes only).
- Application runs locally; **Actuator** `health` (and optionally `info`) exposed.
- **Spring Security** present but **permit-all** for API + actuator for this task (JWT comes in Epic E2 / later issues).
- **Validation** on classpath (for later DTOs).
- **Build wrapper** committed (`mvnw` + `.mvn` or `gradlew` + wrapper jars).
- README: prerequisites, run commands, package tree.

**Explicitly out of scope (later tasks)**

- PostgreSQL, JPA entities, Flyway/Liquibase (**task #21**).
- `POST /api/v1/auth/login`, JWT filter (**Epic E2**).
- Business controllers beyond a single **ping/health** smoke endpoint if you want it under `delivery` or a root `api` package (optional).
- Docker, Compose (**task #66**), CI (**task #24**)—optional to touch in same PR, but not required to close #20.

**Repository fact:** `[last-mile-delivery-dissertation](last-mile-delivery-dissertation)` currently has **no** `.java` / Gradle / Maven backend files—this task is **greenfield**.

---

## Decisions to lock before coding (5 minutes)


| Decision                        | Recommendation                                 | Rationale                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build tool                      | **Maven** + `mvnw`                             | Simplest for most Spring Boot tutorials; matches many university setups. Gradle is fine if you prefer—pick one and document it.                                                                     |
| Java version                    | **21** (or **17**)                             | Align with Spring Boot 3.2+; state exact version in README.                                                                                                                                         |
| Base package                    | `com.deliveryhub` (or `ro.andrei.deliveryhub`) | Issue #20 suggests `com.deliveryhub.`*; use your real domain (`com.yourname.deliveryhub`) and **comment on GitHub issue #20** with the final choice (per deliverables).                             |
| API base path                   | Reserve `**/api/v1`** for future controllers   | For this task, either no business controllers or one `GET /api/v1/health` alias **in addition to** Actuator—avoid duplicating semantics; prefer **Actuator only** for “health” to keep #20 minimal. |
| Single `@SpringBootApplication` | **One** main class only                        | Typically `com.deliveryhub.DeliveryHubApplication` at root of `com.deliveryhub`; **do not** add six `Application` classes.                                                                          |


---

## Target package tree (create literally)

Use this structure under `src/main/java/<base>/`:

```text
com.deliveryhub
├── DeliveryHubApplication.java
├── identity
│   ├── config
│   ├── domain
│   ├── repository
│   ├── service
│   └── web
├── delivery
│   ├── config
│   ├── domain
│   ├── repository
│   ├── service
│   └── web
├── matching
│   └── (same five subpackages)
├── tracking
├── notification
└── admin
```

**Optional quality boost (not mandatory for #20):** add `package-info.java` in each top-level context package with one-line JavaDoc (“Identity & access bounded context”).

**Optional ArchUnit (later or if time):** test that `identity` does not depend on `delivery` etc.—skip if it slows you down; issue marks ArchUnit as optional.

---

## Step-by-step implementation

### Phase A — Generate project (30–45 min)

1. Open [Spring Initializr](https://start.spring.io/) with:
  - **Project:** Maven, **Language:** Java, **Spring Boot:** 3.2+ stable.
  - **Dependencies:** Spring Web, Spring Security, Validation, Spring Boot Actuator.
  - **Do not** add Spring Data JPA **yet** if you want a clean split with #21; adding JPA now without DB config can force extra `application.yml` excludes. **Recommended:** add JPA in **task #21** when Postgres is wired.
2. Download, unzip into `backend/` (or chosen folder).
3. Adjust `groupId` / `artifactId` / `name` in `pom.xml` to match dissertation naming (e.g. `com.deliveryhub`, artifact `delivery-hub-api`).

### Phase B — Restructure packages (45–60 min)

1. Move the default `com.example.demo` application class to `com.deliveryhub.DeliveryHubApplication`.
2. Delete empty default package folders.
3. Under each context (`identity`, `delivery`, …), create the five subpackages (`config`, `domain`, `repository`, `service`, `web`).
4. Add **no circular references**: do not make `identity.web` import `delivery.service` in this task.

### Phase C — Security stub (30 min)

**Goal:** App starts; browser/curl can hit health; no JWT yet.

1. Add a `SecurityFilterChain` `@Bean` (Spring Security 6 style) that:
  - **Permits** `GET /actuator/health` (and `/actuator/info` if enabled).
  - **Permits** all other requests **for task #20 only** *or* use `authorizeHttpRequests(auth -> auth.anyRequest().permitAll())` with a clear `TODO(E2): lock down to JWT` in code comment.
2. **Disable CSRF** for stateless API preparation (document that browser forms are not used for API in MVP).
3. Do **not** implement login endpoints in this task.

*Risk:* Wide-open API is acceptable only until E2; document in README: “Security is open for foundation; authenticate in Epic 2.”

### Phase D — Actuator and configuration (20 min)

1. `application.yml` (or `.properties`):
  - `server.port`: e.g. `8080` (must match future Angular proxy in task #23).
  - `management.endpoints.web.exposure.include: health,info` (minimal).
  - Optional: `management.endpoint.health.show-details: when_authorized` later; for #20 `never` or default is fine.
2. Verify: `curl -s http://localhost:8080/actuator/health` returns `{"status":"UP"}`.

### Phase E — Optional smoke REST (15 min)

If you want a **non-Actuator** proof of “Web MVC works”:

- Add `delivery.web.PingController` with `GET /api/v1/ping` returning `{"ok":true}` **only if** you also add a security rule permitting it—or rely on `permitAll()` for #20.
- **Do not** introduce real domain logic here.

### Phase F — Tests (30 min)

1. Keep the generated context-load test; update package/import for new main class.
2. Add `@SpringBootTest` + `MockMvc` test that:
  - `GET /actuator/health` → 200 and JSON contains `"UP"`.
3. If you added `/api/v1/ping`, assert 200 + body.

### Phase G — Documentation and repo hygiene (30 min)

1. **README** (in `backend/README.md` or monorepo root section “Backend”):
  - JDK version, how to run `./mvnw spring-boot:run` (Windows: `mvnw.cmd`).
  - How to run tests `./mvnw -q verify`.
  - ASCII tree or bullet list of `com.deliveryhub.`* packages.
  - Link to [DEEP_DELIVERY_PLAN.md](DEEP_DELIVERY_PLAN.md) E1 row.
2. `**.gitattributes`:** `* text=auto eol=lf` for `*.java`, `*.yml`, `*.xml` to reduce Windows/Linux drift (per issue #20 notes).
3. **GitHub issue #20:** comment with final `groupId` / base package and Maven coordinates.

### Phase H — Handoff to task #21

- After #20 merges: add **Spring Data JPA**, **PostgreSQL driver**, **Flyway or Liquibase**, `application-dev.yml` with datasource—without changing the six top-level packages (entities live under each context’s `domain` / `repository`).

---

## Acceptance criteria mapping (from issue #20)


| Criterion                                     | How you verify                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `./mvnw -q verify` (or Gradle) on clean clone | Fresh clone / `git clean -fdx` on backend, run command; CI can wait for #24. |
| Package layout matches naming                 | Code review tree = table above; optional `package-info.java`.                |
| README: run API locally                       | Another person follows README only and gets health UP.                       |


---

## Risks, edge cases, mitigations


| Risk                               | Mitigation                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Spring Security blocks Actuator    | Explicit `requestMatchers("/actuator/**").permitAll()` or global permit for #20.      |
| JPA + no DB fails startup          | Omit JPA until #21 **or** add H2 test-only profile—prefer omit for clarity.           |
| Wrong port vs future Angular proxy | Standardize **8080** in README now.                                                   |
| Duplicate main classes             | Grep `@SpringBootApplication` → exactly one.                                          |
| Over-engineering modules           | **Packages only**, not Maven multi-module, unless you already know multi-module well. |


---

## Suggested timebox


| Phase     | Time                                     |
| --------- | ---------------------------------------- |
| A–D       | ~2–2.5 h                                 |
| E–G       | ~1–1.5 h                                 |
| **Total** | **~3–4 h** for a careful first-time pass |


---

## Deliverables checklist (copy to PR / issue #20)

- Runnable Spring Boot app under agreed folder
- Six contexts × five subpackages (placeholders OK)
- Actuator health UP
- Security stub documented as temporary
- `mvnw` committed; `mvn -q verify` green
- README backend section + package tree
- GitHub comment on #20 with final base package name

