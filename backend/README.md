# Last Mile Delivery Marketplace — Backend (Microservices)

The backend is a **Maven multi-module** project. Each bounded context runs as an independent Spring Boot service.

## Modules

| Module | Port | Description |
|--------|------|-------------|
| `common` | — | Shared security, messaging contracts, Flyway migrations |
| `identity-service` | 8081 | Auth, users, JWT issuance |
| `delivery-service` | 8082 | Deliveries lifecycle, admin reports |
| `courier-service` | 8083 | Courier profile & earnings |
| `tracking-service` | 8084 | WebSocket/STOMP live tracking |
| `messaging-notification-service` | 8085 | Notifications + RabbitMQ consumers |
| `events-service` | 8086 | System events, admin events API |
| `admin-service` | 8087 | Admin dashboard & user management |

See **[docs/MICROSERVICES_MIGRATION_REPORT.md](docs/MICROSERVICES_MIGRATION_REPORT.md)** for the full migration report.

## Prerequisites

- JDK **25** (see parent `pom.xml`)
- Maven **3.9+**
- Docker (recommended for PostgreSQL + RabbitMQ)

## Quick start

```bash
# 1. Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# 2. Build everything
mvn clean package

# 3. Start identity-service first (runs Flyway)
mvn -pl identity-service spring-boot:run

# 4. Start other services in separate terminals
mvn -pl delivery-service spring-boot:run
mvn -pl courier-service spring-boot:run
mvn -pl tracking-service spring-boot:run
mvn -pl messaging-notification-service spring-boot:run
mvn -pl events-service spring-boot:run
mvn -pl admin-service spring-boot:run
```

Default datasource: `jdbc:postgresql://localhost:5432/deliveryhub` (user/password `deliveryhub`).

RabbitMQ defaults (delivery, tracking, messaging-notification services) match `docker/docker-compose.yml`:

| Setting | Value |
|--------|--------|
| Host | `localhost:5672` |
| User / password | `deliveryhub` / `deliveryhub` |
| Virtual host | `/` |

If you see `ACCESS_REFUSED` on RabbitMQ, ensure the broker user matches the app config above. After changing `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` in Compose, recreate the broker volume:

```bash
docker compose -f docker/docker-compose.yml down
docker rm -f deliveryhub-rabbitmq 2>/dev/null
docker compose -f docker/docker-compose.yml up -d
```

Check IDE/env overrides: empty `SPRING_RABBITMQ_USERNAME` or `SPRING_RABBITMQ_PASSWORD` overrides defaults and causes login failures.

## Docker (all services)

```bash
docker compose -f docker/docker-compose.microservices.yml up --build
```

## API context

Every service uses `server.servlet.context-path=/api`. Route the frontend/gateway by path prefix to the correct port (see migration report).

Legacy monolith documentation below still describes business rules and payload shapes; only deployment topology changed.

---

## Database

PostgreSQL schema is owned by **Flyway** in `common/src/main/resources/db/migration`. Only **identity-service** applies migrations on startup.

```bash
docker compose -f docker/docker-compose.yml up -d
```

| Setting | Value |
|--------|--------|
| Host | `localhost:5432` |
| Database | `deliveryhub` |
| User / password | `deliveryhub` / `deliveryhub` |

## Security

JWT Bearer auth is enforced on protected routes. Login: `POST /api/auth/login` on **identity-service** (port 8081).

## Original feature documentation

Refer to existing docs for API contracts:

- `docs/notifications-api.md`
- `docs/admin-dashboard-api.md`
- `docs/websocket-tracking.md`
- `README.md` sections on delivery flows (still valid for payload semantics)
