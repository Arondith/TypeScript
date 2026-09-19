# PulseWatch

**PulseWatch** is a production-minded uptime monitoring API built with **TypeScript, Node.js, and Fastify**.

It periodically checks HTTP endpoints, records response history, classifies service health, and exposes a typed REST API for managing monitors and inspecting system status.

## Why I built this

This portfolio project focuses on TypeScript as an engineering language rather than only a frontend syntax layer. It demonstrates runtime validation, asynchronous I/O, background scheduling, persistence, concurrency control, API design, testing, Docker, and CI.

## Tech stack

- TypeScript
- Node.js 24
- Fastify
- Zod
- Vitest
- Docker
- GitHub Actions

## Features

- Create, update, list, and delete endpoint monitors
- Automatic scheduled health checks
- Manual check endpoint
- Configurable timeout and expected HTTP status
- Latency-based **operational / degraded / down** classification
- Per-monitor check history
- Aggregate system statistics
- Duplicate URL protection
- Concurrent-check protection
- Runtime request validation with Zod
- Strict TypeScript compiler settings
- Rate limiting
- Security headers
- Atomic file persistence
- Serialized writes to reduce race-condition risk
- Graceful shutdown
- Unit and API tests
- Docker support
- Continuous integration

## Project structure

```text
src/
  domain/       Types and health-classification rules
  http/         API routes and Zod schemas
  infra/        Persistent repository implementation
  services/     Monitoring logic and scheduler
  app.ts        Application composition
  config.ts     Environment validation
  errors.ts     Application errors
  server.ts     Runtime entry point

tests/
  app.test.ts
  status.test.ts

docs/
  ARCHITECTURE.md
```

## Run locally

### Requirements

- Node.js 24+
- npm

### Install

```bash
npm install
```

### Start in development mode

```bash
npm run dev
```

The API starts on:

```text
http://localhost:3000
```

### Validate the project

```bash
npm run typecheck
npm test
npm run build
```

## Docker

```bash
docker compose up --build
```

## API

### Health

```http
GET /health
```

### Create a monitor

```http
POST /api/monitors
Content-Type: application/json
```

```json
{
  "name": "Portfolio",
  "url": "https://example.com",
  "intervalSeconds": 60,
  "timeoutMs": 5000,
  "expectedStatus": 200,
  "degradedAfterMs": 1500
}
```

### List monitors

```http
GET /api/monitors
```

### Get a monitor

```http
GET /api/monitors/{id}
```

### Update a monitor

```http
PATCH /api/monitors/{id}
```

### Delete a monitor

```http
DELETE /api/monitors/{id}
```

### Run a check immediately

```http
POST /api/monitors/{id}/check
```

### Check history

```http
GET /api/monitors/{id}/history?limit=50
```

### Aggregate statistics

```http
GET /api/stats
```

## Example health states

| State | Meaning |
| --- | --- |
| `unknown` | Monitor has not been checked yet |
| `operational` | Expected response received within latency target |
| `degraded` | Correct response but slower than configured threshold |
| `down` | Network failure, timeout, or unexpected status code |

## Environment variables

Copy `.env.example` or configure the following values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind host |
| `DATA_FILE` | `./data/pulsewatch.json` | Persistence file |
| `SCHEDULER_TICK_MS` | `5000` | Scheduler polling interval |
| `HISTORY_LIMIT` | `100` | Stored checks per monitor |

## Portfolio skills demonstrated

This repository demonstrates practical experience with **TypeScript**, **Node.js**, **REST APIs**, **runtime validation**, **async programming**, **background workers**, **data persistence**, **concurrency control**, **testing**, **Docker**, and **CI/CD fundamentals**.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation details.
