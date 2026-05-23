# Microservices Migration Report

This document describes the refactor of the Delivery Hub backend from a modular monolith into independently deployable Spring Boot microservices.

## New structure

```
backend/
  pom.xml                         # Maven parent (last-mile-delivery)
  common/                         # Shared library
  identity-service/               # :8081
  delivery-service/               # :8082
  courier-service/                # :8083
  tracking-service/               # :8084
  messaging-notification-service/ # :8085
  events-service/                 # :8086
  admin-service/                  # :8087
  docker/
    docker-compose.yml            # Postgres + RabbitMQ (infra only)
    docker-compose.microservices.yml
    Dockerfile.service
  docs/
    MICROSERVICES_MIGRATION_REPORT.md
```

All public REST APIs keep the `/api` context path. Each service exposes only its domain endpoints.

## Service responsibilities

| Service | Port | Public APIs | Owned data |
|---------|------|-------------|------------|
| **identity-service** | 8081 | `/auth/**`, `/users/**` | `users` |
| **delivery-service** | 8082 | `/deliveries/**`, `/admin/reports/**` | `deliveries`, `delivery_status_history` |
| **courier-service** | 8083 | `/couriers/me/**` | `courier_profiles`, `courier_availability_slots` |
| **tracking-service** | 8084 | WebSocket `/ws-tracking/**` | none (stateless push) |
| **messaging-notification-service** | 8085 | `/notifications/**` | `notifications`, `processed_messages` |
| **events-service** | 8086 | `/admin/events/**` | `system_events` |
| **admin-service** | 8087 | `/admin/dashboard/**`, `/admin/customers/**`, `/admin/couriers/**` | none (orchestration + read models) |

## Common module (`common/`)

Shared cross-cutting code:

- **Security:** `JwtService`, `JwtAuthenticationFilter`, `ApiAuthenticationEntryPoint`, `BaseSecurityConfig`, `DeliveryAuthorization`
- **Domain enums:** `DeliveryStatus`, `DeliveryType`, `UserRole`
- **Persistence:** `User`, `UserRepository`, `ProcessedMessage` (+ repository)
- **Messaging contracts:** `NotificationRequested`, `DeliveryCreatedMessage`, `DeliveryStatusChangedMessage`, `NotificationEventType`
- **Inter-service clients:** `EventsClient`, `CourierServiceClient`, `DeliveryAccessClient`
- **Flyway migrations:** `common/src/main/resources/db/migration` (applied by **identity-service** on startup)

## What moved where

### Removed
- Monolithic `DeliveryHubApplication` and `src/main/java/com/ubb/deliveryhub/**` single-app layout
- Empty **`matching`** package (assignment logic remains in `delivery-service` → `AsyncAssignmentService`)
- In-process Spring events for notifications/tracking

### Split by module
- `identity` → **identity-service**
- `delivery` (+ admin reports) → **delivery-service**
- `courier` → **courier-service**
- `tracking` → **tracking-service**
- `notification` + `messaging` → **messaging-notification-service**
- `events` (+ admin system-events API) → **events-service**
- `admin` (dashboard + user management) → **admin-service**

## Inter-service communication

### REST (synchronous)
| From | To | Purpose |
|------|----|---------|
| identity-service | events-service | Login failure audit (`POST /internal/events/login-failed`) |
| delivery-service | events-service | Delivery assigned / status changed events |
| delivery-service | courier-service | Courier profile check, async assign-next courier |
| tracking-service | delivery-service | WS subscription authorization (`GET /internal/deliveries/{id}/access`) |

Internal routes use `/internal/**` (permitted without JWT; secure at network layer in production).

### RabbitMQ (asynchronous)
| Producer | Consumer | Message | Exchange / routing key |
|----------|----------|---------|------------------------|
| delivery-service | messaging-notification-service | `NotificationRequested` | `notification.events` / `notification.requested` |
| delivery-service | tracking-service | `DeliveryStatusChangedMessage` | `tracking.events` / `delivery.status.changed` |
| delivery-service | delivery-service (optional) | `DeliveryCreatedMessage` | `delivery.events` / `delivery.created` |

## Database strategy

All services currently share one PostgreSQL database (`deliveryhub`) for pragmatic migration compatibility.

- **Flyway** runs only on **identity-service** (`spring.flyway.enabled=true`).
- Other services set `spring.flyway.enabled=false`.
- Some services use **read-model entity copies** under `admin.integration.*` or `courier.integration.delivery.*` for cross-domain queries (documented limitation).

**Production recommendation:** split schemas or databases per service and replace integration JPA copies with REST/query APIs.

## How to run locally

### 1. Infrastructure
```bash
cd backend
docker compose -f docker/docker-compose.yml up -d
```

### 2. Build all modules
```bash
mvn clean package
```

### 3. Start services (separate terminals)
```bash
mvn -pl identity-service spring-boot:run
mvn -pl delivery-service spring-boot:run
mvn -pl courier-service spring-boot:run
mvn -pl tracking-service spring-boot:run
mvn -pl messaging-notification-service spring-boot:run
mvn -pl events-service spring-boot:run
mvn -pl admin-service spring-boot:run
```

Start **identity-service** first (Flyway migrations).

### 4. Health checks
```bash
curl http://localhost:8081/api/actuator/health
curl http://localhost:8082/api/actuator/health
# ... ports 8083–8087
```

### Docker Compose (all services)
```bash
docker compose -f docker/docker-compose.microservices.yml up --build
```

## Frontend / API gateway note

The Angular app previously proxied all traffic to `:8080`. With microservices, route by path prefix:

| Path prefix | Service | Port |
|-------------|---------|------|
| `/api/auth`, `/api/users` | identity | 8081 |
| `/api/deliveries`, `/api/admin/reports` | delivery | 8082 |
| `/api/couriers` | courier | 8083 |
| `/api/ws-tracking` | tracking | 8084 |
| `/api/notifications` | messaging-notification | 8085 |
| `/api/admin/events` | events | 8086 |
| `/api/admin/dashboard`, `/api/admin/customers`, `/api/admin/couriers` | admin | 8087 |

Use nginx/Traefik or update `frontend/proxy.conf.json` accordingly.

## Assumptions and limitations

1. **Shared database** — not full database-per-service isolation yet.
2. **Admin/courier cross-reads** — some admin and earnings queries use integration JPA entities against shared tables instead of pure REST.
3. **Internal APIs** — `/internal/**` endpoints are open at the application security layer; protect with network policies or service mesh in production.
4. **No service discovery** — service URLs configured via `services.*` properties / env vars (Eureka/Consul placeholders ready via configuration).
5. **Notification sync fallback** — delivery-service always publishes notifications via RabbitMQ; messaging-notification-service consumes and persists.
6. **Matching module** — removed; courier selection stays in delivery async assignment + courier internal assign API.

## Tests

- `identity-service`: `IdentityServiceApplicationTests` (context load)
- Full reactor build: `mvn test`

## Migration verification checklist

- [x] Multi-module Maven reactor builds (`mvn package`)
- [x] Each service has independent `main()` application class
- [x] Matching module removed
- [x] Cross-module in-process calls replaced for events, tracking, notifications, courier assignment
- [x] Existing API paths preserved per service (with port routing)
- [x] Flyway migrations preserved in `common`
