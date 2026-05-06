# Delivery Hub API (backend)

Spring Boot modular monolith for the Last Mile Delivery Marketplace. Bounded contexts are Java packages (not separate Maven modules). The **PostgreSQL** schema is owned by **Flyway** (`src/main/resources/db/migration`); Hibernate `ddl-auto` is `none` so SQL migrations and JPA stay aligned.

**Local machine runs** use the **`local`** profile by default (`spring.profiles.default=local` in `application.properties`). JDBC settings live in `application-local.properties` so the main file stays free of hardcoded credentials.

## Prerequisites

- **JDK** version matching `pom.xml` (`java.version`; currently **25**).
- **Apache Maven** 3.9+ (this repo does not include the Maven Wrapper).
- **PostgreSQL** when running the app on your machine — easiest path is **Docker** (see [Database](#database)). A locally installed PostgreSQL 15+ on `localhost:5432` is fine if you create the same database and user.

## Database

### Why it matters

The application does not start without a reachable datasource when the **`local`** profile is active (the default for `spring-boot:run`). If PostgreSQL is stopped, startup fails with a connection error. That is expected.

### Option 1: Docker (recommended)

From this directory (`backend/`):

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts PostgreSQL **18** with:

| Setting | Value |
|--------|--------|
| Host (from your machine) | `localhost` |
| Port | `5432` |
| Database | `deliveryhub` |
| User / password | `deliveryhub` / `deliveryhub` |

To stop and remove the container (data kept in the named volume):

```bash
docker compose -f docker/docker-compose.yml down
```

### Option 2: Local PostgreSQL

Create a database and role matching the defaults above, or override the datasource with environment variables (next section).

### Datasource environment variables

Defaults for the **`local`** profile are in `src/main/resources/application-local.properties`. Override with standard Spring Boot properties — for example:

| Variable | Example |
|----------|---------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/deliveryhub` |
| `SPRING_DATASOURCE_USERNAME` | `deliveryhub` |
| `SPRING_DATASOURCE_PASSWORD` | `deliveryhub` |

Do not commit real production credentials; use secrets or your host’s environment configuration.

### Resetting development data

**Docker (removes container and volume — all DB data is lost):**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d
```

**Same database, SQL only (destructive):** connect with `psql` or a GUI and run:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then restart the application so Flyway reapplies migrations from scratch.

### Confirming Flyway

After a successful startup against an empty database, Flyway creates `flyway_schema_history` and applies versioned scripts. To verify:

```sql
SELECT * FROM flyway_schema_history ORDER BY installed_rank;
```

You should see applied migrations (for example version `1` for `V1__init.sql`).

## Run locally

1. Start PostgreSQL (see [Database](#database)).
2. From this directory:

```bash
mvn spring-boot:run
```

The **`local`** profile is active by default, so no extra `-Dspring-boot.run.profiles=local` is required unless you changed `spring.profiles.default`.

The API listens on **port 8080** (see `src/main/resources/application.properties`).

## Build

Compile and package the application:

```bash
mvn -q package
```

## Verify

With the app running, check actuator health:

```bash
curl -s http://localhost:8080/actuator/health
```

Expected JSON includes `"status":"UP"`.

## Security note

JWT Bearer authentication is enforced for routes outside `/auth/**` and `/actuator/health`. Tokens are issued at login (`POST /api/auth/login`) and carry `sub` (user id) plus a `role` claim so `@PreAuthorize` can distinguish roles.

## Delivery create payload (POST `/api/deliveries`)

The create endpoint accepts the simplified frontend request shape:

- `pickup`: `line1`, `contactName`, `contactPhone`
- `destination`: `line1`, `contactName`, `contactPhone`
- `package`: `weightKg`, `description`
- `deliveryType`, `specialInstructions`
- `pricing`: `baseAmount`, `feeAmount`, `taxAmount`, `totalAmount`, `currency`

Pricing ownership is client-side for this flow: backend validates the pricing snapshot and persists it directly to `deliveries` (`base_amount`, `fee_amount`, `tax_amount`, `total_amount`, `currency`) without server-side recalculation.

## Delivery list payload (GET `/api/deliveries`)

List rows include route-friendly address fields in camelCase:

- `destinationLine1` (main route text)
- `pickupLine1` (route hint, e.g. "from ...")

**Idempotency:** duplicate POSTs create separate deliveries (GitHub #31).
