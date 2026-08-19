# Calendar Backend

Kotlin + Spring Boot backend module for the TypeSpec calendar contract.

## Build

The backend build generates API sources from `../api/main.tsp`:

1. `compileTypeSpec` compiles TypeSpec into `backend/build/generated/typespec/@typespec/openapi3/openapi.yaml`.
2. `generateKotlinApi` generates Kotlin/Spring API interfaces and model sources.
3. `compileKotlin` compiles the generated sources together with the hand-written implementation.

Run:

```bash
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew bootRun
```

Gradle must run on Java 17 or newer. The application itself is configured for a Java 21 toolchain.

The TypeSpec compiler is resolved from the root `node_modules`, so run `npm install` in the repository root first when dependencies are missing.

The app uses an in-memory H2 database and exposes the H2 console at `/h2-console`.

## API

- `GET /admin/owner-profile`
- `GET /admin/event-types`
- `POST /admin/event-types`
- `GET /admin/bookings/upcoming`
- `GET /booking-types`
- `GET /booking-types/{eventTypeId}/availability`
- `POST /bookings`
