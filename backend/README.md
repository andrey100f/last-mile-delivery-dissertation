# Delivery Hub API (backend)

Spring Boot modular monolith for the Last Mile Delivery Marketplace. Bounded contexts are Java packages (not separate Maven modules). The **PostgreSQL** schema is owned by **Flyway** (`src/main/resources/db/migration`); Hibernate `ddl-auto` is `none` so SQL migrations and JPA stay aligned.

## Prerequisites

- **JDK** version matching `pom.xml` (`java.version`; currently **25**).
- **Apache Maven** 3.9+ (this repo does not include the Maven Wrapper).
- **PostgreSQL** for local runs and tests — easiest path is **Docker** (see [Database](#database)). A locally installed PostgreSQL 15+ on `localhost:5432` is fine if you create the same database and user.

## Database

### Why it matters

The application does not start without a reachable datasource. If PostgreSQL is stopped, startup fails with a connection error. That is expected.

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

Defaults are set in `src/main/resources/application.properties`. In any environment (including production), override with standard Spring Boot properties — for example:

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

The API listens on **port 8080** (see `src/main/resources/application.properties`).

## Verify

Run the full test suite (PostgreSQL must be running; tests load the full Spring context):

```bash
mvn -q verify
```

Check actuator health (with the app running):

```bash
curl -s http://localhost:8080/actuator/health
```

Expected JSON includes `"status":"UP"`.

## Security note

Spring Security is configured with **permit-all** for development (see `identity.config.SecurityConfig`). JWT and authenticated routes are planned for a later epic; do not rely on this configuration in production.
