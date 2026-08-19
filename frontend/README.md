# Calendar Booking Frontend

Отдельный frontend-модуль для интерфейса из `../api/main.tsp`.

## Стек

- TypeScript
- Vite
- React
- Mantine UI
- Stoplight Prism для mock API по OpenAPI-контракту, который генерируется из `../api/main.tsp`

## Запуск

```bash
npm install
npm run dev:all
```

Перед сборкой и запуском mock API OpenAPI-спека генерируется напрямую из `../api/main.tsp` в `./.generated/@typespec/openapi3/openapi.yaml`. Эта папка не хранится в репозитории.

TypeSpec-зависимости лежат на уровне корня npm workspace, поэтому команды можно запускать как из `frontend`, так и из корня:

```bash
npm run frontend:build
npm run frontend:mock
```

Приложение откроется на `http://127.0.0.1:5173`, Prism mock API будет доступен на `http://127.0.0.1:4010`.

Если API запущен отдельно, задайте базовый URL:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev
```
