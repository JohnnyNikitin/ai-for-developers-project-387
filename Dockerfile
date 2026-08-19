FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY api ./api
COPY frontend ./frontend
RUN set -eux; \
    arch="$(uname -m)"; \
    case "$arch" in \
      x86_64) rollup_pkg="@rollup/rollup-linux-x64-gnu" ;; \
      aarch64|arm64) rollup_pkg="@rollup/rollup-linux-arm64-gnu" ;; \
      *) echo "Unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    npm install --prefix frontend --no-save --package-lock=false "$rollup_pkg@4.62.3"
RUN VITE_API_BASE_URL= npm run frontend:build

FROM gradle:8.14-jdk21 AS backend-build

WORKDIR /app

COPY --from=frontend-build /usr/local/bin/node /usr/local/bin/node
COPY --from=frontend-build /app/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./backend/src/main/resources/static
COPY settings.gradle.kts build.gradle.kts package.json package-lock.json ./
COPY api ./api
COPY backend ./backend

RUN ./backend/gradlew -p backend bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=backend-build /app/backend/build/libs/*.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
