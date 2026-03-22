# Delivery Hub API (backend)

Spring Boot modular monolith skeleton for the Last Mile Delivery Marketplace. Bounded contexts are represented as Java packages (not separate Maven modules). Database and JPA are planned for a follow-up task.

## Prerequisites

- **JDK** version matching `pom.xml` (`java.version`; currently **25**).
- **Apache Maven** 3.9+ (this repo does not include the Maven Wrapper).

## Run locally

From this directory:

```bash
mvn spring-boot:run
```

The API listens on **port 8080** (see `src/main/resources/application.properties`).

## Verify

Run the full test suite:

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